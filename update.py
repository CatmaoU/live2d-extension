#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Live2D 看板娘 - 自动更新
支持 GitHub 代理加速
"""

import os
import sys
import json
import urllib.request
import urllib.error
import zipfile
import io
import shutil
import tempfile
import time
import threading
from pathlib import Path

# ─── 启动验证 ───
BASE_DIR = Path(sys.executable if getattr(sys, 'frozen', False) else __file__).resolve().parent
if not (BASE_DIR / "manifest.json").exists():
    EXE_NAME = os.path.basename(sys.executable) if getattr(sys, 'frozen', False) else "update.py"
    # 启用 Windows 控制台彩色输出
    try:
        import ctypes
        kernel32 = ctypes.windll.kernel32
        kernel32.SetConsoleMode(kernel32.GetStdHandle(-11), 7)
    except: pass
    RED = '\033[31m'; GREEN = '\033[32m'; RESET = '\033[0m'
    print("=" * 50)
    print(f"  {RED}错误：未在扩展文件夹中运行！{RESET}")
    print()
    print(f"  {GREEN}请将 {EXE_NAME} 放入扩展文件夹目录内{RESET}")
    print(f"  {GREEN}（与 manifest.json 同目录）后再运行。{RESET}")
    print("=" * 50)
    input("\n按 Enter 退出...")
    sys.exit(1)

# ─── 配置 ───
GITHUB_API = "https://api.github.com/repos/CatmaoU/live2d-extension/releases/latest"
PROXIES = [
    "",
    "https://gh-proxy.org/",
    "https://v4.gh-proxy.org/",
    "https://v6.gh-proxy.org/",
    "https://cdn.gh-proxy.org/",
]


def get_current_version():
    try:
        mf = BASE_DIR / "manifest.json"
        if not mf.exists():
            for p in BASE_DIR.iterdir():
                if p.is_dir() and (p / "manifest.json").exists():
                    return _read_manifest(p / "manifest.json")
            return "0.0.0"
        return _read_manifest(mf)
    except:
        return "0.0.0"


def _read_manifest(path):
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data.get("version", "0.0.0")


def get_latest_release():
    req = urllib.request.Request(GITHUB_API, headers={"User-Agent": "Live2D-Updater"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    tag = data.get("tag_name", "").lstrip("v")
    zip_url = None
    for asset in data.get("assets", []):
        name = asset.get("name", "")
        if name.endswith(".zip"):
            zip_url = asset.get("browser_download_url")
            break
    if not zip_url:
        zip_url = data.get("zipball_url")
    return {
        "version": tag,
        "zip_url": zip_url,
        "html_url": data.get("html_url", ""),
        "body": data.get("body", ""),
        "tag_name": data.get("tag_name", ""),
    }


def compare_versions(a, b):
    pa = [int(x) for x in a.replace("-", ".").split(".") if x.isdigit()]
    pb = [int(x) for x in b.replace("-", ".").split(".") if x.isdigit()]
    for i in range(max(len(pa), len(pb))):
        na = pa[i] if i < len(pa) else 0
        nb = pb[i] if i < len(pb) else 0
        if na > nb: return 1
        if na < nb: return -1
    return 0


def test_proxy_url(full_url, timeout=5):
    """测试一个完整下载 URL 的延迟（HEAD 请求，只读响应头）"""
    if not full_url:
        return None
    start = time.time()
    try:
        req = urllib.request.Request(full_url, method="HEAD",
                                     headers={"User-Agent": "Live2D-Updater"})
        with urllib.request.urlopen(req, timeout=timeout) as r:
            r.read(0)  # 只读头
        return time.time() - start
    except:
        # HEAD 可能不被支持，尝试 GET + range 只读头
        try:
            req = urllib.request.Request(full_url,
                                         headers={"User-Agent": "Live2D-Updater", "Range": "bytes=0-0"})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                r.read()
            return time.time() - start
        except:
            return None


def pick_fastest_proxy(zip_url, tag_name):
    """测试所有代理，返回最快的代理前缀"""
    results = []
    total = len(PROXIES)
    print(f"[测速] 正在测试 {total} 个镜像节点...")
    
    for i, proxy in enumerate(PROXIES):
        prefix = proxy or "直连"
        
        # 构造完整下载 URL
        if not proxy:
            url = zip_url
        elif "/releases/download/" in zip_url:
            rel_path = zip_url.split("/releases/download/")[1]
            url = proxy + "https://github.com/CatmaoU/live2d-extension/releases/download/" + rel_path
        else:
            url = proxy + zip_url
        
        print(f"  [{i+1}/{total}] {prefix}...", end=" ", flush=True)
        latency = test_proxy_url(url)
        if latency is not None:
            results.append((latency, proxy, url))
            print(f"{latency*1000:.0f}ms")
        else:
            print("超时")
    
    if not results:
        print("[测速] 所有节点均超时，使用直连")
        return "", zip_url
    
    results.sort(key=lambda x: x[0])
    best = results[0]
    print(f"[测速] 选中最快节点: {'直连' if not best[1] else best[1]} ({best[0]*1000:.0f}ms)")
    return best[1], best[2]


def download_with_progress(url, target_path, desc="下载中"):
    """下载文件并显示进度条"""
    req = urllib.request.Request(url, headers={"User-Agent": "Live2D-Updater"})
    
    with urllib.request.urlopen(req, timeout=120) as resp:
        total = int(resp.headers.get("Content-Length", 0))
        downloaded = 0
        bar_width = 40
        
        with open(target_path, "wb") as f:
            while True:
                chunk = resp.read(65536)
                if not chunk:
                    break
                f.write(chunk)
                downloaded += len(chunk)
                
                if total > 0:
                    pct = downloaded / total * 100
                    filled = int(bar_width * downloaded / total)
                    bar = "█" * filled + "░" * (bar_width - filled)
                    sys.stdout.write(f"\r{desc} [{bar}] {pct:.0f}% ({downloaded//1024//1024}MB/{total//1024//1024}MB)")
                else:
                    sys.stdout.write(f"\r{desc} ... {downloaded//1024//1024}MB")
                sys.stdout.flush()
        
        sys.stdout.write("\n")


def download_and_extract(zip_url, tag_name):
    """智能选择最快代理下载并解压"""
    # 选择最快代理
    proxy_prefix, fast_url = pick_fastest_proxy(zip_url, tag_name)
    
    # 下载到临时文件
    tmp_zip = Path(tempfile.mkdtemp(prefix="live2d_update_")) / "update.zip"
    print()
    download_with_progress(fast_url, tmp_zip, "下载更新包")
    
    # 验证是否为有效的 ZIP 文件
    if not zipfile.is_zipfile(tmp_zip):
        print("[警告] 下载的文件不是有效的 ZIP，尝试直连下载...")
        # 用直连重试
        download_with_progress(zip_url, tmp_zip, "下载更新包(直连)")
        if not zipfile.is_zipfile(tmp_zip):
            tmp_zip.unlink()
            raise Exception("下载的文件不是有效的 ZIP 文件，请检查网络或代理")
    
    # 解压
    print("[解压中] 正在解压更新包...")
    tmp_dir = tmp_zip.parent
    with zipfile.ZipFile(tmp_zip, "r") as zf:
        zf.extractall(tmp_dir)
    tmp_zip.unlink()
    
    items = list(tmp_dir.iterdir())
    if len(items) == 1 and items[0].is_dir():
        return items[0]
    return tmp_dir


def replace_extension(extracted_dir):
    print("[替换中] 正在更新本地文件...")
    exclude = {".git", "node_modules", "__pycache__", "live2d-static-api/assets"}
    running_exe = None
    for item in BASE_DIR.iterdir():
        if item.name in exclude or item.name.startswith("."):
            continue
        if item.is_dir():
            shutil.rmtree(item, ignore_errors=True)
        else:
            # 正在运行的 exe 不能直接删除，先改名再删除
            if item.name == "Live2D Update.exe":
                try:
                    item.rename(item.with_suffix(".exe.old"))
                    running_exe = item.with_suffix(".exe.old")
                except:
                    running_exe = item
                continue
            try:
                item.unlink()
            except PermissionError:
                print(f"  [跳过] 无法删除 {item.name}（可能正在使用）")
    for item in extracted_dir.iterdir():
        if item.name.startswith("."):
            continue
        # 跳过 Live2D Update.exe（正在运行，无法覆盖）
        if item.name == "Live2D Update.exe":
            print("  [跳过] Live2D Update.exe（运行中，跳过覆盖）")
            continue
        dst = BASE_DIR / item.name
        if item.is_dir():
            shutil.copytree(item, dst, dirs_exist_ok=True)
        else:
            # 重试 3 次，防止文件被其他进程临时锁定
            for attempt in range(3):
                try:
                    shutil.copy2(item, dst)
                    break
                except PermissionError:
                    if attempt < 2:
                        import time
                        time.sleep(1)
                    else:
                        print(f"  [跳过] 无法复制 {item.name}（文件被锁定）")
    # 延迟替换正在运行的 EXE（创建批处理，进程退出后执行）
    new_exe_src = extracted_dir / "Live2D Update.exe"
    if new_exe_src.exists():
        bat_path = BASE_DIR / "_update_exe.bat"
        with open(bat_path, "w", newline="\r\n") as bat:
            bat.write('@echo off\r\n')
            bat.write('timeout /t 2 /nobreak >nul\r\n')
            bat.write(f'del "{BASE_DIR / "Live2D Update.exe.old"}" 2>nul\r\n')
            bat.write(f'copy "{new_exe_src}" "{BASE_DIR / "Live2D Update.exe"}" >nul\r\n')
            bat.write('del "%~f0"\r\n')
        import subprocess
        startupinfo = subprocess.STARTUPINFO()
        startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
        subprocess.Popen(["cmd", "/c", str(bat_path)], close_fds=True, startupinfo=startupinfo)
        print("  [EXE] 将在退出后自动替换为最新版")
    else:
        # 没有新版 EXE，单纯清理旧文件
        old_exe = BASE_DIR / "Live2D Update.exe.old"
        if old_exe.exists():
            try:
                old_exe.unlink()
            except:
                pass
    print("[完成] 更新文件已替换！")


def check_only():
    try:
        release = get_latest_release()
        current = get_current_version()
        data = {"current": current, "latest": release["version"],
                "has_update": compare_versions(release["version"], current) > 0,
                "url": release["html_url"]}
        print(json.dumps(data, ensure_ascii=False))
        return 0
    except Exception as e:
        print(json.dumps({"error": str(e)}, ensure_ascii=False))
        return 1


def apply_update():
    try:
        release = get_latest_release()
        if compare_versions(release["version"], get_current_version()) <= 0:
            print(json.dumps({"message": "已是最新版本", "done": True}, ensure_ascii=False))
            return 0
        extracted = download_and_extract(release["zip_url"], release["tag_name"])
        replace_extension(extracted)
        shutil.rmtree(extracted.parent if extracted.parent.name.startswith("live2d_update_") else extracted,
                      ignore_errors=True)
        print(json.dumps({"message": "更新成功！请重新加载扩展", "done": True}, ensure_ascii=False))
        return 0
    except Exception as e:
        print(json.dumps({"error": str(e)}, ensure_ascii=False))
        return 1


def main():
    # 启动时清理上次更新残留的旧 exe
    old_exe = BASE_DIR / "Live2D Update.exe.old"
    if old_exe.exists():
        try:
            old_exe.unlink()
        except:
            pass

    print("=" * 50)
    print("  Live2D 看板娘 - 自动更新")
    print("=" * 50)
    print()
    current = get_current_version()
    print(f"当前版本：v{current}")
    try:
        release = get_latest_release()
    except Exception as e:
        print(f"[错误] 无法获取版本信息：{e}")
        input("\n按 Enter 退出...")
        return
    latest = release["version"]
    print(f"最新版本：v{latest}")
    if compare_versions(latest, current) <= 0:
        print("\n当前已是最新版本，无需更新。")
        input("\n按 Enter 退出...")
        return
    print(f"\n发现新版本 v{latest}！")
    if release.get("body"):
        print(f"更新内容：\n{release['body']}\n")
    ans = input("是否下载并更新？(Y/n): ").strip().lower()
    if ans == "n":
        print("已取消。")
        return
    try:
        extracted = download_and_extract(release["zip_url"], release["tag_name"])
        replace_extension(extracted)
        shutil.rmtree(extracted.parent if extracted.parent.name.startswith("live2d_update_") else extracted,
                      ignore_errors=True)
        print("\n" + "=" * 50)
        print("  更新成功！")
        print("  请重新加载浏览器扩展：")
        print("  chrome://extensions → 点击 ↻ 刷新")
        print("=" * 50)
    except Exception as e:
        print(f"\n[错误] 更新失败：{e}")
        import traceback
        traceback.print_exc()
    input("\n按 Enter 退出...")


if __name__ == "__main__":
    if len(sys.argv) > 1:
        if sys.argv[1] == "--check":
            sys.exit(check_only())
        elif sys.argv[1] == "--apply":
            sys.exit(apply_update())
    main()
