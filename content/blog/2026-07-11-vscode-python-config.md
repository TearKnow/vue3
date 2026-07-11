---
title: VS Code 中配置 Python 开发环境
description: 配置 autopep8 自动格式化 + 自定义快捷键一键运行 Python 脚本
date: 2026-07-11
tags: [VS Code, Python]
---

## 1. 保存时自动格式化代码

### 安装 autopep8，同时需要安装python扩展

首先VS Code中安装 `autopep8` 扩展：


### 配置 VS Code

打开 VS Code 设置（`Cmd + ,`），搜索 `format on save`，勾选 **Editor: Format On Save**。


> **注意**：需要确保已安装 VS Code 的 **Python** 扩展

配置完成后，每次保存 `.py` 文件时，autopep8 会自动按照 PEP 8 规范格式化代码。

---

## 2. 设置自定义运行快捷键

默认运行 Python 文件操作比较繁琐。可以通过自定义快捷键一键运行。

### 操作步骤

1. 按 `Cmd + Shift + P`，搜索 **Open Keyboard Shortcuts**
2. 在快捷键设置界面搜索 `run python file`
3. 找到 **Run Python File** 这一项，双击
4. 按下你想要设置的快捷键组合，比如 `Cmd + R`
5. 按回车确认


> 如果 `Cmd + R` 与其他命令冲突（比如浏览器刷新），可以选择 `Cmd + Shift + R` 或其他组合键。

---

## 小结

两条配置花不了几分钟，配好之后写 Python 脚本会更顺手：自动格式化不用手动调缩进，一键运行不用老点右键，日常用起来舒服很多。
