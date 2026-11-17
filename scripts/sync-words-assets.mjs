import { cp, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const src = join(root, 'data', 'words')
const dest = join(root, 'server', 'assets', 'words')

await mkdir(dest, { recursive: true })
await cp(src, dest, { recursive: true, force: true })