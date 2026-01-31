---
title: 给 steamdeck 配置开发环境
date: 2026-02-01 02:34:19
tags: 
 - Steamdeck
 - Linux
 - ArchLinux
categories: 
 - [Linux 运维]
excerpt: "这东西简直就是个便携 linux 服务器！"
---

**这东西简直就是个便携 linux 服务器！**

本文记录笔者在 steamdeck 上配置 gcc 编译环境时的经验。

发行版是 archlinux，魔改为 steamos，文章面向有 linux 使用基础但不熟悉 archlinux 的读者，不过大概也只有包管理器的差别。

# 1. 准备工作

先设置密码，否则sudo不能用

```sh
passwd
```

看一下 steamdeck 的分区结构，可以看到根目录的分区只有5GB空间，而且已经用掉了70%，仅剩下1.5GB的操作空间，这就要求我们只能用pacman安装最重要的软件包，不能一股脑地全部都用 pacman 安装。（这里不讨论改 pacman 安装目录的方法，可以预见地，引入的问题会比解决的问题要多得多。）

```sh
(1)(deck@steamdeck ~)$ lsblk
NAME        MAJ:MIN RM   SIZE RO TYPE MOUNTPOINTS
zram0       254:0    0   7.2G  0 disk [SWAP]
nvme0n1     259:0    0 476.9G  0 disk 
├─nvme0n1p1 259:1    0    64M  0 part 
├─nvme0n1p2 259:2    0    32M  0 part 
├─nvme0n1p3 259:3    0    32M  0 part 
├─nvme0n1p4 259:4    0     5G  0 part /
├─nvme0n1p5 259:5    0     5G  0 part 
├─nvme0n1p6 259:6    0   256M  0 part /var
├─nvme0n1p7 259:7    0   256M  0 part 
└─nvme0n1p8 259:8    0 466.3G  0 part /var/tmp
                                      /var/log
                                      /var/lib/systemd/coredump
                                      /var/lib/steamos-log-submitter
                                      /var/lib/flatpak
                                      /var/lib/docker
                                      /var/cache/pacman
                                      /opt
                                      /nix
                                      /srv
                                      /root
                                      /home
(deck@steamdeck ~)$ df -h
Filesystem      Size  Used Avail Use% Mounted on
dev             7.3G     0  7.3G   0% /dev
run             7.3G  2.1M  7.3G   1% /run
efivarfs        148K   11K  133K   8% /sys/firmware/efi/efivars
/dev/nvme0n1p4  5.0G  3.5G  1.5G  70% /
/dev/nvme0n1p6  230M   34M  180M  16% /var
overlay         230M   34M  180M  16% /etc
tmpfs           7.3G  277M  7.0G   4% /dev/shm
tmpfs           1.0M     0  1.0M   0% /run/credentials/systemd-journald.service
tmpfs           1.0M     0  1.0M   0% /run/credentials/systemd-resolved.service
/dev/nvme0n1p8  458G   62G  396G  14% /home
tmpfs           7.3G  7.3M  7.3G   1% /tmp
tmpfs           1.5G  4.1M  1.5G   1% /run/user/1000
```

关闭 steamos rootfs 写保护（rootfs 是根目录分区，pacman 安装的软件包都会放在 `/usr` ；总共只有5GB的空间！总共只有5GB的空间！）

```
sudo steamos-readonly disable
```

导入 pacman 证书，否则什么也装不了

```sh
sudo pacman-key --init
sudo pacman-key --populate archlinux
sudo pacman-key --populate holo
```

或者直接使用 `sudo steamos-devmode` ，也能做完上述命令做的事情

```sh
(1)(deck@steamdeck ~)$ sudo steamos-devmode 
[sudo] password for deck: 
Usage: steamos-devmode enable|status [--no-prompt]

A helper script to enable developer mode on SteamOS
  - Disables read-only mode.
  - Populates the pacman keyring.

--no-prompt
  Skips interactive confirmation

If you wish to re-enable readonly mode after using this script, you can use the
"steamos-readonly enable" command.  This does not undo changes performed
while in dev mode.

See also `steamos-unminimize`
```

**注意！**这里不要使用 `steamos-unminimize` 配置环境，因为这个命令安装的软件包所需要的空间会比1.5GB要多，建议按照文章手动配置。

监听 ssh 连接

```sh
sudo systemctl start sshd
```

# 2. 编译环境搭建

update 一下

```sh
sudo pacman -Syyy
```

实用工具（可选，等编译环境搭建好就可以自己编译一个）

```sh
sudo pacman -S gnu-netcat
```

安装 gcc

```sh
sudo pacman -S gcc
```

此时，gcc 还不能编译包含了 C/C++ 头文件的源文件，steamos 默认是没有带上这些头文件的，glibc 依赖也是坏的，这里需要手动安装一下

> Basic tools to build Arch Linux packages

```sh
sudo pacman -S base-devel
```

修复 glibc 并安装 C/C++ 头文件

```sh
sudo pacmam -S glibc linux-api-headers
```

现在基本的依赖已经有了，写个 C++ 代码验证一下环境

# 3. 验证

```cpp
/* test.cpp */

#include <iostream>
#include <string>
#include <string_view>
#include <functional>

// test for C++11
using Caller = std::function<void(std::string_view)>;
template <typename ...Args>
void call(Args &&...args) {
  // test for C++14
  static Caller f = [](auto s) {
    std::cout << s << '\n';
  };
  f(std::forward<std::string_view>(args...));
}

int main() {
  // test for STL
  std::string s = "hello steamos";
  // test for C++17
  call(s);

  return 0;
}
```

```sh
(deck@steamdeck ~)$ vim test.cpp 
(deck@steamdeck ~)$ g++ test.cpp 
(deck@steamdeck ~)$ ./a.out 
hello steamos
```

看起来 C++17 是能编译过的，基本的构建环境已经具备了。

看一下此时的 rootfs 还有多少空间，大约用掉了 200MB

```sh
Filesystem      Size  Used Avail Use% Mounted on
dev             7.3G     0  7.3G   0% /dev
run             7.3G  2.1M  7.3G   1% /run
efivarfs        148K   11K  133K   8% /sys/firmware/efi/efivars
/dev/nvme0n1p4  5.0G  3.6G  1.3G  74% /
/dev/nvme0n1p6  230M   34M  180M  16% /var
overlay         230M   34M  180M  16% /etc
tmpfs           7.3G  273M  7.0G   4% /dev/shm
tmpfs           1.0M     0  1.0M   0% /run/credentials/systemd-journald.service
tmpfs           1.0M     0  1.0M   0% /run/credentials/systemd-resolved.service
/dev/nvme0n1p8  458G   62G  396G  14% /home
tmpfs           7.3G  7.3M  7.3G   1% /tmp
tmpfs           1.5G  4.1M  1.5G   1% /run/user/1000
```

# 3. 安装新的软件包？

基本的构建能力已经具备，此时建议不要再使用 pacman 增加新的软件包，最好 `sudo steamos-readonly enable`，在用户分区增加自己的需要的软件，这里以 `cmake` 为例，介绍一下如何安装到自己指定的目录（`~/.local`）。

**配置环境**

创建 unix 风格的目录，这里仅列出部分常用的

```sh
mkdir -p ~/.local/bin
mkdir -p ~/.local/share
mkdir -p ~/.local/man
```

修改 `~/.bashrc`，添加环境变量

```sh
# in ~/.bashrc
export PATH=$PATH:~/.local/bin
```

一般有两种方法配置 cmake 或其他工具：使用预构建的版本、手动编译

**使用预构建的 cmake**

`wget https://github.com/Kitware/CMake/releases/download/v3.31.6/cmake-3.31.6-linux-x86_64.tar.gz`

解压，然后要么 `mv cmake-3.31.6-linux-x86_64/* ~/.local`，要么直接创建软链接 `ln -s cmake-3.31.6-linux-x86_64/bin/* ~/.local/bin`

**手动编译 cmake**

`wget https://github.com/Kitware/CMake/releases/download/v3.31.6/cmake-3.31.6.tar.gz`

对于 autoconf 风格的工程，都可以如法炮制，便可以安装到指定的目录了

```sh
./configure --prefix=~/.local -- -DCMAKE_USE_OPENSSL=OFF
make -j7
make install
```

```sh
(deck@steamdeck cmake-3.31.6)$ cmake --version
cmake version 3.31.6

CMake suite maintained and supported by Kitware (kitware.com/cmake).
```

卸载的话，只要在 `install_manifest.txt` 所在目录执行 `make uninstall` 即可。

# 4. 参考信息

**flatpak 换源**

```sh
flatpak remote-modify flathub --url=http://mirror.sjtu.edu.cn/flathub
```

**后续可能会用到的环境变量**

- `PATH`
- `MANPATH`
- `PKG_CONFIG_PATH`
- `LD_LIBRARY_PATH`
- `LD_RUN_PATH`

**介绍一下pacman包管理常用命令**

```sh
# 获取更新信息
sudo pacman -Sy
# 安装软件包更新
sudo pacman -Syyy
# 更新系统内核
sudo pacman -Syu
# 安装软件包
sudo pacman -S package_name
# 卸载软件包
sudo pacman -Rs package_name
```

**automake, autoconf使用详解**

https://www.laruence.com/2009/11/18/1154.html

