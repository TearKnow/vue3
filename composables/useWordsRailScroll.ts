import { nextTick, type Ref } from 'vue'

export function useWordsRailScroll(options: {
  cur: Ref<string>
  saveLessonPref: () => void
}) {
  const { cur, saveLessonPref } = options

  let railLock = false
  let railLockTimer: ReturnType<typeof setTimeout> | null = null
  let railScrollRaf = 0
  let railBooting = true
  let mobileSpyTimer: ReturnType<typeof setTimeout> | null = null

  function isMobileLayout() {
    return window.matchMedia?.('(max-width: 860px)').matches ?? false
  }

  function headerOffset() {
    const hd = document.querySelector('.words-site-header')
    return (hd?.getBoundingClientRect().height || 0) + 8
  }

  function lessonAnchorEl(lno: string): HTMLElement | null {
    if (lno === 'all') return null
    const section = document.getElementById(`L${lno}`)
    if (!section) return null
    return section.querySelector<HTMLElement>('.words-lhead .no') ?? section
  }

  /** 与 syncRailFromScroll 一致：按课号标签锚点对齐顶栏 */
  function lessonScrollTop(lno: string): number | null {
    if (lno === 'all') return 0
    const el = lessonAnchorEl(lno)
    if (!el) return null
    const off = headerOffset()
    return Math.max(0, el.getBoundingClientRect().top + window.pageYOffset - off)
  }

  function scrollToLesson(lno: string) {
    const top = lessonScrollTop(lno)
    if (top == null) return
    window.scrollTo({ top, left: 0, behavior: 'auto' })
  }

  /** 等课节锚点纵向位置连续稳定后再滚动，用于分批渲染结束后的恢复定位 */
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

  function rectInView(r: DOMRect, top: number, bottom: number) {
    return r.bottom > top && r.top < bottom
  }

  function syncRailFromScroll() {
    if (railLock || railBooting) return
    const lessons = document.querySelectorAll<HTMLElement>('#words-content .words-lesson')
    if (!lessons.length) {
      if (cur.value !== 'all') setRailActive('all')
      return
    }
    if (window.pageYOffset <= 12) {
      if (!isMobileLayout() && cur.value !== 'all') setRailActive('all')
      return
    }
    const top = headerOffset()
    const bottom = window.innerHeight || document.documentElement.clientHeight
    let primary: string | null = null
    let primaryNoTop = Infinity
    let coverPrimary: string | null = null
    let firstVisible: string | null = null

    for (let i = 0; i < lessons.length; i++) {
      const les = lessons[i]!
      const id = les.getAttribute('data-l')
      if (!id) continue
      const lr = les.getBoundingClientRect()
      if (!rectInView(lr, top, bottom)) continue
      if (!firstVisible) firstVisible = id
      if (lr.top <= top + 8 && lr.bottom > top + 8) coverPrimary = id

      const no = les.querySelector('.words-lhead .no')
      if (!no) continue
      const nr = no.getBoundingClientRect()
      if (rectInView(nr, top, bottom) && nr.top < primaryNoTop) {
        primaryNoTop = nr.top
        primary = id
      }
    }

    if (!primary) primary = coverPrimary || firstVisible
    if (!primary) {
      const docH = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)
      if (window.pageYOffset + bottom >= docH - 48) {
        primary = lessons[lessons.length - 1]?.getAttribute('data-l') ?? null
      }
    }
    if (!primary) {
      if (cur.value !== 'all') setRailActive('all')
      return
    }
    if (String(cur.value) !== String(primary)) setRailActive(primary)
  }

  function onWindowScrollRail() {
    if (isMobileLayout()) {
      if (mobileSpyTimer) clearTimeout(mobileSpyTimer)
      mobileSpyTimer = setTimeout(() => {
        mobileSpyTimer = null
        syncRailFromScroll()
      }, 180)
      return
    }
    if (railScrollRaf) return
    railScrollRaf = requestAnimationFrame(() => {
      railScrollRaf = 0
      syncRailFromScroll()
    })
  }

  function lockRailBriefly(ms?: number, opts?: { syncOnUnlock?: boolean }) {
    railLock = true
    if (railLockTimer) clearTimeout(railLockTimer)
    const syncOnUnlock = opts?.syncOnUnlock !== false
    railLockTimer = setTimeout(() => {
      railLock = false
      railLockTimer = null
      if (syncOnUnlock) syncRailFromScroll()
    }, ms ?? (isMobileLayout() ? 700 : 450))
  }

  function finishRailBoot() {
    railBooting = false
    syncRailFromScroll()
  }

  /** 恢复课后结束 boot：信任 localStorage 课号，不按视口重写 cur */
  function finishRestoreBoot(lesson: string) {
    railBooting = false
    if (lesson !== 'all' && !isMobileLayout())
      centerRailChipForLesson(lesson)
  }

  function setRailBooting(on: boolean) {
    railBooting = on
  }

  function pickLesson(l: string) {
    lockRailBriefly()
    setRailActive(l, false)
    if (l === 'all') {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
      return
    }
    scrollToLesson(l)
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
    if (mobileSpyTimer) clearTimeout(mobileSpyTimer)
    if (railScrollRaf) cancelAnimationFrame(railScrollRaf)
  }

  return {
    scrollToLesson,
    scrollToLessonWhenStable,
    setRailActive,
    syncRailFromScroll,
    lockRailBriefly,
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

/** 侧栏与主栏 DOM 更新并完成至少两帧绘制后再测量滚动目标，避免 is-offstage 解除后的错位 */
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