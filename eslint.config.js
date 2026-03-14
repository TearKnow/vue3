// eslint.config.js
import { createConfigForNuxt } from '@nuxt/eslint-config'

export default createConfigForNuxt({
  features: {
    stylistic: true, // 开启格式化规则（包括缩进）
  },
})
