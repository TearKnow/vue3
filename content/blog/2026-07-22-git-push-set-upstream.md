---
title: git push -u、origin、upstream 分别是什么？
description: 解释 git push -u、origin 远程别名，以及 fork 场景下 origin / upstream 多个 remote 是怎么回事。
date: 2026-07-22
tags: [Git]
---

先说结论：

- `-u` 全称是 `--set-upstream`
- 作用是建立「本地分支 ↔ 远程分支」的追踪关系
- `origin` 是远程仓库的默认别名，不是什么神秘关键字
- **首次推送建议加上 `-u`**；绑定之后，日常直接 `git push` / `git pull` 就行

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

## origin 是什么？为什么要有它

Git 是分布式的：你电脑上有一份完整仓库，GitHub / GitLab 上也有一份。推送、拉取时，Git 必须知道「对哪一台远程仓库说话」。

远程仓库地址往往很长，例如：

```bash
git push https://github.com/you/project.git main
```

每次都写 URL 又长又容易写错，所以 Git 允许给远程起一个短名字。`clone` 或第一次添加远程时，默认通常就叫 `origin`（来源 / 起源）：

```bash
git remote add origin https://github.com/you/project.git
```

之后就可以简写：

```bash
git push origin main
```

因此：

| 写法 | 实际指向 |
|------|----------|
| `origin` | 远程仓库的名字（别名），不是命令 |
| `origin/main` | 这个远程上的 `main` 在本地的镜像引用 |
| `[origin/main]` | 当前本地分支的上游设成了它 |

想确认 `origin` 对应哪个地址：

```bash
git remote -v
```

会看到类似：

```text
origin  https://github.com/you/project.git (fetch)
origin  https://github.com/you/project.git (push)
```

补充：`origin` 只是约定俗成的默认名，不是硬性规定。你也可以叫 `github`、`upstream`、`company`。

## 什么时候会有多个 remote（origin + upstream）

最典型的场景是：**你 fork 了别人的仓库，自己改，再提 PR**。

1. 在 GitHub 上 fork 原作者仓库 → 你账号下多了一份副本
2. `clone` 自己的副本 → 默认远程叫 `origin`（指向你的 fork）
3. 为了能拉到原作者的最新代码，再加一个远程，习惯叫 `upstream`：

```bash
git remote add upstream https://github.com/原作者/项目.git
```

这时本地就有两个远程：

| 名字 | 通常指向 | 你拿它干什么 |
|------|----------|--------------|
| `origin` | 你自己的 fork | `push` 自己的改动、开 PR |
| `upstream` | 原作者仓库 | `fetch` / `pull` 同步官方最新代码 |

`git remote -v` 大概会是：

```text
origin    https://github.com/你/项目.git (fetch)
origin    https://github.com/你/项目.git (push)
upstream  https://github.com/原作者/项目.git (fetch)
upstream  https://github.com/原作者/项目.git (push)
```

日常用法示例：

```bash
# 拉官方最新
git fetch upstream
git merge upstream/main
# 或：git rebase upstream/main

# 推到自己的 fork
git push origin my-feature
```

然后在 GitHub 上从你的 fork 向原作者仓库提 Pull Request。

有两个 remote 时，分支也要写清楚来源：

- `origin/develop` → 你 fork 上的 develop
- `upstream/develop` → 官方仓库上的 develop

两者不一定一样。只写 `develop`，工具可能猜错你要哪边；写全 `origin/develop` / `upstream/develop` 就不会混。

（公司内也可能 `origin` 推内部 GitLab、另加 `mirror` / `github` 做镜像，道理相同：一个本地仓库可以关联多台远程。）

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

常见输出类似：

```text
main  bf1737a  [origin/main]
```

可以拆成：本地分支名 `main` → 当前提交短哈希 `bf1737a` → 上游 `[origin/main]`（远程 `origin` 上的 `main`）。

## 配套：改名 + 首次推送

新建仓库后，如果本地还叫 `master`，而远程想用 `main`，常见两步：

```bash
git branch -M main          # 本地分支改名 master → main
git push -u origin main     # 推到远程 main，并建立追踪
```

做完这两步，本地 `main` 就和 `origin/main` 绑在一起了。

## 一句话

`origin` = 远程仓库的默认短名；`-u` = 设置上游追踪。**首次推送建议加上 `-u`**，绑定后以后直接 `git push` / `git pull` 即可。
