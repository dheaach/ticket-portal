/** Bare http(s) URLs in text — shared with ticket AI linkify helpers. */
export const URL_IN_TEXT = /https?:\/\/[^\s<>"')]+/gi

/**
 * Turn bare http(s) URLs in HTML into <a> tags without changing existing links or structure.
 * Safe for Quill comment/description HTML (client-side).
 */
export function linkifyRichHtml(html: string): string {
  const raw = String(html || '')
  if (!raw.trim()) return raw
  if (typeof document === 'undefined') return raw

  const div = document.createElement('div')
  div.innerHTML = raw

  const walk = (node: Node): void => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element
      const tag = el.tagName
      if (tag === 'A' || tag === 'SCRIPT' || tag === 'STYLE') return
      const children = Array.from(node.childNodes)
      for (const child of children) walk(child)
      return
    }
    if (node.nodeType !== Node.TEXT_NODE) return

    const text = node.textContent ?? ''
    URL_IN_TEXT.lastIndex = 0
    if (!URL_IN_TEXT.test(text)) return

    const parent = node.parentNode
    if (!parent) return

    URL_IN_TEXT.lastIndex = 0
    const frag = document.createDocumentFragment()
    let last = 0
    for (const match of text.matchAll(URL_IN_TEXT)) {
      const i = match.index ?? 0
      if (i > last) frag.appendChild(document.createTextNode(text.slice(last, i)))
      const url = match[0]
      const a = document.createElement('a')
      a.href = url
      a.target = '_blank'
      a.rel = 'noopener noreferrer'
      a.textContent = url
      frag.appendChild(a)
      last = i + url.length
    }
    if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)))
    if (last > 0) parent.replaceChild(frag, node)
  }

  walk(div)
  return div.innerHTML
}
