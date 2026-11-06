# words.html 词汇页增强 Implementation Plan

> **For agentic workers:** Implement task-by-task in `public/words.html` only.

**Goal:** 在 `public/words.html` 增加自定义发音、自动连播、课文滚动定位、随机 10 词弹框。

**Architecture:** 单文件增强；复用有道 `play` / `mkey` / localStorage；连播用 Audio.ended + 2s timeout 队列。

**Tech Stack:** 原生 HTML/CSS/JS（现有静态页）

## Global Constraints

- 仅改 `public/words.html`（样式/结构/脚本）
- 连播：从点击词起按 `#content .word` 顺序；ended 后再等 2s；试听/弹框发音不触发连播
- 左侧点课文：整册仍显示，滚动到 `#L{n}`，不再按课过滤
- 随机：当前册抽 10；释义默认藏；可标易忘；遮罩用 pointerdown/up.self
- 新样式用现有 `--paper` 等变量；弹框关闭不用仅 click.self

---

### Task 1: UI 壳子（试听、连播开关、随机按钮、弹框 DOM/CSS）

**Files:** Modify `public/words.html`

- [x] 搜索栏加试听 input + 播放按钮
- [x] controls 加「自动连播」checkbox、「随机练习」按钮
- [x] 加 modal mask + 面板骨架（列表容器、换一批、关闭）
- [x] 补 CSS（含 `.lesson { scroll-margin-top }`、弹框、试听条）

### Task 2: 发音与自动连播

**Files:** Modify `public/words.html` script

- [x] `stopChain` / `playOne` / `playMain`（主列表触发连播）/ 试听 `playTry`
- [x] 开关关闭时 pause + clearTimeout
- [x] 主列表 `vbtn` 改为 `playMain`

### Task 3: 左侧滚动定位

**Files:** Modify `public/words.html` script

- [x] `filtered()` 去掉按 `cur` 过滤单课
- [x] `pick(l)`：高亮 + scrollIntoView；`all` 回顶
- [x] `updateRail` / `numChip` 高亮逻辑保持

### Task 4: 随机练习弹框

**Files:** Modify `public/words.html` script

- [x] 抽词、渲染、揭示释义、星标复用 toggleMaster
- [x] 弹框内发音用 `playTry`（不连播）
- [x] 遮罩 pointerdown/up/cancel 关闭

### Task 5: 手测验收

- [x] JS syntax check 通过；四条验收请在浏览器点验
