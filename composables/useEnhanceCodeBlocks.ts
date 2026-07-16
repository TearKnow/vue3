import { nextTick, onMounted, watch, type Ref } from 'vue'

export function useEnhanceCodeBlocks(rootSelector: string, contentKey?: Ref<unknown>) {
  const copyFeedbackTimers = new WeakMap<HTMLButtonElement, ReturnType<typeof setTimeout>>()

  function enhanceCodeBlocks() {
    if (!import.meta.client)
      return

    const blocks = document.querySelectorAll(`${rootSelector} pre`)
    blocks.forEach((pre) => {
      if (!pre.querySelector(':scope > .code-scroll')) {
        const nodes = [...pre.childNodes].filter(
          n => !(n instanceof HTMLElement && n.classList.contains('code-copy-btn')),
        )
        if (nodes.length) {
          const scroll = document.createElement('div')
          scroll.className = 'code-scroll'
          for (const node of nodes)
            scroll.appendChild(node)

          pre.insertBefore(scroll, pre.firstChild)
        }
      }

      if (pre.querySelector('.code-copy-btn'))
        return

      const codeEl = pre.querySelector('.code-scroll code')
      if (!codeEl)
        return

      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'code-copy-btn'
      button.setAttribute('aria-label', '复制代码')
      button.setAttribute('title', '复制代码')
      button.innerHTML = `
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
      `
      button.addEventListener('click', async () => {
        const restoreLabel = () => {
          button.setAttribute('aria-label', '复制代码')
          button.setAttribute('title', '复制代码')
        }
        const prevTimer = copyFeedbackTimers.get(button)
        if (prevTimer)
          clearTimeout(prevTimer)

        try {
          await navigator.clipboard.writeText(codeEl.textContent ?? '')
          button.setAttribute('aria-label', '复制成功')
          button.setAttribute('title', '已复制')
          const timerId = setTimeout(restoreLabel, 1200)
          copyFeedbackTimers.set(button, timerId)
        }
        catch {
          button.setAttribute('aria-label', '复制失败')
          button.setAttribute('title', '复制失败')
          const timerId = setTimeout(restoreLabel, 1200)
          copyFeedbackTimers.set(button, timerId)
        }
      })
      pre.appendChild(button)
    })
  }

  function scheduleEnhance() {
    void nextTick(() => enhanceCodeBlocks())
  }

  onMounted(() => {
    scheduleEnhance()
  })

  if (contentKey) {
    watch(contentKey, () => {
      scheduleEnhance()
    })
  }

  return {
    enhanceCodeBlocks,
    scheduleEnhance,
  }
}
