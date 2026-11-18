import { nextTick, type Ref } from 'vue'

const SCROLL_SPY_MS = 180

export function useWordsRailScroll(options: {
  cur: Ref<string>
  saveLessonPref: () => void
}) {
  const { cur, saveLessonPref } = options

  let railBooting = true
  let railLock = false
  let railLockTimer: ReturnType<typeof setTimeout> | null = null
  let scrollSpyTimer: ReturnType<typeof setTimeout> | null = null

  function isMobileLayout() {
    return window.matchMedia?.('(max-width: 860px)').matches ?? false
  }

  function headerOffset() {
    const hd = document.querySelector('.words-site-header')
    return (hd?.getBoundingClientRect().height || 0) + 8
  }

  function invalidateLessonAnchorCache() {
    /* 保留 API，供筛选/换册后无操作占位 */
  }

  function lessonSection(lno: string): HTMLElement | null {
    if (lno === 'all') return null
    return document.getElementById(`L${lno}`)
  }

  function lessonScrollTop(lno: string): number | null {
    if (lno === 'all') return 0
    const section = lessonSection(lno)
    if (!section) return null
    const off = headerOffset()
    return Math.max(0, section.getBoundingClientRect().top + window.scrollY - off)
  }

  function scrollToLesson(lno: string) {
    const section = lessonSection(lno)
    if (!section) return
    section.scrollIntoView({ block: 'start', behavior: 'auto' })
  }

  function scrollToLessonWhenStable(lno: string, onDone?: () => void) {
    if (lno === 'all') {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
      onDone?.()
      return
    }
    let last: number | null = null
    let stable = 0
    let frames = 0
    const maxFrames = 12
    const step = () => {
      frames++
      const top = lessonScrollTop(lno)
      if (top == null) {
        if (frames >= maxFrames) onDone?.()
        else requestAnimationFrame(step)
        return
      }
      if (last !== null && Math.abs(top - last) <= 1)
        stable++
      else
        stable = 0
      last = top
      if (stable >= 1 || frames >= maxFrames) {
        const section = lessonSection(lno)
        if (section)
          section.scrollIntoView({ block: 'start', behavior: 'auto' })
        else
          window.scrollTo({ top, left: 0, behavior: 'auto' })
        onDone?.()
        return
      }
      requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }

  function ensureRailChipVisible(chip: Element) {
    const rail = document.querySelector('.words-rail')
    if (!rail) return
    if (rail.scrollHeight <= rail.clientHeight + 2) return
    const rr = rail.getBoundingClientRect()
    const cr = chip.getBoundingClientRect()
    const delta = (cr.top + cr.height / 2) - (rr.top + rr.height / 2)
    if (Math.abs(delta) < 6) return
    rail.scrollTop += delta
  }

  function setRailActive(l: string, scrollChip = true) {
    if (String(cur.value) !== String(l)) {
      cur.value = String(l)
      saveLessonPref()
    }
    if (scrollChip && l !== 'all' && !isMobileLayout()) {
      const chip = document.querySelector(`.words-rail .n[data-l="${l}"]`)
      if (chip) ensureRailChipVisible(chip)
    }
  }

  /** 根据正文滚动更新侧栏高亮与 nce4lessons，不滚动正文 */
  function syncRailFromScroll() {
    if (railLock || railBooting) return
    const lessons = document.querySelectorAll<HTMLElement>('#words-content .words-lesson')
    if (!lessons.length) {
      if (cur.value !== 'all') setRailActive('all', false)
      return
    }
    if (window.pageYOffset <= 12) {
      if (!isMobileLayout() && cur.value !== 'all') setRailActive('all', false)
      return
    }
    const railTop = headerOffset()
    const bottom = window.innerHeight || document.documentElement.clientHeight
    const anchorDocY = window.scrollY + railTop + 6
    let primary: string | null = null

    for (let i = 0; i < lessons.length; i++) {
      const les = lessons[i]!
      const id = les.getAttribute('data-l')
      if (!id) continue
      const no = les.querySelector('.words-lhead .no')
      if (!no) continue
      const noDocY = no.getBoundingClientRect().top + window.scrollY
      if (noDocY <= anchorDocY) primary = id
    }

    if (!primary) {
      const docH = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)
      if (window.pageYOffset + bottom >= docH - 48)
        primary = lessons[lessons.length - 1]?.getAttribute('data-l') ?? null
    }
    if (!primary) {
      if (cur.value !== 'all') setRailActive('all', false)
      return
    }
    if (String(cur.value) !== String(primary))
      setRailActive(primary, false)
  }

  function onWindowScrollRail() {
    if (railLock) return
    if (scrollSpyTimer) clearTimeout(scrollSpyTimer)
    scrollSpyTimer = setTimeout(() => {
      scrollSpyTimer = null
      syncRailFromScroll()
    }, SCROLL_SPY_MS)
  }

  function lockRailBriefly(ms?: number) {
    railLock = true
    if (railLockTimer) clearTimeout(railLockTimer)
    railLockTimer = setTimeout(() => {
      railLock = false
      railLockTimer = null
    }, ms ?? (isMobileLayout() ? 600 : 480))
  }

  function finishRailBoot() {
    railBooting = false
    syncRailFromScroll()
  }

  function finishRestoreBoot(lesson: string) {
    railBooting = false
    saveLessonPref()
    if (lesson !== 'all' && !isMobileLayout())
      centerRailChipForLesson(lesson)
  }

  function setRailBooting(on: boolean) {
    railBooting = on
  }

  function pickLesson(l: string) {
    if (scrollSpyTimer) {
      clearTimeout(scrollSpyTimer)
      scrollSpyTimer = null
    }
    lockRailBriefly()
    setRailActive(l, true)
    nextTick(() => {
      if (l === 'all') {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
        return
      }
      scrollToLesson(l)
    })
  }

  function centerRailChipForLesson(lno: string) {
    if (lno === 'all' || isMobileLayout()) return
    const chip = document.querySelector(`.words-rail .n[data-l="${lno}"]`)
    if (chip) ensureRailChipVisible(chip)
  }

  function mountScrollListener() {
    window.addEventListener('scroll', onWindowScrollRail, { passive: true })
  }

  function cleanup() {
    window.removeEventListener('scroll', onWindowScrollRail)
    if (railLockTimer) clearTimeout(railLockTimer)
    if (scrollSpyTimer) clearTimeout(scrollSpyTimer)
  }

  return {
    scrollToLesson,
    scrollToLessonWhenStable,
    setRailActive,
    invalidateLessonAnchorCache,
    finishRailBoot,
    finishRestoreBoot,
    setRailBooting,
    pickLesson,
    centerRailChipForLesson,
    mountScrollListener,
    cleanup,
    isMobileLayout,
  }
}

function afterPaintFrames(frames: number, run: () => void) {
  if (frames <= 0) {
    run()
    return
  }
  requestAnimationFrame(() => afterPaintFrames(frames - 1, run))
}

export function runAfterRestoreScroll(token: number, expectedToken: number, run: () => void) {
  if (token !== expectedToken) return
  nextTick(() => {
    if (token !== expectedToken) return
    afterPaintFrames(2, () => {
      if (token !== expectedToken) return
      run()
    })
  })
}