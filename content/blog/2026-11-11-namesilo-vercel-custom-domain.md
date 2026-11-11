---
title: NameSilo 域名接到 Vercel
description: 域名已在 NameSilo、站点在 Vercel 时，如何加自定义域名
date: 2026-11-11
tags: [Vercel, NameSilo]
draft: false
pinned: false
---

域名已经在 NameSilo 买好，站点已经部署在 Vercel。接下来只需要把 DNS 指到 Vercel，等面板显示配置正确并自动签好 SSL。下面以根域名 `xxxx.top`、以及可选的 `www.xxxx.top` 为例。

**原则**：Nameserver 继续用 NameSilo 自己的；不要启用 Vercel DNS。只在 NameSilo 里按 Vercel 要求增删记录。

---

## 一、Vercel：添加域名并记下记录值

目标：加上域名，等到 **Valid Configuration**，再等 SSL 签好。

1. 进入项目 → **Settings** → **Domains**。
2. 添加 `xxxx.top`（若尚未添加）。
3. 建议同时添加 `www.xxxx.top`（和后面的 CNAME 配套）。
4. 记下 Vercel 给出的值（**以当前面板为准**，不要死记别人的 IP）：
   - 根域名 `xxxx.top`：需要一条 **A 记录**，Value 是面板给出的 IP（以当时显示为准，不要抄别人博客里的旧地址）。
   - `www`：需要一条 **CNAME**，Target 是一串**专属字符串**——原样复制，不要改成通用的 `cname.vercel-dns.com`。
5. 看每个域名旁的状态：
   - **Valid Configuration** = DNS 已对上。
   - 仍是 **Invalid** = 回 NameSilo 核对：记录类型/Host/值是否填对，停放页等旧记录是否已删干净。
6. 等 Vercel **自动签发 SSL**。状态变绿后，用浏览器打开 `https://xxxx.top`，确认能打开且地址栏有锁标志。

面板里若出现 **Vercel DNS** 相关选项：**忽略，不要启用**。DNS 继续由 NameSilo 管。

---

## 二、NameSilo：只留 Vercel 需要的记录

目标：删掉注册商停放页留下的旧 A 记录，只保留 Vercel 要的 `@` A 和（可选）`www` CNAME。

1. 登录 NameSilo → **Domain Manager** → 找到 `xxxx.top` → 点地球图标进入 **DNS 管理**。
2. **删除所有旧的停放 A 记录**。常见情况是 `@`、`www` 下还有多条指向注册商停放 IP（例如 `172.232.x.x`）的 A——这类全部删掉，否则容易和 Vercel 的 A 冲突，一直 Invalid。
3. 确认根域名 **A** 记录：

| 项    | 值                               |
| ----- | -------------------------------- |
| Type  | A                                |
| Host  | `@`                              |
| Value | Vercel Domains 面板显示的那个 IP |
| TTL   | `3600`（或面板默认）             |

4. 若需要 `www.xxxx.top` 也能访问，再确认 **CNAME**：

| 项              | 值                                      |
| --------------- | --------------------------------------- |
| Type            | CNAME                                   |
| Host            | `www`                                   |
| Target Hostname | Vercel 给你的那串专属字符串（原样粘贴） |
| TTL             | 默认即可                                |

5. **不要动** `_domainconnect` 那条 TXT：它不影响 Vercel。
6. **不要改 Nameserver**：继续用 NameSilo 的 DNS；同样不要启用 Vercel DNS。

改完后回到 Vercel Domains 刷新状态；DNS 传播通常几分钟到几十分钟，偶尔更久。

---
