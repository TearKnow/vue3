import { readFile } from 'node:fs/promises'

// 专门为 _order.json 设计的轻量接口，直接读文件系统
// 避免走 /project-files/content 中 git ls-files 的重开销路径
export default defineEventHandler(async () => {
  try {
    const content = await readFile('data/wiki/_order.json', 'utf8')
    return JSON.parse(content)
  }
  catch {
    return { groups: {} }
  }
})
