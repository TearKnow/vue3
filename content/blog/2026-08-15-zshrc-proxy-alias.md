---
title: macOS .zshrc 里的 proxy 别名是干什么的？
description: 用 alias 在终端一键开关代理：http_proxy、SOCKS5、Clash Verge 端口，以及 no_proxy 常见误配。
date: 2026-08-15
tags: [macOS, Shell, 代理]
---

在 macOS 上，终端默认**不会**走系统设置里的 VPN / 代理。你在 Clash Verge 或 Clash 里开了「系统代理」，浏览器可能能上 Google，但 `curl`、`git clone`、`npm install`、`pnpm`、`pip` 往往还是直连——因为它们读的是**环境变量**，不是 macOS 的网络面板。

所以在 `~/.zshrc` 里写几组 `alias`，需要代理时在终端敲一个词就行，比每次手打一长串 `export` 省事。

## 先说结论

| 命令 | 作用 |
|------|------|
| `proxyVerge` | 把当前终端会话的代理指到 **127.0.0.1:7897**（常见于 Clash Verge 的 SOCKS 端口） |
| `proxy` | 同上，端口改为 **7890**（很多 Clash / ClashX 默认 SOCKS 端口） |
| `unproxy` | 取消上述所有代理环境变量，恢复直连 |

这三个命令**只影响当前这个终端窗口**（及其子进程），不会改系统全局设置；关掉窗口或新开一个 Tab，除非再次执行 alias，否则不会带代理。

---

## alias 是什么？

`alias` 是 Shell 的「快捷命令」：给一长串命令起一个短名字。

```bash
alias proxy="export http_proxy=..."
```

之后输入 `proxy`，Shell 会替你把里面那串 `export` 全部执行一遍。写在 `~/.zshrc` 里，是为了**每次打开终端自动加载**这些别名。

---

## 每一行 export 在说什么？

### `http_proxy` / `HTTP_PROXY`

告诉支持代理的程序：**HTTP 请求**走哪条代理。例如 `curl http://example.com`、`npm` 部分请求会读这个变量。

### `https_proxy` / `HTTPS_PROXY`

同上，针对 **HTTPS** 请求。很多 CLI 两个都会读，所以一般会成对设置。

### `all_proxy` / `ALL_PROXY`

「兜底」代理：有些工具不区分 http/https，只认 `all_proxy`。协议这里写的是 `socks5://`，表示走 **SOCKS5** 代理（Clash 系客户端很常用）。

### `no_proxy` / `NO_PROXY`

**不走代理**的主机列表，例如 `localhost,127.0.0.1,192.168.0.0/16`。访问这些地址时会直连，避免本地服务、内网 IP 也被塞进代理绕一圈。

> ⚠️ 若把 `no_proxy` 也设成 `socks5://127.0.0.1:7890`，多半是复制粘贴时写错了——它应该是域名/IP 列表，不是代理地址。更合理的写法例如：
>
> ```bash
> export no_proxy="localhost,127.0.0.1,::1"
> export NO_PROXY="localhost,127.0.0.1,::1"
> ```

### 为什么大小写各写一遍？

历史原因：不同程序认不同写法。`curl` 通常大小写都行；有些老工具只认大写或小写。两套都 `export`，兼容性最好，多写几行不碍事。

### `127.0.0.1:7897` 和 `7890` 是什么？

- `127.0.0.1`：本机回环地址，代理客户端跑在你电脑上，监听本地端口。
- **7897**：Clash **Verge** 里常见的 SOCKS 端口（以你客户端设置为准）。
- **7890**：经典 Clash / ClashX 等里更常见的 SOCKS 端口。

两个 alias 的区别 essentially 就是：**你当前开的是哪款客户端、SOCKS 监听在哪个端口**，就执行对应那条。

在 Clash Verge 里可在 **设置 → 端口**（或类似入口）确认 SOCKS 端口，和 `.zshrc` 里保持一致即可。

---

## 完整配置长什么样？

```bash
alias proxyVerge="
    export http_proxy=socks5://127.0.0.1:7897;
    export https_proxy=socks5://127.0.0.1:7897;
    export all_proxy=socks5://127.0.0.1:7897;
    export HTTP_PROXY=socks5://127.0.0.1:7897;
    export HTTPS_PROXY=socks5://127.0.0.1:7897;
    export ALL_PROXY=socks5://127.0.0.1:7897;
    export no_proxy=localhost,127.0.0.1,::1;
    export NO_PROXY=localhost,127.0.0.1,::1;"

alias proxy="
    export http_proxy=socks5://127.0.0.1:7890;
    export https_proxy=socks5://127.0.0.1:7890;
    export all_proxy=socks5://127.0.0.1:7890;
    export HTTP_PROXY=socks5://127.0.0.1:7890;
    export HTTPS_PROXY=socks5://127.0.0.1:7890;
    export ALL_PROXY=socks5://127.0.0.1:7890;
    export no_proxy=localhost,127.0.0.1,::1;
    export NO_PROXY=localhost,127.0.0.1,::1;"

alias unproxy="
    unset http_proxy;
    unset https_proxy;
    unset all_proxy;
    unset no_proxy;
    unset HTTP_PROXY;
    unset HTTPS_PROXY;
    unset ALL_PROXY;
    unset NO_PROXY"
```

上面把 `no_proxy` 改成了更常见的写法；若你本地就是抄的 socks5 地址，建议按此修正。

---

## 怎么用？

1. 先确保 Clash / Clash Verge **已启动**，且 SOCKS 端口与 alias 一致。
2. 打开终端，执行：
   - 用 Verge：`proxyVerge`
   - 用 7890 那套：`proxy`
3. 验证是否生效：

```bash
curl ifconfig.me
```

4. 不需要代理了：`unproxy`

改完 `~/.zshrc` 后执行 `source ~/.zshrc`，或新开一个终端窗口，别名才会生效。

---

## 和「系统代理」的关系

| 方式 | 影响范围 | 典型场景 |
|------|----------|----------|
| macOS / Clash「系统代理」 | 遵守系统代理设置的应用（多为浏览器） | 日常上网 |
| 终端环境变量 `http_proxy` 等 | 当前 Shell 及其子进程（CLI 工具） | `git`、`npm`、`curl`、`brew` 等 |

两者互不替代：浏览器能翻墙，不代表终端也能。反过来，只在终端里 `proxy`，浏览器也不会自动跟着变。

---


## 小结

`.zshrc` 里的 `proxyVerge`、`proxy`、`unproxy` 是一套**终端专用、一键开关**的代理方案：通过环境变量把 HTTP/HTTPS/SOCKS 流量指到本机 Clash 端口，并可用 `unproxy` 清掉。记住三点就够——**CLI 不读系统代理、端口要和客户端一致、`no_proxy` 是例外列表不是代理地址**——以后终端拉包、clone 海外仓库会少踩很多坑。
