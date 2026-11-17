export interface WordEntry {
  b: number
  l: number
  g: string
  t: string
  w: string
  p: string
  m: string
  e?: string
}

export type WordsBookMeta = Record<string, [lessons: number, words: number]>

export interface LessonTextPayload {
  index?: number
  title_en?: string
  title_cn?: string
  title_pos?: string
  paragraphs?: string[]
  paragraphs_cn?: string[]
  text?: string
  text_cn?: string
}