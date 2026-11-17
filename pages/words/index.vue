<template>
  <div
    class="words-page"
    :class="{ 'is-quiz': quiz }"
  >
    <header class="words-site-header">
      <div class="words-hd words-wrap">
        <div class="words-brand">
          <div>
            <div class="t1">
              新概念英语 1-4 册
            </div>
            <div class="t2">
              词汇总表 · 单词 / 音标 / 释义
            </div>
          </div>
        </div>
        <div class="words-stats">
          <span><b>{{ statLessons }}</b> 课</span>
          <span><b>{{ statWords }}</b> 词</span>
          <span
            class="words-build-id words-build-id--hd"
            :title="`站点构建 ${appBuildId}`"
          >{{ appBuildId }}</span>
        </div>
        <div class="words-controls">
          <div
            class="words-books"
            role="group"
            aria-label="选择册别"
          >
            <button
              v-for="n in 4"
              :key="n"
              type="button"
              :class="{ on: bk === n }"
              :disabled="bookSwitchLock"
              @click="switchBook(n)"
            >
              第{{ ['一', '二', '三', '四'][n - 1] }}册
            </button>
          </div>
          <div
            class="words-prefs"
            :class="{ open: prefsOpen }"
          >
            <button
              type="button"
              class="words-prefs-btn"
              :aria-expanded="prefsOpen"
              @click.stop="prefsOpen = !prefsOpen"
            >
              <span class="words-prefs-label">设置</span>
              <span class="words-prefs-sum">{{ prefsSummary }}</span>
              <span aria-hidden="true">▼</span>
            </button>
            <div
              v-show="prefsOpen"
              class="words-prefs-panel"
              role="dialog"
              aria-label="学习设置"
              @click.stop
            >
              <div class="row words-prefs-voice-row">
                <span class="words-prefs-voice-label">发音</span>
                <div class="words-voice-pick">
                  <button
                    type="button"
                    :class="{ on: vType === 1 }"
                    aria-label="英音"
                    @click="setVoice(1)"
                  >
                    英
                  </button>
                  <button
                    type="button"
                    :class="{ on: vType === 2 }"
                    aria-label="美音"
                    @click="setVoice(2)"
                  >
                    美
                  </button>
                </div>
              </div>
              <div
                class="row"
                style="display:flex;flex-wrap:wrap;gap:6px"
              >
                <label class="words-toggle"><input
                  v-model="quiz"
                  type="checkbox"
                > 自测</label>
                <label class="words-toggle"><input
                  :checked="onlyMaster"
                  type="checkbox"
                  @change="onOnlyMasterChange(($event.target as HTMLInputElement).checked)"
                > 只看易忘</label>
              </div>
              <div class="row">
                <div
                  class="words-chain-block"
                  :class="{ 'is-idle': !autoPlay }"
                >
                  <label class="words-toggle"><input
                    v-model="autoPlay"
                    type="checkbox"
                    @change="!autoPlay && audio.stopChain()"
                  > 连播</label>
                  <div
                    style="display:flex;flex-direction:column;gap:6px;margin-top:8px"
                  >
                    <div class="words-stepper">
                      <span>间隔</span>
                      <button
                        type="button"
                        class="sbtn"
                        :disabled="gapStepDisabled(-1)"
                        @click="stepGap(-1)"
                      >
                        −
                      </button>
                      <b>{{ formatGap(chainGap) }}</b>
                      <button
                        type="button"
                        class="sbtn"
                        :disabled="gapStepDisabled(1)"
                        @click="stepGap(1)"
                      >
                        +
                      </button>
                      <span>秒</span>
                    </div>
                    <div class="words-stepper">
                      <span>连读</span>
                      <button
                        type="button"
                        class="sbtn"
                        :disabled="repeatStepDisabled(-1)"
                        @click="stepRepeat(-1)"
                      >
                        −
                      </button>
                      <b>{{ chainRepeat }}</b>
                      <button
                        type="button"
                        class="sbtn"
                        :disabled="repeatStepDisabled(1)"
                        @click="stepRepeat(1)"
                      >
                        +
                      </button>
                      <span>次</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <button
            type="button"
            class="words-ctrl-btn"
            @click="openRand"
          >
            随机练习
          </button>
        </div>
      </div>
      <div class="words-searchbar words-wrap">
        <div class="words-toolbar">
          <div class="words-search">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            ><circle
              cx="11"
              cy="11"
              r="7"
            /><path d="M20 20l-3.5-3.5" /></svg>
            <input
              v-model="q"
              type="search"
              placeholder="在当前册内搜索单词 / 释义，如 private、音乐会、优势"
            >
          </div>
          <div class="words-trybox">
            <input
              v-model="tryWord"
              type="text"
              placeholder="试听任意单词"
              autocomplete="off"
              spellcheck="false"
              @keydown.enter.prevent="trySpeak"
            >
            <button
              type="button"
              class="words-trybtn"
              @click="trySpeak"
            >
              发音
            </button>
          </div>
        </div>
        <div
          v-if="matchCount"
          class="words-srch-count"
        >
          匹配 {{ matchCount }} 个词条
        </div>
      </div>
    </header>

    <div
      class="words-layout"
      :class="{ 'is-preparing': lessonGroups.order.length > 0 && !wordsRenderComplete }"
    >
      <nav
        v-if="wordsRenderComplete && lessonGroups.order.length"
        class="words-rail"
        aria-label="按课浏览"
      >
        <h3>按课浏览</h3>
        <div
          class="all"
          :class="{ on: cur === 'all' }"
          @click="pick('all')"
        >
          全部
        </div>
        <div
          v-for="chip in railChips"
          :key="`${bk}-${chip.l}`"
          class="n"
          :class="{ on: cur === String(chip.l) }"
          :data-l="chip.l"
          @click="pick(String(chip.l))"
        >
          <span class="num">{{ chip.g }}</span>
          <span class="tt">{{ chip.t }}</span>
        </div>
      </nav>

      <main id="words-content">
        <div
          v-if="bookError"
          class="words-err"
        >
          词表加载失败，请刷新重试
        </div>
        <div
          v-else-if="(bookPending || bookRestoring) && !lessonGroups.order.length"
          class="words-loading"
        >
          加载词表中…
        </div>
        <div
          v-else-if="!lessonGroups.order.length"
          class="words-empty"
        >
          没有匹配的单词，换个关键词试试
        </div>
        <template v-else>
          <div
            v-if="!wordsRenderComplete"
            class="words-loading"
          >
            正在准备词条…
          </div>
          <div
            class="words-lessons-stage"
            :class="{ 'is-offstage': !wordsRenderComplete }"
          >
            <section
              v-for="lno in lessonGroups.order"
              :id="`L${lno}`"
              :key="`${bk}-${lno}`"
              class="words-lesson"
              :data-l="lno"
            >
              <div class="words-lhead">
            <span class="no">{{ lessonGroups.map.get(lno)?.[0]?.g }}</span>
            <span class="tt">
              <span class="words-lhead-title">{{ lessonGroups.map.get(lno)?.[0]?.t }}</span>
              <button
                v-if="bk >= 2"
                type="button"
                class="words-ltext-btn"
                aria-label="阅读课文"
                title="阅读课文"
                @click="openLessonText(lno)"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  aria-hidden="true"
                ><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H6.5A2.5 2.5 0 0 1 4 17.5z" /><path d="M8 7h9M8 11h9M8 15h6" /></svg>
              </button>
            </span>
            <span class="nw">{{ lessonGroups.map.get(lno)?.length }} 词</span>
          </div>
          <div
            class="words-grid"
            :style="lessonWordsGridStyle(lessonGroups.map.get(lno)?.length ?? 0, lno)"
          >
            <template v-if="isLessonWordsVisible(lno)">
              <div
                v-for="entry in lessonGroups.map.get(lno)"
                :key="cardKey(entry)"
                class="words-word word"
                :class="{
                  playing: playingWord === entry.w,
                  'is-reveal': revealQuiz.has(cardKey(entry)),
                }"
                :data-w="entry.w"
                @click="onWordClick(entry)"
              >
                <button
                  type="button"
                  class="words-vbtn"
                  :aria-label="`播放 ${entry.w}`"
                  @click.stop="audio.playMain(entry.w, '#words-content')"
                >
                  <span class="sr-only">播放</span>
                </button>
                <div class="w-main">
                  <div class="words-w-word">
                    {{ entry.w }}
                    <span class="words-w-ph">{{ entry.p }}</span>
                  </div>
                  <div class="words-w-me w-me">
                    {{ entry.m }}
                  </div>
                  <div
                    v-if="entry.e"
                    class="w-ex"
                    style="font-size:13px;color:var(--words-muted);font-style:italic;margin-top:4px"
                  >
                    {{ entry.e }}
                  </div>
                </div>
                <button
                  type="button"
                  class="words-master"
                  :class="{ on: isMastered(entry) }"
                  :aria-label="isMastered(entry) ? '取消易忘' : '标记易忘'"
                  @click.stop="toggleMaster(entry)"
                >
                  {{ isMastered(entry) ? '★' : '☆' }}
                </button>
              </div>
            </template>
              </div>
            </section>
          </div>
        </template>
      </main>
    </div>

    <div
      v-if="lessonTextOpen"
      class="words-modal-mask"
      @pointerdown.self="textMaskDown = true"
      @pointerup.self="onTextMaskUp"
      @pointercancel="textMaskDown = false"
    >
      <div
        class="words-modal wide"
        :class="{ 'show-cn': lessonTextReveal }"
        role="dialog"
        aria-modal="true"
        aria-labelledby="words-lesson-text-title"
        @click.stop
      >
        <div class="words-modal-head">
          <div class="words-modal-head-text">
            <h2 id="words-lesson-text-title">
              {{ lessonTextTitle }}
            </h2>
            <div class="sub">
              {{ lessonTextSub }}
            </div>
          </div>
          <div class="words-modal-head-actions">
            <button
              type="button"
              class="words-modal-text-toggle"
              @click="lessonTextReveal = !lessonTextReveal"
            >
              {{ lessonTextReveal ? '隐藏翻译' : '显示翻译' }}
            </button>
            <button
              type="button"
              class="words-modal-close"
              aria-label="关闭"
              @click="closeLessonText"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                aria-hidden="true"
              ><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
        <div
          v-if="lessonTextLoading"
          class="words-text-status"
        >
          加载中…
        </div>
        <div
          v-else-if="lessonTextError"
          class="words-text-status err"
        >
          {{ lessonTextError }}
        </div>
        <div
          v-else
          class="words-nce-text"
          v-html="lessonTextHtml"
        />
      </div>
    </div>

    <div
      v-if="randOpen"
      class="words-modal-mask"
      @pointerdown.self="randMaskDown = true"
      @pointerup.self="onRandMaskUp"
      @pointercancel="randMaskDown = false"
    >
      <div
        class="words-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="words-rand-title"
        @click.stop
      >
        <div class="words-modal-head">
          <div class="words-modal-head-text">
            <h2 id="words-rand-title">
              随机练习
            </h2>
            <div class="sub">
              {{ randSub() }}
            </div>
          </div>
          <button
            type="button"
            class="words-modal-close"
            aria-label="关闭"
            @click="closeRand"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              aria-hidden="true"
            ><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <div class="actions">
          <button
            type="button"
            class="secondary"
            @click="toggleRandReveal"
          >
            {{ randReveal ? '隐藏翻译' : '显示翻译' }}
          </button>
          <button
            type="button"
            class="primary"
            @click="shuffleRand"
          >
            换一批
          </button>
        </div>
        <div style="display:grid;gap:8px">
          <div
            v-for="item in randItems"
            :key="randKey(item)"
            class="words-word word"
            :class="{ reveal: randReveal || randRevealSet.has(randKey(item)) }"
            @click="onRandCardClick(item)"
          >
            <button
              type="button"
              class="words-vbtn"
              :aria-label="`播放 ${item.w}`"
              @click.stop="audio.playTry(item.w)"
            />
            <div class="w-main">
              <div class="words-w-word">
                {{ item.w }}
                <span class="words-w-ph">{{ item.p }}</span>
                <span
                  style="display:inline-block;margin-left:4px;padding:1px 7px;border-radius:6px;background:var(--words-chip);font-size:11px"
                >第{{ item.g }}课</span>
              </div>
              <div class="w-me blur">
                {{ item.m }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { WordEntry } from '~/types/words'
import { formatGap, useWordsPage } from '~/composables/useWordsPage'
import { removeNavigationLoadingOverlay } from '~/composables/useNavigationLoading'
import '~/assets/styles/words.css'

definePageMeta({ ssr: false })

const appBuildId = useAppBuildId()

useHead({
  title: '新概念英语1-4册 · 词汇学习',
})

const tryWord = ref('')
const textMaskDown = ref(false)
const randMaskDown = ref(false)
const lockedScrollTop = ref(0)

function setBodyScrollLock(locked: boolean) {
  if (!import.meta.client) return
  const html = document.documentElement
  const body = document.body
  if (locked) {
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth
    lockedScrollTop.value = window.scrollY || window.pageYOffset || 0
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    body.style.position = 'fixed'
    body.style.top = `-${lockedScrollTop.value}px`
    body.style.left = '0'
    body.style.right = '0'
    if (scrollBarWidth > 0)
      body.style.paddingRight = `${scrollBarWidth}px`
  }
  else {
    html.style.overflow = ''
    body.style.overflow = ''
    body.style.position = ''
    body.style.top = ''
    body.style.left = ''
    body.style.right = ''
    body.style.paddingRight = ''
    window.scrollTo(0, lockedScrollTop.value)
  }
}

const {
  bk,
  bookPending,
  bookRestoring,
  bookSwitchLock,
  bookError,
  cur,
  q,
  quiz,
  onlyMaster,
  autoPlay,
  vType,
  chainGap,
  chainRepeat,
  playingWord,
  prefsOpen,
  prefsSummary,
  revealQuiz,
  lessonGroups,
  wordsRenderComplete,
  isLessonWordsVisible,
  lessonWordsGridStyle,
  matchCount,
  statLessons,
  statWords,
  railChips,
  gapStepDisabled,
  repeatStepDisabled,
  lessonTextOpen,
  lessonTextReveal,
  lessonTextLoading,
  lessonTextError,
  lessonTextTitle,
  lessonTextSub,
  lessonTextHtml,
  randOpen,
  randReveal,
  randItems,
  randRevealSet,
  audio,
  switchBook,
  pick,
  toggleMaster,
  isMastered,
  toggleQuizCard,
  setVoice,
  onOnlyMasterChange,
  openLessonText,
  closeLessonText,
  openRand,
  closeRand,
  shuffleRand,
  randSub,
  saveChainPrefs,
  cardKey,
} = useWordsPage()

function stepGap(dir: number) {
  chainGap.value = Math.round((chainGap.value + dir * 0.5) * 2) / 2
  chainGap.value = Math.max(0, Math.min(5, chainGap.value))
  saveChainPrefs()
}

function stepRepeat(dir: number) {
  chainRepeat.value = Math.max(1, Math.min(5, chainRepeat.value + dir))
  saveChainPrefs()
}

function trySpeak() {
  audio.playTry(tryWord.value)
}

function onWordClick(entry: WordEntry) {
  if (!quiz.value) return
  toggleQuizCard(cardKey(entry))
}

function randKey(item: WordEntry) {
  return `${item.l}_${item.w}`
}

function onRandCardClick(item: WordEntry) {
  const k = randKey(item)
  const next = new Set(randRevealSet.value)
  next.add(k)
  randRevealSet.value = next
}

function toggleRandReveal() {
  randReveal.value = !randReveal.value
}

function onTextMaskUp() {
  if (textMaskDown.value) closeLessonText()
  textMaskDown.value = false
}

function onRandMaskUp() {
  if (randMaskDown.value) closeRand()
  randMaskDown.value = false
}

function onDocClick() {
  prefsOpen.value = false
}

function onKeydown(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  if (lessonTextOpen.value) { closeLessonText(); return }
  if (randOpen.value) { closeRand(); return }
  prefsOpen.value = false
}

onMounted(() => {
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onKeydown)
  if (!bookPending.value) removeNavigationLoadingOverlay()
})

onUnmounted(() => {
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onKeydown)
  setBodyScrollLock(false)
})

watch(
  () => lessonTextOpen.value || randOpen.value,
  open => setBodyScrollLock(open),
)

watch(bookPending, (p) => {
  if (!p) removeNavigationLoadingOverlay()
}, { immediate: true })
</script>

<style scoped>
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}
</style>