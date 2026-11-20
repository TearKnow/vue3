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
  const lessonTextLno = ref(0)
  const lessonAudioPlaying = ref(false)
  const lessonAudioError = ref('')
  const lessonAudioTime = ref(0)
  const lessonAudioDuration = ref(0)
  let lessonAudio: HTMLAudioElement | null = null
  let lessonSeekPending = 0
  let lessonSeekAbsolute: number | null = null
  let lessonSeekWaiting = false
  let lessonAudioScrubbing = false
  let lessonAudioArmed = false
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
      if (token !== restoreToken) return
      syncHeaderPad()
      const lesson = cur.value
      if (lesson === 'all')
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
      else
        rail.scrollToLesson(lesson)
      nextTick(() => {
        if (token !== restoreToken) return
        bookRestoring.value = false
        bookSwitchLock.value = false
        clearSwitchLockFailsafe()
        rail.finishRestoreBoot(lesson)
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
    cur,
  )

  const lessonOrderKey = computed(() => lessonGroups.value.order.join(','))
  /** 词条已展示过后保持侧栏，避免无关重算触发分批渲染导致目录闪没 */
  const wordsUiReady = ref(false)

  watch(lessonOrderKey, () => {
    wordsUiReady.value = false
  })

  function syncWordsUiReady() {
    const order = lessonGroups.value.order
    if (bookPending.value || !order.length) {
      wordsUiReady.value = false
      return
    }
    if (lessonRender.renderComplete.value) {
      wordsUiReady.value = true
      return
    }
    if (bookRestoring.value && cur.value !== 'all') {
      wordsUiReady.value = lessonRender.renderReadyForRestore.value
      return
    }
    wordsUiReady.value = lessonRender.renderedCount.value > 0
  }

  function tryScheduleBookRestore() {
    if (bookPending.value) return
    /** 仅换册/首进恢复课位；日常滚动手改 cur 不再触发滚动 */
    if (!bookRestoring.value) return
    const order = lessonGroups.value.order
    if (!order.length) return
    if (cur.value !== 'all') {
      const l = Number(cur.value)
      if (!Number.isFinite(l) || !order.includes(l)) {
        cur.value = 'all'
        bookRestoring.value = false
        bookSwitchLock.value = false
        clearSwitchLockFailsafe()
        rail.finishRestoreBoot('all')
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
        return
      }
      if (!lessonRender.renderReadyForRestore.value) return
    }
    scheduleBookRestore()
  }

  watch(
    () => [bk.value, bookPending.value] as const,
    ([, pending]) => {
      if (pending) {
        if (cur.value !== 'all') bookRestoring.value = true
        rail.setRailBooting(true)
        return
      }
      tryScheduleBookRestore()
    },
  )

  watch(
    [
      () => lessonRender.renderComplete.value,
      () => lessonRender.renderReadyForRestore.value,
      () => lessonRender.renderedCount.value,
      () => bookPending.value,
      () => bookRestoring.value,
      () => cur.value,
      lessonOrderKey,
    ],
    () => {
      syncWordsUiReady()
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

  function isLocalAudioHost(hostname: string) {
    return !hostname
      || hostname === 'localhost'
      || hostname.endsWith('.localhost')
      || hostname.endsWith('.vercel.app')
      || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)
  }

  /** 当前站点把 www 换成 nceaudio；裸域名则挂在 nceaudio 子域。不写死具体域名。 */
  function nceAudioHost(hostname: string) {
    if (isLocalAudioHost(hostname)) return ''
    if (/^www\./i.test(hostname)) return hostname.replace(/^www\./i, 'nceaudio.')
    if (/^nceaudio\./i.test(hostname)) return hostname
    return `nceaudio.${hostname}`
  }

  function lessonAudioUrl(book: number, lesson: number) {
    if (!import.meta.client || !book || !lesson) return ''
    let hostname = window.location.hostname
    let protocol = window.location.protocol
    let host = nceAudioHost(hostname)
    if (!host) {
      try {
        const site = useRuntimeConfig().public.siteUrl as string
        const u = new URL(site)
        hostname = u.hostname
        protocol = u.protocol || protocol
        host = nceAudioHost(hostname)
      }
      catch { /* ignore */ }
    }
    if (!host) return ''
    return `${protocol}//${host}/${book}/${lesson}.mp3`
  }

  function formatAudioClock(sec: number) {
    const s = Math.max(0, Math.floor(Number.isFinite(sec) ? sec : 0))
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  }

  const lessonAudioNowLabel = computed(() => formatAudioClock(lessonAudioTime.value))
  const lessonAudioDurLabel = computed(() => (
    lessonAudioDuration.value > 0 ? formatAudioClock(lessonAudioDuration.value) : '0:00'
  ))

  const lessonAudioRatio = computed(() => {
    const dur = lessonAudioDuration.value
    if (!(dur > 0)) return 0
    return Math.min(1, Math.max(0, lessonAudioTime.value / dur))
  })

  function resetLessonSeek() {
    lessonSeekPending = 0
    lessonSeekAbsolute = null
    lessonSeekWaiting = false
    lessonAudioScrubbing = false
    lessonAudioArmed = false
  }

  function bindLessonAudio(el: HTMLAudioElement) {
    el.ontimeupdate = () => {
      if (lessonAudioScrubbing) return
      lessonAudioTime.value = el.currentTime || 0
    }
    el.onloadedmetadata = () => {
      lessonAudioDuration.value = Number.isFinite(el.duration) ? el.duration : 0
    }
    el.onended = () => { lessonAudioPlaying.value = false }
    el.onerror = () => {
      lessonAudioPlaying.value = false
      if (lessonAudioArmed)
        lessonAudioError.value = '课文音频加载失败'
    }
  }

  function ensureLessonAudio(quiet = false) {
    if (!lessonTextLno.value) return null
    const url = lessonAudioUrl(bk.value, lessonTextLno.value)
    if (!url) {
      if (!quiet)
        lessonAudioError.value = '当前环境无法拼出课文音频地址'
      return null
    }
    if (!lessonAudio) lessonAudio = new Audio()
    bindLessonAudio(lessonAudio)
    if (!quiet)
      lessonAudioError.value = ''
    if (lessonAudio.src !== url) {
      lessonAudioTime.value = 0
      lessonAudioDuration.value = 0
      lessonAudio.src = url
      try { lessonAudio.load() } catch { /* ignore */ }
    }
    return lessonAudio
  }

  function stopLessonAudio() {
    lessonAudioPlaying.value = false
    lessonAudioTime.value = 0
    lessonAudioDuration.value = 0
    resetLessonSeek()
    if (!lessonAudio) return
    lessonAudio.ontimeupdate = null
    lessonAudio.onloadedmetadata = null
    lessonAudio.onended = null
    lessonAudio.onerror = null
    try { lessonAudio.pause() } catch { /* ignore */ }
    lessonAudio.removeAttribute('src')
    try { lessonAudio.load() } catch { /* ignore */ }
  }

  function toggleLessonAudio() {
    if (!lessonTextLno.value) return
    lessonAudioArmed = true
    if (lessonAudioPlaying.value) {
      try { lessonAudio?.pause() } catch { /* ignore */ }
      lessonAudioPlaying.value = false
      return
    }
    const el = ensureLessonAudio()
    if (!el) return
    audio.stopChain()
    el.play().then(() => {
      lessonAudioPlaying.value = true
    }).catch(() => {
      lessonAudioPlaying.value = false
      lessonAudioError.value = '课文音频无法播放'
    })
  }

  function applyLessonSeekTo(sec: number) {
    const el = lessonAudio
    if (!el) return
    let next = Math.max(0, sec)
    if (Number.isFinite(el.duration) && el.duration > 0)
      next = Math.min(next, el.duration)
    try { el.currentTime = next } catch { /* ignore */ }
    lessonAudioTime.value = Number.isFinite(el.currentTime) ? el.currentTime : next
  }

  function whenLessonAudioReady(el: HTMLAudioElement, run: () => void) {
    if (el.readyState >= 1) {
      run()
      return
    }
    if (lessonSeekWaiting) return
    lessonSeekWaiting = true
    const onMeta = () => {
      el.removeEventListener('loadedmetadata', onMeta)
      lessonSeekWaiting = false
      const absolute = lessonSeekAbsolute
      const pending = lessonSeekPending
      lessonSeekAbsolute = null
      lessonSeekPending = 0
      if (absolute != null) applyLessonSeekTo(absolute)
      else if (pending) applyLessonSeekTo((el.currentTime || 0) + pending)
      run()
    }
    el.addEventListener('loadedmetadata', onMeta)
  }

  function seekLessonAudio(delta: number) {
    lessonAudioArmed = true
    const el = ensureLessonAudio()
    if (!el) return
    if (el.readyState >= 1) {
      applyLessonSeekTo((el.currentTime || 0) + delta)
      return
    }
    lessonSeekPending += delta
    whenLessonAudioReady(el, () => {})
  }

  function seekLessonAudioTo(sec: number) {
    lessonAudioArmed = true
    const el = ensureLessonAudio()
    if (!el) return
    if (el.readyState >= 1) {
      applyLessonSeekTo(sec)
      return
    }
    lessonSeekAbsolute = Math.max(0, sec)
    whenLessonAudioReady(el, () => {})
  }

  function beginLessonAudioScrub() {
    lessonAudioScrubbing = true
  }

  function endLessonAudioScrub() {
    lessonAudioScrubbing = false
    if (lessonAudio)
      lessonAudioTime.value = lessonAudio.currentTime || lessonAudioTime.value
  }

  function primeLessonAudio() {
    const el = ensureLessonAudio(true)
    if (!el) return
    try { el.preload = 'metadata' } catch { /* ignore */ }
  }

  async function openLessonText(lno: number) {
    stopLessonAudio()
    lessonAudioError.value = ''
    lessonTextLno.value = lno
    primeLessonAudio()
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
    stopLessonAudio()
    lessonAudioError.value = ''
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

  function persistBookVisit() {
    saveLessonPref()
    const ls = lsGet()
    if (ls) {
      try { ls.setItem('nce4book', String(bk.value)) } catch { /* ignore */ }
    }
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
    window.addEventListener('pagehide', persistBookVisit)
    rail.mountScrollListener()
    if (!bookPending.value) tryScheduleBookRestore()
  })

  onUnmounted(() => {
    window.removeEventListener('pagehide', persistBookVisit)
    window.removeEventListener('resize', onHeaderResize)
    if (restoreScheduleTimer) clearTimeout(restoreScheduleTimer)
    clearSwitchLockFailsafe()
    bumpRestoreGeneration()
    lessonRender.onUnmount()
    rail.cleanup()
    stopLessonAudio()
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
    lessonTextLno,
    lessonAudioPlaying,
    lessonAudioError,
    lessonAudioNowLabel,
    lessonAudioDurLabel,
    lessonAudioTime,
    lessonAudioDuration,
    lessonAudioRatio,
    toggleLessonAudio,
    seekLessonAudio,
    seekLessonAudioTo,
    beginLessonAudioScrub,
    endLessonAudioScrub,
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
