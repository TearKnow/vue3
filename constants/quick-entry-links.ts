export interface QuickEntryLinkItem {
  label: string
  to: string
  icon: string
  openInNewTab?: boolean
  cardClass: string
}

export const quickEntryLinks: QuickEntryLinkItem[] = [
  {
    label: '博客',
    to: '/blog',
    icon: '✍',
    cardClass: 'card-blog',
  },
  {
    label: '文件浏览器',
    to: '/file-browser',
    icon: '📂',
    openInNewTab: true,
    cardClass: 'card-browser',
  },
  {
    label: '页面目录',
    to: '/route-tree',
    icon: '🧭',
    openInNewTab: true,
    cardClass: 'card-route-tree',
  },
]
