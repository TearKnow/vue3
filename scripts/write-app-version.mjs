/**
 * 每次 build 前写入 generated/app-version.json，供 runtimeConfig 与客户端请求缓存穿透
 */
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(ROOT, 'generated')
const outFile = path.join(outDir, 'app-version.json')

let buildId = process.env.NUXT_PUBLIC_APP_BUILD_ID || ''
if (!buildId) {
  try {
    buildId = execSync('git rev-parse --short HEAD', { cwd: ROOT, encoding: 'utf8' }).trim()
  }
  catch {
    buildId = Date.now().toString(36)
  }
}

const payload = {
  buildId,
  builtAt: new Date().toISOString(),
}

fs.mkdirSync(outDir, { recursive: true })
fs.writeFileSync(outFile, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
fs.writeFileSync(path.join(ROOT, 'public', 'build-id.txt'), `${buildId}\n`, 'utf8')
console.log(`[app-version] buildId=${buildId}`)