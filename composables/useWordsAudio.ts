import type { Ref } from 'vue'

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

export function useWordsAudio(
  vType: Ref<number>,
  autoPlay: Ref<boolean>,
  chainGap: Ref<number>,
  chainRepeat: Ref<number>,
  playingWord: Ref<string | null>,
) {
  let player: HTMLAudioElement | null = null
  let prefetchPlayer: HTMLAudioElement | null = null

  function ensurePlayers(): boolean {
    if (import.meta.server) return false
    if (!player) {
      player = new Audio()
      prefetchPlayer = new Audio()
      try { prefetchPlayer.preload = 'auto' } catch { /* ignore */ }
    }
    return true
  }
  let chainTimer: ReturnType<typeof setTimeout> | null = null
  let chainQueue: HTMLElement[] = []
  let chainIdx = 0
  let chainWordCount = 0
  let prefetchWord = ''

  function vurl(w: string) {
    return `https://dict.youdao.com/dictvoice?type=${vType.value}&audio=${encodeURIComponent(w)}`
  }

  function stopChain() {
    if (chainTimer) { clearTimeout(chainTimer); chainTimer = null }
    chainQueue = []
    chainIdx = 0
    chainWordCount = 0
    prefetchWord = ''
    playingWord.value = null
    if (!player || !prefetchPlayer) return
    player.onended = null
    prefetchPlayer.onended = null
    ;(player as Audio & { _nceWord?: string })._nceWord = ''
    ;(prefetchPlayer as Audio & { _nceWord?: string })._nceWord = ''
    try { player.pause() } catch { /* ignore */ }
    try { prefetchPlayer.pause() } catch { /* ignore */ }
  }

  function prefetchChainWord(w: string) {
    if (!ensurePlayers()) return
    if (!w || prefetchWord === w) return
    prefetchWord = w
    try {
      prefetchPlayer.src = vurl(w)
      ;(prefetchPlayer as Audio & { _nceWord?: string })._nceWord = w
      prefetchPlayer.load()
    } catch { /* ignore */ }
  }

  function peekNextChainWord() {
    if (!autoPlay.value || !chainQueue.length) return ''
    const need = clampInt(chainRepeat.value, 1, 5, 1)
    if (chainWordCount + 1 < need) return ''
    const nextEl = chainQueue[chainIdx + 1]
    return nextEl?.getAttribute('data-w') || ''
  }

  function playOne(w: string, onEnded?: () => void) {
    if (!ensurePlayers()) {
      onEnded?.()
      return
    }
    const pMain = player as Audio & { _nceWord?: string }
    const pPre = prefetchPlayer as Audio & { _nceWord?: string }
    try { player.onended = null } catch { /* ignore */ }

    function bindEnded() {
      let startedAt = Date.now()
      let finished = false
      let kick = 0
      player.onended = () => {
        if (finished) return
        if (kick < 1 && Date.now() - startedAt < 200 && player.currentTime < 0.2) {
          kick++
          startedAt = Date.now()
          try { player.currentTime = 0 } catch { /* ignore */ }
          player.play().then(() => {}, () => {
            if (finished) return
            finished = true
            onEnded?.()
          })
          return
        }
        finished = true
        onEnded?.()
      }
    }

    function startPlayback() {
      bindEnded()
      player.play().then(() => {}, () => {
        try { player.currentTime = 0 } catch { /* ignore */ }
        player.play().then(() => {}, () => onEnded?.())
      })
    }

    if (pMain._nceWord === w && player.src) {
      try { player.pause() } catch { /* ignore */ }
      let started = false
      const afterSeek = () => {
        if (started) return
        started = true
        startPlayback()
      }
      try {
        if (player.currentTime > 0.01 || player.ended) {
          const onSeeked = () => {
            player.removeEventListener('seeked', onSeeked)
            afterSeek()
          }
          player.addEventListener('seeked', onSeeked)
          player.currentTime = 0
          setTimeout(afterSeek, 80)
          return
        }
      } catch { /* ignore */ }
      afterSeek()
      return
    }

    if (prefetchWord === w) {
      const tmp = player
      player = prefetchPlayer
      prefetchPlayer = tmp
      prefetchWord = ''
      try { prefetchPlayer.onended = null; prefetchPlayer.pause() } catch { /* ignore */ }
    }
    else {
      player.src = vurl(w)
    }
    pMain._nceWord = w
    startPlayback()
  }

  function scheduleNextChain() {
    if (chainTimer) { clearTimeout(chainTimer); chainTimer = null }
    const el = chainQueue[chainIdx]
    const w = el?.getAttribute('data-w') || ''
    if (w && (player as Audio & { _nceWord?: string })._nceWord !== w)
      prefetchChainWord(w)
    const ms = clampGap(chainGap.value, 0, 5, 2) * 1000
    if (ms <= 0) { playChainStep(); return }
    chainTimer = setTimeout(() => playChainStep(), ms)
  }

  function revealPlaying(el: HTMLElement | null) {
    if (!el) return
    const w = el.getAttribute('data-w')
    if (w) playingWord.value = w
    const siteHeader = document.querySelector('.words-site-header')
    const topPad = (siteHeader?.getBoundingClientRect().height || 0) + 8
    const bottomPad = 28
    const vh = window.innerHeight || document.documentElement.clientHeight
    const rect = el.getBoundingClientRect()
    if (rect.top >= topPad && rect.bottom <= vh - bottomPad) return
    const target = rect.top + window.pageYOffset - Math.max(topPad + 8, Math.min((vh - rect.height) / 3, vh * 0.28))
    window.scrollTo({ top: Math.max(0, target), left: 0, behavior: 'auto' })
  }

  function playChainStep() {
    if (!autoPlay.value || chainIdx >= chainQueue.length) { stopChain(); return }
    const el = chainQueue[chainIdx]
    if (!el?.isConnected) { stopChain(); return }
    revealPlaying(el)
    const w = el.getAttribute('data-w') || ''
    playOne(w, () => {
      if (!autoPlay.value) { stopChain(); return }
      chainWordCount++
      const need = clampInt(chainRepeat.value, 1, 5, 1)
      if (chainWordCount < need) {
        scheduleNextChain()
        return
      }
      chainWordCount = 0
      chainIdx++
      if (chainIdx >= chainQueue.length) { stopChain(); return }
      scheduleNextChain()
    })
    prefetchChainWord(peekNextChainWord())
  }

  function playTry(w: string) {
    if (!ensurePlayers()) return
    const word = String(w || '').trim()
    if (!word) return
    stopChain()
    playingWord.value = word
    playOne(word)
  }

  function playMain(w: string, contentRoot: string) {
    if (!ensurePlayers()) return
    if (!autoPlay.value) {
      stopChain()
      playingWord.value = w
      playOne(w)
      return
    }
    stopChain()
    const nodes = Array.from(document.querySelectorAll<HTMLElement>(`${contentRoot} .word`))
    const i = nodes.findIndex(n => n.getAttribute('data-w') === w)
    if (i < 0) {
      playingWord.value = w
      playOne(w)
      return
    }
    chainQueue = nodes.slice(i)
    chainIdx = 0
    chainWordCount = 0
    playChainStep()
  }

  return { playMain, playTry, stopChain }
}