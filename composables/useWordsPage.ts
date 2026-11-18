import { computed, nextTick, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import type { LessonTextPayload, WordEntry, WordsBookMeta } from '~/types/words'
import { useWordsAudio } from '~/composables/useWordsAudio'
import { runAfterRestoreScroll, useWordsRailScroll } from '~/composables/useWordsRailScroll'
import { useWordsLessonRender } from '~/composables/useWordsLessonRender'

function lsGet() {
  try { return window.localStorage } catch { return null }
}

function clampInt(n: unknown, min: number, max: number, fallback: number) {
  let v = parseInt(String(n), 10)
  if (Number.isNaN(v)) v = fallback
  return Math.max(min, Math.min(max, v))
}

function clampGap(n: unknown, min: number, max: number, fallback: number) {
  let v = parseFloat(String(n))
  if (!Number.isFinite(v)) v = fallback
  v = Math.round(v * 2) / 2
  return Math.max(min, Math.min(max, v))
}

export function formatGap(n: number) {
  const v = clampGap(n, 0, 5, 2)
  return (Math.round(v * 2) / 2).toFixed(1).replace(/\.0$/, '')
}

function mkey(r: WordEntry) {
  return `nceM_${r.b}_${r.l}_${r.w}`
}

function groupByLesson(list: WordEntry[]) {
  const map = new Map<number, WordEntry[]>()
  const order: number[] = []
  for (const r of list) {
    if (!map.has(r.l)) {
      map.set(r.l, [])
      order.push(r.l)
    }
    map.get(r.l)!.push(r)
  }
  order.sort((a, b) => a - b)
  return { map, order }
}

function loadBkFromLs() {
  const ls = lsGet()
  if (!ls) return 1
  try {
    const sb = parseInt(ls.getItem('nce4book') || '1', 10)
    return (sb >= 1 && sb <= 4) ? sb : 1
  }
  catch {
    return 1
  }
}

function loadLessonMap(): Record<string, string> {
  const ls = lsGet()
  if (!ls) return {}
  try {
    return JSON.parse(ls.getItem('nce4lessons') || '{}') || {}
  }
  catch {
    return {}
  }
}

function loadSaved(): string[] {
  const ls = lsGet()
  if (!ls) return []
  try {
    return JSON.parse(ls.getItem('nceMaster4') || '[]') || []
  }
  catch {
    return []
  }
}

export function useWordsPage() {
  const bk = ref(loadBkFromLs())
  const lessonMap = ref<Record<string, string>>(loadLessonMap())
  const saved = ref<string[]>(loadSaved())
  const cur = ref('all')
  const q = ref('')
  const qDebounced = ref('')
  const quiz = ref(false)
  const onlyMaster = ref(false)
  const autoPlay = ref(false)
  const vType = ref(2)
  const chainGap = ref(2)
  const chainRepeat = ref(1)
  const playingWord = ref<string | null>(null)
  const prefsOpen = ref(false)
  const revealQuiz = ref<Set<string>>(new Set())
  const lessonTextCache = shallowRef<Record<string, LessonTextPayload>>({})
  const lessonTextOpen = ref(false)
  const lessonTextReveal = ref(false)
  const lessonTextLoading = ref(false)
  const lessonTextError = ref('')
  const lessonTextTitle = ref('课文')
  const lessonTextSub = ref('')
  const lessonTextHtml = ref('')
  const randOpen = ref(false)
  const randReveal = ref(false)
  const randItems = ref<WordEntry[]>([])
  const randRevealSet = ref<Set<string>>(new Set())
  const bookRestoring = ref(false)
  /** 换册恢复完成前禁止连点，减轻移动端 WebKit 反复崩溃 */
  const bookSwitchLock = ref(false)

  let qTimer: ReturnType<typeof setTimeout> | null = null
  let lessonTextReq = 0
  let restoreToken = 0
  let restoreScheduleTimer: ReturnType<typeof setTimeout> | null = null
  let switchLockFailsafe: ReturnType<typeof setTimeout> | null = null

  const buildId = useAppBuildId()
  const { data: meta } = useFetch<WordsBookMeta>(
    () => `/api/words/meta?v=${buildId.value}`,
    { key: () => `words-meta-${buildId.value}` },
  )
  const { data: bookWords, pending: bookPending, error: bookError } = useFetch<WordEntry[]>(
    () => `/api/words/${bk.value}?v=${buildId.value}`,
    { watch: [bk, buildId], key: () => `words-book-${bk.value}-${buildId.value}` },
  )

  const audio = useWordsAudio(vType, autoPlay, chainGap, chainRepeat, playingWord)

  function saveLessonPref() {
    const ls = lsGet()
    const key = String(bk.value)
    const val = String(cur.value)
    if (lessonMap.value[key] === val) return
    lessonMap.value = { ...lessonMap.value, [key]: val }
    if (ls) {
      try { ls.setItem('nce4lessons', JSON.stringify(lessonMap.value)) } catch { /* ignore */ }
    }
  }

  const rail = useWordsRailScroll({ cur, saveLessonPref })

  function bumpRestoreGeneration() {
    restoreToken++
  }

  function finishBookRestore(token: number) {
    runAfterRestoreScroll(token, restoreToken, () => {
      syncHeaderPad()
      const lesson = cur.value
      rail.scrollToLessonWhenStable(lesson, () => {
        if (token !== restoreToken) return
        runAfterRestoreScroll(token, restoreToken, () => {
          if (token !== restoreToken) return
          syncHeaderPad()
          rail.scrollToLesson(lesson)
          bookRestoring.value = false
          bookSwitchLock.value = false
          clearSwitchLockFailsafe()
          rail.lockRailBriefly(undefined, { syncOnUnlock: false })
          rail.finishRestoreBoot(lesson)
        })
      })
    })
  }

  function scheduleBookRestore() {
    if (restoreScheduleTimer) clearTimeout(restoreScheduleTimer)
    restoreScheduleTimer = setTimeout(() => {
      restoreScheduleTimer = null
      if (bookPending.value) return
      const token = restoreToken
      rail.setRailBooting(true)
      finishBookRestore(token)
    }, 0)
  }

  function loadPrefs() {
    const ls = lsGet()
    if (!ls) return
    try {
      chainGap.value = clampGap(ls.getItem('nceChainGap'), 0, 5, 2)
      chainRepeat.value = clampInt(ls.getItem('nceChainRepeat'), 1, 5, 1)
      vType.value = clampInt(ls.getItem('nceVoice'), 1, 2, 2)
      onlyMaster.value = ls.getItem('nceOnlyMaster') === '1'
    }
    catch { /* ignore */ }
  }

  function saveChainPrefs() {
    const ls = lsGet()
    if (!ls) return
    try {
      ls.setItem('nceChainGap', String(chainGap.value))
      ls.setItem('nceChainRepeat', String(chainRepeat.value))
    }
    catch { /* ignore */ }
  }

  watch(q, (v) => {
    if (qTimer) clearTimeout(qTimer)
    qTimer = setTimeout(() => { qDebounced.value = v.trim() }, 300)
  })

  watch([qDebounced, onlyMaster], () => {
    nextTick(() => rail.syncRailFromScroll())
  })

  const activeBookWords = computed(() => {
    if (bookPending.value) return []
    return bookWords.value ?? []
  })

  const filteredList = computed(() => {
    const all = activeBookWords.value
    let list = all
    const Q = qDebounced.value
    if (Q) {
      const ql = Q.toLowerCase()
      list = list.filter(r => `${r.w} ${r.m} ${r.p}`.toLowerCase().includes(ql))
    }
    if (onlyMaster.value)
      list = list.filter(r => saved.value.includes(mkey(r)))
    return list
  })

  const lessonGroups = computed(() => groupByLesson(filteredList.value))
  const matchCount = computed(() => (qDebounced.value ? filteredList.value.length : 0))

  const lessonRender = useWordsLessonRender(
    computed(() => lessonGroups.value.order),
    bookRestoring,
    cur,
  )

  const lessonOrderKey = computed(() => lessonGroups.value.order.join(','))
  /** 词条已展示过后保持侧栏，避免无关重算触发分批渲染导致目录闪没 */
  const wordsUiReady = ref(false)

  watch(lessonOrderKey, () => {
    wordsUiReady.value = false
  })

  function tryScheduleBookRestore() {
    if (bookPending.value) return
    if (!lessonRender.renderComplete.value) return
    scheduleBookRestore()
  }

  watch(
    () => [bk.value, bookPending.value] as const,
    ([, pending]) => {
      if (pending) {
        bookRestoring.value = true
        rail.setRailBooting(true)
        return
      }
      tryScheduleBookRestore()
    },
  )

  watch(
    lessonRender.renderComplete,
    (ready) => {
      if (!ready) return
      wordsUiReady.value = true
      tryScheduleBookRestore()
    },
    { flush: 'post' },
  )

  function clearSwitchLockFailsafe() {
    if (switchLockFailsafe) {
      clearTimeout(switchLockFailsafe)
      switchLockFailsafe = null
    }
  }

  function armSwitchLockFailsafe() {
    clearSwitchLockFailsafe()
    switchLockFailsafe = setTimeout(() => {
      switchLockFailsafe = null
      if (!bookSwitchLock.value) return
      bookRestoring.value = false
      bookSwitchLock.value = false
      rail.finishRailBoot()
    }, 12000)
  }

  const statLessons = computed(() => meta.value?.[String(bk.value)]?.[0] ?? 0)
  const statWords = computed(() => meta.value?.[String(bk.value)]?.[1] ?? 0)

  const prefsSummary = computed(() => {
    const parts = [vType.value === 1 ? '英' : '美']
    if (quiz.value) parts.push('测')
    if (onlyMaster.value) parts.push('忘')
    parts.push(autoPlay.value ? '开' : '关')
    parts.push(`${formatGap(chainGap.value)}秒`)
    parts.push(`${chainRepeat.value}次`)
    return parts.join(' ')
  })

  const lessonHeadByNo = computed(() => {
    const map = new Map<number, { g: string, t: string }>()
    for (const r of activeBookWords.value) {
      if (!map.has(r.l)) map.set(r.l, { g: r.g, t: r.t })
    }
    return map
  })

  const railChips = computed(() => {
    const seen = new Set<number>()
    const chips: { l: number, g: string, t: string }[] = []
    if (qDebounced.value || onlyMaster.value) {
      for (const r of filteredList.value) {
        if (seen.has(r.l)) continue
        seen.add(r.l)
        chips.push({ l: r.l, g: r.g, t: r.t })
      }
    }
    else {
      const keys = [...lessonHeadByNo.value.keys()].sort((a, b) => a - b)
      for (const l of keys) {
        const head = lessonHeadByNo.value.get(l)
        if (head) chips.push({ l, g: head.g, t: head.t })
      }
    }
    return chips
  })

  const gapStepDisabled = (dir: number) => {
    const min = 0
    const max = 5
    const v = chainGap.value
    return (dir < 0 && v <= min) || (dir > 0 && v >= max)
  }

  const repeatStepDisabled = (dir: number) => {
    const v = chainRepeat.value
    return (dir < 0 && v <= 1) || (dir > 0 && v >= 5)
  }

  function switchBook(n: number) {
    if (n === bk.value) return
    if (bookSwitchLock.value) return
    bookSwitchLock.value = true
    armSwitchLockFailsafe()
    bumpRestoreGeneration()
    lessonRender.bumpRenderGeneration()
    wordsUiReady.value = false
    if (restoreScheduleTimer) {
      clearTimeout(restoreScheduleTimer)
      restoreScheduleTimer = null
    }
    bookRestoring.value = true
    rail.setRailBooting(true)
    playingWord.value = null
    closeLessonText()
    closeRand()
    audio.stopChain()
    prefsOpen.value = false
    bk.value = n
    const ls = lsGet()
    if (ls) try { ls.setItem('nce4book', String(n)) } catch { /* ignore */ }
    autoPlay.value = false
    q.value = ''
    qDebounced.value = ''
    quiz.value = false
    revealQuiz.value = new Set()
    const savedLesson = lessonMap.value[String(n)]
    cur.value = (savedLesson === 'all' || savedLesson) ? String(savedLesson) : 'all'
  }

  watch(bookError, (err) => {
    if (!err) return
    bookRestoring.value = false
    bookSwitchLock.value = false
    clearSwitchLockFailsafe()
    rail.finishRailBoot()
  })

  function toggleMaster(entry: WordEntry) {
    const k = mkey(entry)
    const i = saved.value.indexOf(k)
    if (i >= 0) saved.value = saved.value.filter(x => x !== k)
    else saved.value = [...saved.value, k]
    const ls = lsGet()
    if (ls) try { ls.setItem('nceMaster4', JSON.stringify(saved.value)) } catch { /* ignore */ }
  }

  function isMastered(entry: WordEntry) {
    return saved.value.includes(mkey(entry))
  }

  function toggleQuizCard(key: string) {
    const next = new Set(revealQuiz.value)
    next.add(key)
    revealQuiz.value = next
  }

  function setVoice(t: number) {
    vType.value = t
    const ls = lsGet()
    if (ls) try { ls.setItem('nceVoice', String(t)) } catch { /* ignore */ }
  }

  function onOnlyMasterChange(val: boolean) {
    onlyMaster.value = val
    const ls = lsGet()
    if (ls) try { ls.setItem('nceOnlyMaster', val ? '1' : '0') } catch { /* ignore */ }
  }

  function syncHeaderPad() {
    const page = document.querySelector('.words-page') as HTMLElement | null
    const hd = document.querySelector('.words-site-header') as HTMLElement | null
    if (!page || !hd) return
    const h = Math.ceil(hd.getBoundingClientRect().height)
    if (h <= 0) return
    page.style.setProperty('--words-header-h', `${h}px`)
  }

  function splitParagraphs(text?: string) {
    if (!text) return []
    return String(text).split(/\n\s*\n/).map(s => s.trim()).filter(Boolean)
  }

  function renderLessonTextBody(data: LessonTextPayload) {
    const en = data.paragraphs?.length ? data.paragraphs : splitParagraphs(data.text)
    const cn = data.paragraphs_cn?.length ? data.paragraphs_cn : splitParagraphs(data.text_cn)
    if (!en.length) return ''
    let html = ''
    for (let i = 0; i < en.length; i++) {
      html += `<p class="nce-en">${escapeHtml(en[i])}</p>`
      if (cn[i]) html += `<p class="nce-cn">${escapeHtml(cn[i])}</p>`
    }
    return html
  }

  function escapeHtml(s: string) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }

  async function openLessonText(lno: number) {
    lessonTextOpen.value = true
    lessonTextReveal.value = false
    lessonTextLoading.value = true
    lessonTextError.value = ''
    lessonTextHtml.value = ''
    lessonTextTitle.value = `第 ${lno} 课 · 课文`
    lessonTextSub.value = `第${bk.value}册`
    const reqId = ++lessonTextReq
    const cacheKey = `${bk.value}_${lno}`
    const cached = lessonTextCache.value[cacheKey]
    if (cached) {
      if (cached.title_en)
        lessonTextTitle.value = `${cached.title_en}${cached.title_cn ? ` · ${cached.title_cn}` : ''}`
      if (cached.title_pos) lessonTextSub.value = cached.title_pos
      lessonTextHtml.value = renderLessonTextBody(cached)
      lessonTextLoading.value = false
      return
    }
    try {
      const data = await $fetch<LessonTextPayload>(`/nce/${bk.value}/${lno}.json?v=${buildId.value}`)
      if (reqId !== lessonTextReq) return
      lessonTextCache.value = { ...lessonTextCache.value, [cacheKey]: data }
      if (data.title_en)
        lessonTextTitle.value = `${data.title_en}${data.title_cn ? ` · ${data.title_cn}` : ''}`
      if (data.title_pos) lessonTextSub.value = data.title_pos
      lessonTextHtml.value = renderLessonTextBody(data)
    }
    catch {
      if (reqId !== lessonTextReq) return
      lessonTextError.value = `未找到课文（/nce/${bk.value}/${lno}.json）`
    }
    finally {
      if (reqId === lessonTextReq) lessonTextLoading.value = false
    }
  }

  function closeLessonText() {
    lessonTextOpen.value = false
    lessonTextReveal.value = false
    lessonTextReq++
  }

  function shuffle<T>(arr: T[]) {
    const a = arr.slice()
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[a[i], a[j]] = [a[j]!, a[i]!]
    }
    return a
  }

  function openRand() {
    const pool = activeBookWords.value.slice()
    randItems.value = shuffle(pool).slice(0, Math.min(10, pool.length))
    randReveal.value = false
    randRevealSet.value = new Set()
    randOpen.value = true
  }

  function closeRand() {
    randOpen.value = false
  }

  function shuffleRand() {
    const pool = activeBookWords.value.slice()
    randItems.value = shuffle(pool).slice(0, Math.min(10, pool.length))
    randReveal.value = false
    randRevealSet.value = new Set()
  }

  function randSub() {
    return `当前册随机 ${randItems.value.length} 词 · 点击卡片显示释义`
  }

  let headerPadTimer: ReturnType<typeof setTimeout> | null = null
  function onHeaderResize() {
    if (headerPadTimer) clearTimeout(headerPadTimer)
    headerPadTimer = setTimeout(() => {
      headerPadTimer = null
      syncHeaderPad()
    }, 120)
  }

  onMounted(() => {
    loadPrefs()
    const savedLesson = lessonMap.value[String(bk.value)]
    if (savedLesson === 'all' || savedLesson)
      cur.value = String(savedLesson)
    if (cur.value !== 'all') bookRestoring.value = true
    syncHeaderPad()
    nextTick(() => syncHeaderPad())
    window.addEventListener('resize', onHeaderResize, { passive: true })
    rail.mountScrollListener()
    if (!bookPending.value) tryScheduleBookRestore()
  })

  onUnmounted(() => {
    window.removeEventListener('resize', onHeaderResize)
    if (restoreScheduleTimer) clearTimeout(restoreScheduleTimer)
    clearSwitchLockFailsafe()
    bumpRestoreGeneration()
    lessonRender.onUnmount()
    rail.cleanup()
    audio.stopChain()
    document.querySelector('.words-page')?.style.removeProperty('--words-header-h')
  })

  return {
    bk,
    bookPending,
    bookRestoring,
    bookSwitchLock,
    bookError,
    cur,
    q,
    quiz,
    onlyMaster,
    autoPlay,
    vType,
    chainGap,
    chainRepeat,
    playingWord,
    prefsOpen,
    prefsSummary,
    revealQuiz,
    lessonGroups,
    wordsRenderComplete: lessonRender.renderComplete,
    wordsUiReady,
    visibleLessonOrder: lessonRender.visibleLessonOrder,
    isLessonWordsVisible: lessonRender.isLessonWordsVisible,
    lessonWordsGridStyle: lessonRender.lessonWordsGridStyle,
    matchCount,
    statLessons,
    statWords,
    railChips,
    gapStepDisabled,
    repeatStepDisabled,
    lessonTextOpen,
    lessonTextReveal,
    lessonTextLoading,
    lessonTextError,
    lessonTextTitle,
    lessonTextSub,
    lessonTextHtml,
    randOpen,
    randReveal,
    randItems,
    randRevealSet,
    randSub,
    audio,
    switchBook,
    pick: rail.pickLesson,
    toggleMaster,
    isMastered,
    toggleQuizCard,
    setVoice,
    onOnlyMasterChange,
    openLessonText,
    closeLessonText,
    openRand,
    closeRand,
    shuffleRand,
    saveChainPrefs,
    syncHeaderPad,
    cardKey: (r: WordEntry) => `${r.b}_${r.l}_${r.w}`,
  }
}