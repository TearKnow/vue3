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

  function scrollToLesson(lno: string) {
    if (lno === 'all') {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
      return
    }
    const el = document.getElementById(`L${lno}`)
    if (!el) return
    const off = headerOffset()
    const top = el.getBoundingClientRect().top + window.pageYOffset - off
    window.scrollTo({ top: Math.max(0, top), left: 0, behavior: 'auto' })
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

  function lockRailBriefly(ms?: number) {
    railLock = true
    if (railLockTimer) clearTimeout(railLockTimer)
    railLockTimer = setTimeout(() => {
      railLock = false
      railLockTimer = null
      syncRailFromScroll()
    }, ms ?? (isMobileLayout() ? 700 : 450))
  }

  function finishRailBoot() {
    railBooting = false
    syncRailFromScroll()
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
    setRailActive,
    syncRailFromScroll,
    lockRailBriefly,
    finishRailBoot,
    setRailBooting,
    pickLesson,
    centerRailChipForLesson,
    mountScrollListener,
    cleanup,
    isMobileLayout,
  }
}

export function runAfterRestoreScroll(token: number, expectedToken: number, run: () => void) {
  if (token !== expectedToken) return
  nextTick(() => {
    if (token !== expectedToken) return
    requestAnimationFrame(() => {
      if (token !== expectedToken) return
      run()
    })
  })
}