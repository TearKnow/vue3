// eslint.config.js
import { createConfigForNuxt } from '@nuxt/eslint-config'

export default createConfigForNuxt({
  features: {
    stylistic: true,
  },
}).append({
  rules: {
    // Nuxt auto-import APIs (e.g. useSeoMeta) are injected at build time.
    // Disable no-undef to avoid false positives in <script setup>.
    'no-undef': 'off',
    // 把未使用变量从错误降级为警告
    // 'no-unused-vars': 'warn',
    // 或者如果你想完全关闭（不推荐）
    'no-unused-vars': 'off',

  },
})
