---
title: yt-dlp 用的是哪个 Python？head -1 $(which yt-dlp)
description: 一行命令看 yt-dlp 绑定的 Python 版本，以及从 3.10 迁移到 3.12 时的卸载与重装。
date: 2026-08-15
tags: [macOS, Python, Homebrew]
---

升级 Python 之后，`yt-dlp` 可能还在用旧解释器，或者你根本不确定它是哪个 `pip` 装的。可以先跑一行命令查清楚，再按对应 Python 卸载、用新版本重装。

## 先说结论

```bash
head -1 $(which yt-dlp)
```

看的是 **yt-dlp 脚本第一行（shebang）**，也就是它**实际会调用哪个 Python**。

若显示 `python3.10`，说明当前 `yt-dlp` 绑在 3.10 上；要换 3.12，得用 **3.10 的 pip 卸载**，再用 **3.12 的 pip 安装**——不能混用。

---

## 这行命令什么意思？

拆开看：

| 部分 | 作用 |
|------|------|
| `which yt-dlp` | 查 `yt-dlp` 可执行文件在哪，例如 `/opt/homebrew/bin/yt-dlp` |
| `$(...)` | 命令替换：把路径当作参数传给外层命令 |
| `head -1` | 只读文件**第一行** |

`pip install yt-dlp` 装出来的通常是一个 Python 脚本，第一行类似：

```text
#!/opt/homebrew/opt/python@3.10/bin/python3.10
```

或：

```text
#!/opt/homebrew/opt/python@3.12/bin/python3.12
```

所以这一行就是在问：**我敲 `yt-dlp` 时，背后跑的是哪个 Python？**

完整自查可以顺手做：

```bash
which yt-dlp
head -1 $(which yt-dlp)
yt-dlp --version
```

---

## 为什么要用「装它的那个 Python」来卸载？

`pip` 是按 **Python 环境** 管理包的。3.10 装的 `yt-dlp` 在 3.10 的 site-packages 里；3.12 是另一套目录。

若只改了 PATH、或直接用 3.12 的 pip 再装一遍：

- 旧文件可能还在 `/opt/homebrew/bin/yt-dlp`，shebang 仍指向 3.10
- 或者两个版本叠在一起，行为怪异

正确做法：**谁装的，谁卸；再用新 Python 装。**

---

## 从 Python 3.10 迁到 3.12

### 1. 确认当前绑定（可选）

```bash
head -1 $(which yt-dlp)
# 若已是 python3.12，不必再迁
```

### 2. 用 3.10 卸载

```bash
/opt/homebrew/bin/python3.10 -m pip uninstall yt-dlp
```

用 `python3.10 -m pip` 而不是裸 `pip`，避免卸错环境。提示确认时输入 `y`。

### 3. 用 3.12 安装

Homebrew 的 Python 3.12 可能报 `externally-managed-environment`，需加：

```bash
/opt/homebrew/bin/python3.12 -m pip install --break-system-packages -U yt-dlp
```

| 参数 | 含义 |
|------|------|
| `-m pip` | 明确使用 3.12 自带的 pip |
| `--break-system-packages` | 允许装进 Homebrew 管理的 Python（CLI 工具常用） |
| `-U` | 装最新版 |

### 4. 验证

```bash
head -1 $(which yt-dlp)
# 期望：#!/opt/homebrew/opt/python@3.12/bin/python3.12

yt-dlp --version
```

第一行已是 `python3.12`，说明迁移成功。

---

## 关于 `--break-system-packages`

Python 3.11+ 默认不让 `pip` 直接往「系统/Homebrew 级」环境里装包，怕和系统工具冲突。

对 **`yt-dlp` 这类全局 CLI**，用 Homebrew Python 时加 `--break-system-packages` 是常见做法。若介意，可以改用虚拟环境或 `brew install yt-dlp`（走 Homebrew 公式，不经过 pip）。

---

## 小结

- `head -1 $(which yt-dlp)`：看 **yt-dlp 用的是哪个 Python**（读脚本 shebang）。
- 从 3.10 换到 3.12：**3.10 卸载 → 3.12 安装**，并再次 `head -1` 确认 shebang 已变。
- 装包命令写全路径最稳：`/opt/homebrew/bin/python3.12 -m pip install ...`，不会和 PATH 里别的 Python 搞混。
