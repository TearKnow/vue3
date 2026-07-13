---
title: VS Code / Cursor 的 Compact Folders 是什么？怎么关掉
description: 记录资源管理器里「单链子目录被压成一行」的现象，以及 explorer.compactFolders 的关闭方法
date: 2026-07-13
tags: [VS Code, Cursor]
---

## 现象

在 VS Code 或 Cursor 左侧资源管理器里，有时会看到目录不是一层层展开，而是被压成一行路径：

```
src/components/Button
  index.vue
```

而实际文件结构是：

```
src/
  components/
    Button/
      index.vue
```

中间那些**只有一个子文件夹**的层级不会单独占一行，而是合并进父级路径字符串里。这就是 **Compact Folders**（紧凑文件夹）的效果。

常见影响：

- 不容易一眼看出真实目录深度
- 展开时感觉「跳过了几层文件夹」
- 想单独操作中间某一层（比如只展开 `components`）时不太直观
- 深层单链目录（如 `a/b/c/d/e`）路径较长时更难读

这个功能默认是开启的，本意是减少无意义的嵌套展示，让树更紧凑。但如果你更习惯看到完整层级，关掉会更清晰。

## 怎么关

### 方法一：设置界面

1. 打开设置：`Ctrl + ,`（macOS 为 `Cmd + ,`）
2. 搜索 `Compact Folders` 或 `紧凑文件夹`
3. 取消勾选 **Explorer: Compact Folders**

### 方法二：settings.json

在用户设置或工作区 `.vscode/settings.json` 里添加：

```json
{
  "explorer.compactFolders": false
}
```

改完后会立即生效，一般不用重启。

关闭后，即使某层目录只有一个子文件夹，也会逐层展开显示：

```
src
  components
    Button
      index.vue
```

## Cursor 也一样

Cursor 基于 VS Code，设置项名称和行为完全一致，同样是 `explorer.compactFolders`。

## 小结

| 项目 | 说明 |
|------|------|
| 设置项 | `explorer.compactFolders` |
| 默认值 | `true`（开启） |
| 开启效果 | 单链子目录合并为一行路径 |
| 关闭效果 | 每层目录单独展示 |

如果你发现侧边栏目录结构和磁盘上的真实层级对不上，先检查这一项。
