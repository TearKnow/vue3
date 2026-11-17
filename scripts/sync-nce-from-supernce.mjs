/**
 * Sync lesson JSON under public/nce/{book}/ from https://supernce.com/
 * Usage: node scripts/sync-nce-from-supernce.mjs [--book 2] [--from 1] [--to 96] [--delay 400]
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const PROJECT = path.resolve(ROOT, '..')
const BASE = 'https://supernce.com'

const args = process.argv.slice(2)
function arg(name, fallback) {
  const i = args.indexOf(name)
  return i >= 0 && args[i + 1] != null ? args[i + 1] : fallback
}

const book = Number(arg('--book', '2'))
const from = Number(arg('--from', '1'))
const to = Number(arg('--to', book === 2 ? '96' : '60'))
const delayMs = Number(arg('--delay', '450'))

const bookSlug = `nce${book}`

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

function decodeEntities(s) {
  return String(s)
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

/** @param {string} html */
function parseSuperNceLesson(html, lessonNo) {
  const titleTag = html.match(/<title>\s*(\d+)\s*·\s*([^·]+?)\s*·\s*SuperNCE\s*<\/title>/i)
  const title_en = decodeEntities((titleTag?.[2] ?? '').trim())

  const cnSpan = html.match(/<span class="mr-3">([^<]+)<\/span>/)
  const title_cn = decodeEntities((cnSpan?.[1] ?? '').trim())

  const re =
    /&quot;index&quot;:\[0,\d+\],&quot;type&quot;:\[0,&quot;(question|body)&quot;\],&quot;text&quot;:\[0,&quot;((?:[^&]|&(?:quot|#39|amp|lt|gt);)*?)&quot;\],&quot;zh&quot;:\[0,&quot;((?:[^&]|&(?:quot|#39|amp|lt|gt);)*?)&quot;\]/g

  const sentences = []
  let m
  while ((m = re.exec(html))) {
    sentences.push({
      type: m[1],
      text: decodeEntities(m[2]),
      zh: decodeEntities(m[3]),
    })
  }

  const body = sentences.filter(s => s.type === 'body')
  if (!body.length)
    throw new Error('no body sentences in page payload')

  const paragraphs = body.map(s => s.text)
  const paragraphs_cn = body.map(s => s.zh)
  const text = paragraphs.join('\n\n')
  const text_cn = paragraphs_cn.join('\n\n')

  const pageUrl = `${BASE}/books/${bookSlug}/${lessonNo}`

  return {
    index: lessonNo,
    url: pageUrl,
    title_en: title_en || undefined,
    title_cn: title_cn || undefined,
    title_pos: `新概念英语第${book}册第${lessonNo}课`,
    paragraphs,
    text,
    paragraphs_cn,
    text_cn,
  }
}

async function fetchLesson(lessonNo) {
  const url = `${BASE}/books/${bookSlug}/${lessonNo}`
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'vue3-nce-sync/1.0 (personal study; github nuxt words)',
      Accept: 'text/html',
    },
  })
  if (!res.ok)
    throw new Error(`HTTP ${res.status}`)
  return res.text()
}

async function main() {
  const outDir = path.join(PROJECT, 'public', 'nce', String(book))
  fs.mkdirSync(outDir, { recursive: true })

  const failed = []
  let ok = 0

  for (let lesson = from; lesson <= to; lesson++) {
    const outFile = path.join(outDir, `${lesson}.json`)
    process.stdout.write(`[nce${book}] L${lesson} … `)
    try {
      const html = await fetchLesson(lesson)
      const payload = parseSuperNceLesson(html, lesson)
      fs.writeFileSync(outFile, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
      ok++
      console.log('ok', payload.title_en ? `· ${payload.title_en}` : '')
    }
    catch (e) {
      failed.push({ lesson, error: String(e.message || e) })
      console.log('FAIL', e.message || e)
    }
    if (lesson < to)
      await sleep(delayMs)
  }

  console.log(`\nDone: ${ok} written, ${failed.length} failed.`)
  if (failed.length)
    console.log(failed)

  if (failed.length)
    process.exitCode = 1
}

const isMain = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
if (isMain)
  main()