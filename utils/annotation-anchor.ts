export interface AnnotationAnchor {
  quote: string
  prefix: string
  suffix: string
}

export interface AnnotationRecord extends AnnotationAnchor {
  id: string
  pageKey: string
  comment: string
  createdAt: string
}

const CONTEXT_LENGTH = 32

export function captureSelectionAnchor(container: HTMLElement): AnnotationAnchor | null {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed)
    return null

  const range = selection.getRangeAt(0)
  if (!container.contains(range.commonAncestorContainer))
    return null

  const quote = selection.toString()
  if (!quote.trim())
    return null

  const beforeRange = document.createRange()
  beforeRange.selectNodeContents(container)
  beforeRange.setEnd(range.startContainer, range.startOffset)

  const startOffset = beforeRange.toString().length
  const endOffset = startOffset + quote.length
  const fullText = container.textContent || ''

  return {
    quote,
    prefix: fullText.slice(Math.max(0, startOffset - CONTEXT_LENGTH), startOffset),
    suffix: fullText.slice(endOffset, endOffset + CONTEXT_LENGTH),
  }
}

export function findUniqueAnchorOffset(fullText: string, anchor: AnnotationAnchor) {
  const { quote, prefix, suffix } = anchor
  if (!quote)
    return null

  const needle = `${prefix}${quote}${suffix}`
  const matches: number[] = []
  let from = 0

  while (from <= fullText.length) {
    const index = fullText.indexOf(needle, from)
    if (index === -1)
      break
    matches.push(index + prefix.length)
    from = index + 1
  }

  if (matches.length === 1)
    return matches[0]

  return null
}

interface TextPoint {
  node: Text
  offset: number
}

function findTextPoint(container: HTMLElement, targetOffset: number): TextPoint | null {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
  let passed = 0
  let node = walker.nextNode() as Text | null

  while (node) {
    const length = node.data.length
    if (passed + length >= targetOffset)
      return { node, offset: targetOffset - passed }
    passed += length
    node = walker.nextNode() as Text | null
  }

  return null
}

export function wrapAnchorHighlight(
  container: HTMLElement,
  anchor: AnnotationAnchor,
  annotationId: string,
) {
  const fullText = container.textContent || ''
  const start = findUniqueAnchorOffset(fullText, anchor)
  if (start === null)
    return false

  const startPoint = findTextPoint(container, start)
  const endPoint = findTextPoint(container, start + anchor.quote.length)
  if (!startPoint || !endPoint)
    return false

  const range = document.createRange()
  range.setStart(startPoint.node, startPoint.offset)
  range.setEnd(endPoint.node, endPoint.offset)

  const mark = document.createElement('mark')
  mark.className = 'inline-annotation-mark'
  mark.dataset.annotationId = annotationId

  try {
    const fragment = range.extractContents()
    mark.appendChild(fragment)
    range.insertNode(mark)
    return true
  }
  catch {
    return false
  }
}
