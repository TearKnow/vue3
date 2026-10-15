---
title: PHPStorm 调试 PHP：Xdebug 配置与两种调试方式
description: 本机 PHP 8.4 安装 Xdebug 3.5.3，把 PHPStorm 调试端口改成 9133，并分清 Debug 当前文件和 Start Listening 监听外部请求。
date: 2026-10-15
tags:
  - PHPStorm
  - PHP
  - Xdebug
draft: false
pinned: false
---

工具栏上有两个调试入口。右边绿色的 **Debug** 由 PHPStorm 自己启动当前 PHP 文件；左边的 **Start Listening for PHP Debug Connections** 只负责监听，等外部 PHP 进程连回来。两边都要有 Xdebug，而且要装在真正执行代码的那个 PHP 上。图标是一只甲虫，菜单名以上面这两个为准。

停住之后看值的方式一样：下面 **Debug** 面板的 **Variables** 里是当前函数的参数和局部变量，鼠标悬停在变量上也能看。

## 环境

这台机器上有两套 PHP，不要混：

| 用途 | PHP | Xdebug |
| --- | --- | --- |
| **Debug**，调试单个文件 | `D:\php-8.4.26-Win32-vs17-x64\php.exe`（ZTS、VS17、64 位） | 已装 3.5.3 |
| 网站 `http://demo.jack.com` | Docker 里的 php-fpm，PHP 7.0.33 | 没装 |

命令行直接敲 `php` 找到的是 `D:\php-7.3.0-Win32-VC15-x64\php.exe`，PHPStorm 不会自动改用 8.4，要在设置里指定。

## 1. 给 PHP 8.4 装 Xdebug

PHP 8.4.26 是线程安全、VS17、64 位，对应的包是：

[php_xdebug-3.5.3-8.4-ts-vs17-x64.zip](https://windows.php.net/downloads/pecl/releases/xdebug/3.5.3/php_xdebug-3.5.3-8.4-ts-vs17-x64.zip)

解压出 `php_xdebug.dll`，放到：

`D:\php-8.4.26-Win32-vs17-x64\ext\php_xdebug.dll`

这份 PHP 原来没有 `php.ini`。在同一目录新建 `php.ini`：

```ini
[PHP]
extension_dir = "ext"

[xdebug]
zend_extension = xdebug
xdebug.mode = debug
xdebug.start_with_request = trigger
xdebug.client_host = 127.0.0.1
xdebug.client_port = 9133
```

`trigger` 表示只有调试触发时才连 IDE，平时直接跑脚本不会去等 PHPStorm。

确认加载成功：

```powershell
& "D:\php-8.4.26-Win32-vs17-x64\php.exe" -v
```

输出里应有 `with Xdebug v3.5.3`。

## 2. 改 PHPStorm

### 解释器改成 8.4

**Settings → PHP → CLI Interpreter**，点 **...**，再点 **+** → **Other Local...**，PHP executable 选：

`D:\php-8.4.26-Win32-vs17-x64\php.exe`

选中后，CLI Interpreter 显示 **PHP 8.4 (8.4.26)**。**Debug** 才会用这份带 Xdebug 的 PHP。

### 调试端口改成 9133

**Settings → PHP → Debug**，找到上面的 **Xdebug**，不是下面的 **Zend Debugger**。

原来的 Debug port 是：

```text
9003,9000,3227,3385
```

整段换成 `9133`，只留这一个，和 `php.ini` 里的 `xdebug.client_port` 一致。

下面 Zend Debugger 的 `10137` 不用动。那是另一种调试器。

### 为什么不能用 9003

9003 是 Xdebug 3 的默认端口，但这台 Windows 把一段端口划给了 Docker / Hyper-V，程序绑不上去。`netsh interface ipv4 show excludedportrange protocol=tcp` 能看到，其中有：

- `7939–8038`（含 8000）
- `8039–8138`（含 8080）
- `8953–9052`（含 9000 和 9003）

所以一点 **Debug** 就提示 `Port 9003 specified in settings is busy`，然后临时挑一个空端口，比如 3631、13243。这个数字每次都会变，**不要写进 `php.ini`**。两边固定用 **9133**。

## 3. Debug：调试单个文件

适合能直接跑起来的脚本，比如 `D:\www\test\webp.php`。只有类、没有入口的文件（例如一个 Bean）点了只会加载完就结束，进不到方法里。

1. 在会执行到的行号左边点出红点。
2. 右上角下拉框选 **Current File**。
3. 点工具栏上的 **Debug**。不要同时开 **Start Listening**，避免它占住 9133。
4. 停住后用下面三个按钮往下走。

| 按钮 | 快捷键 | 作用 |
| --- | --- | --- |
| 箭头跨过一行（Step Over） | F8 | 执行当前行，不进入里面调用的函数 |
| 箭头向下（Step Into） | F7 | 进入当前行调用的函数，进去后能看到它的参数 |
| 箭头向上（Step Out） | Shift+F8 | 跑完当前函数，回到调用它的地方 |

继续跑到下一个断点是 **F9**。要临时算一个表达式，按 **Alt+F8**。

## 4. Start Listening：等外部请求连过来

**Start Listening for PHP Debug Connections** 不执行任何文件，只让 PHPStorm 在 **9133** 上等待。点亮之后，菜单项会变成 **Stop Listening for PHP Debug Connections**。

浏览器打开 `http://demo.jack.com/webp.php` 不会停住。这个域名在容器里执行，容器中的 PHP 7.0 没有 Xdebug，请求跑完也不会连回 PHPStorm。不改容器的话，网站这条链路测不了这种方式。

可以用本机 PHP 8.4 起一个临时站点来测。8080 在保留段里，绑不上，用 **8282**：

1. 在 `D:\www\test\webp.php` 里打断点。
2. 点 **Start Listening for PHP Debug Connections**。不要点 **Debug**。
3. 启动临时站点：

```powershell
& "D:\php-8.4.26-Win32-vs17-x64\php.exe" -S 127.0.0.1:8282 -t D:\www\test
```

4. 浏览器打开 `http://127.0.0.1:8282/webp.php?XDEBUG_TRIGGER=1`。

`XDEBUG_TRIGGER=1` 对应 `php.ini` 里的 `start_with_request = trigger`。连上之后会停在断点，**Variables** 里能看到 `$x`、`$b`。测完在 PowerShell 里按 `Ctrl+C` 关掉临时站点。

要调试真正的 `demo.jack.com`，必须在跑这个网站的 php-fpm 里装 Xdebug。PHP 7.0 只能用 Xdebug 2，配置项是 `xdebug.remote_port`，并且要连回 Windows 宿主机的 **9133**。这次没有改容器。
