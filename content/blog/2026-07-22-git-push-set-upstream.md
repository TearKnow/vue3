---
title: git push -u 是干什么的？
description: 解释 git push -u / --set-upstream：本地分支如何绑定远程上游，以及为什么首次推送建议加上 -u。
date: 2026-07-22
tags: [Git]
---

先说结论：

- `-u` 全称是 `--set-upstream`
- 作用是建立「本地分支 ↔ 远程分支」的追踪关系
- **首次推送建议加上**；绑定之后，日常直接 `git push` / `git pull` 就行

## 直白一点

Git 需要知道：你本地这个分支，对应远程仓库的哪一个分支。

`-u` 就是一次性把这件事说清楚，例如：

```bash
git push -u origin main
```

拆开看：

| 部分 | 含义 |
|------|------|
| `origin` | 远程仓库的默认别名 |
| `main` | 把本地 `main` 推到远程的 `main` |
| `-u` | 同时绑定两者的上游追踪关系 |

没有这层绑定，Git 就不知道你下次说的「推一下 / 拉一下」到底对谁操作。

## 加 -u 和不加 -u

### 第一次推送时加上 `-u`

```bash
git push -u origin main
```

之后同一分支上，可以简写：

```bash
git push
git pull
```

### 首次推送不加 `-u`

只执行：

```bash
git push origin main
```

代码照样能上传，但**不会建立追踪关系**。下次还得写全：

```bash
git push origin main
git pull origin main
```

此时如果直接敲 `git push`，Git 往往会提示当前分支没有上游，让你先设置或写完整命令。

## 补充几点

- 一个本地分支同一时间只绑定一个远程上游分支
- 已经绑定过，再次推送**不必**重复加 `-u`；重复加一般也无害，只是没必要
- 查看当前分支追踪谁：

```bash
git branch -vv
```

输出里能看到类似 `[origin/main]` 的标记，就是上游。

## 配套：改名 + 首次推送

新建仓库后，如果本地还叫 `master`，而远程想用 `main`，常见两步：

```bash
git branch -M main          # 本地分支改名 master → main
git push -u origin main     # 推到远程 main，并建立追踪
```

做完这两步，本地 `main` 就和 `origin/main` 绑在一起了。

## 一句话

`-u` = 设置上游追踪；**首次推送建议加上**，绑定后以后直接 `git push` / `git pull` 即可。
