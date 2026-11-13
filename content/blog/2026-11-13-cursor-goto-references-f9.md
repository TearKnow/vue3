---
title: Cursor 把「查看引用」绑到 F9（中键为什么不行）
description: Shift+F12 查引用不够顺手；Cursor / VS Code 无法用 keybindings 绑定鼠标中键，可用 F9 替代，或用 AutoHotkey 映射中键。
date: 2026-11-13
tags: [VS Code, Cursor, 快捷键]
---

## 现象

写代码时经常要看某个方法被哪里调用：右键 → **Go to References**，默认快捷键是 **Shift + F12**。

想改成**鼠标中键**一键查引用，在 `keybindings.json` 里写了 `middleclick`，结果没反应。

## 原因

Cursor / VS Code 的键盘快捷键体系**基本绑不了鼠标键**。

- `keybindings.json` 里的 `"key": "middleclick"` 通常无效
- 快捷键设置面板里按中键，也录不上
- VS Code 后来有 `editor.mouseMiddleClickAction`，主要是中键当「Ctrl+点击」（跳转定义），**不是** Go to References；Cursor 侧也不一定齐

所以：**不能指望只改配置就把「查引用」绑到中键。**

## 做法一：绑一个更好按的键（推荐）

打开用户快捷键文件：

`%APPDATA%\Cursor\User\keybindings.json`

（命令面板搜 `Preferences: Open User Keyboard Shortcuts (JSON)` 也可）

加上例如 **F9**：

```json
{
  "key": "f9",
  "command": "editor.action.goToReferences",
  "when": "editorHasReferenceProvider && editorTextFocus && !inReferenceSearchEditor && !isInEmbeddedEditor"
}
```

含义：

| 字段 | 作用 |
|------|------|
| `key` | 按 F9 触发 |
| `command` | 执行「转到引用」（和 Shift+F12 同一个命令） |
| `when` | 只在编辑器里、当前符号能提供引用时生效 |

用法：光标点在方法名 / 符号上 → 按 **F9** → 列出引用。

`Shift+F12` 仍然可用，只是多了一个更顺手的键。

## 做法二：真要中键，用 AutoHotkey（Windows）

系统层把「Cursor 窗口里的中键」转成 `Shift+F12`。

1. 安装 [AutoHotkey v2](https://www.autohotkey.com/)
2. 新建脚本，例如：

```ahk
#Requires AutoHotkey v2.0

#HotIf WinActive("ahk_exe Cursor.exe")
MButton::{
    MouseGetPos(, &y)
    ; 顶部标签栏保留中键关标签
    if (y < 100) {
        Click "Middle"
        return
    }
    Click          ; 先左键定位到符号
    Send "+{F12}"  ; Go to References
}
#HotIf
```

3. 双击运行；托盘有图标即生效。需要的话放进系统「启动」文件夹开机自启。

## 小结

| 目标 | 是否可行 | 怎么做 |
|------|----------|--------|
| 只改 Cursor 配置绑中键 | ❌ | keybindings 不支持 |
| 少按修饰键查引用 | ✅ | 绑 `F9`（或任意好按的键） |
| 中键查引用 | ✅（绕路） | AutoHotkey 映射 |

日常优先用 **F9** 就够了；只有特别依赖中键手感时再上 AHK。
