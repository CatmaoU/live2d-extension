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
GITHUB_API = "https://api.github.com/repos/CatmaoU/live2d-extension/releases"
PROXIES = [
    "https://v6.gh-proxy.org/",
    "https://gh-proxy.org/",
    "https://v4.gh-proxy.org/",
    "https://cdn.gh-proxy.org/",
    "",
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


def get_versions():
    """获取所有版本信息，返回 (latest_with_zip, latest_without_zip)"""
    try:
        req = urllib.request.Request(GITHUB_API, headers={"User-Agent": "Live2D-Updater"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            releases = json.loads(resp.read().decode("utf-8"))
    except Exception:
        raise Exception("无法连接 GitHub，请检查网络")
    
    if not isinstance(releases, list) or len(releases) == 0:
        raise Exception("项目不存在或未发布版本，请检查发布页")
    if isinstance(releases, dict) and releases.get("message"):
        raise Exception("项目不存在或未发布版本，请检查发布页")
    
    latest_with_zip = None
    latest_no_zip = None
    
    for rel in releases:
        tag = rel.get("tag_name", "").lstrip("v")
        if not tag:
            continue
        assets = rel.get("assets", [])
        has_zip = any(a.get("name", "").endswith((".zip", ".7z")) and "Develop" not in a.get("name", "") for a in assets)
        # 优先选择 live2d-extension.7z，排除 Develop.zip
        sorted_assets = sorted(
            [a for a in assets if a.get("name", "").endswith((".zip", ".7z")) and "Develop" not in a.get("name", "")],
            key=lambda a: 0 if "live2d-extension" in a.get("name", "") else 1
        )
        info = {
            "version": tag,
            "zip_url": sorted_assets[0].get("browser_download_url") if sorted_assets else None,
            "html_url": rel.get("html_url", ""),
            "body": rel.get("body", ""),
            "tag_name": rel.get("tag_name", ""),
        }
        if has_zip and not latest_with_zip:
            latest_with_zip = info
        if not has_zip and not latest_no_zip:
            latest_no_zip = info
        if latest_with_zip and latest_no_zip:
            break
    
    return latest_with_zip, latest_no_zip


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
    """并发测试所有代理的实际下载速度，返回最快的前缀"""
    from concurrent.futures import ThreadPoolExecutor, as_completed
    
    total = len(PROXIES)
    print(f"[测速] 正在并发测试 {total} 个镜像节点下载速度...")
    
    def test_one(proxy):
        if not proxy:
            url = zip_url
        elif "/releases/download/" in zip_url:
            rel_path = zip_url.split("/releases/download/")[1]
            url = proxy + "https://github.com/CatmaoU/live2d-extension/releases/download/" + rel_path
        else:
            url = proxy + zip_url
        start = time.time()
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Live2D-Updater", "Range": "bytes=0-262144"})
            with urllib.request.urlopen(req, timeout=10) as r:
                data = r.read()
            elapsed = time.time() - start
            speed = len(data) / elapsed / 1024
            return (speed, proxy, url)
        except:
            return None
    
    results = []
    with ThreadPoolExecutor(max_workers=total) as executor:
        futures = {executor.submit(test_one, p): p for p in PROXIES}
        for future in as_completed(futures):
            proxy = futures[future]
            prefix = proxy or "直连"
            try:
                res = future.result()
                if res:
                    results.append(res)
                    print(f"  {prefix}: {res[0]:.0f} KB/s")
                else:
                    print(f"  {prefix}: 失败")
            except:
                print(f"  {prefix}: 失败")
    
    if not results:
        print("[测速] 所有节点均失败，使用直连")
        return "", zip_url
    
    results.sort(key=lambda x: -x[0])
    best = results[0]
    print(f"[测速] 选中最快节点: {'直连' if not best[1] else best[1]} ({best[0]:.0f} KB/s)")
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


def _is_archive(filename):
    return filename.lower().endswith(('.zip', '.7z'))

def _extract_archive(archive_path, target_dir):
    ext = os.path.splitext(archive_path)[1].lower()
    if ext == '.zip':
        with zipfile.ZipFile(archive_path, "r") as zf:
            zf.extractall(target_dir)
    elif ext == '.7z':
        try:
            import py7zr
            with py7zr.SevenZipFile(archive_path, 'r') as sz:
                sz.extractall(target_dir)
        except ImportError:
            print("  [警告] 未安装 py7zr，尝试作为 ZIP 解压...")
            with zipfile.ZipFile(archive_path, "r") as zf:
                zf.extractall(target_dir)
    else:
        raise Exception(f"不支持的压缩格式: {ext}")

def download_and_extract(zip_url, tag_name):
    """智能选择最快代理下载并解压"""
    is_7z = zip_url.lower().endswith('.7z')
    ext = '.7z' if is_7z else '.zip'
    tmp_zip = Path(tempfile.mkdtemp(prefix="live2d_update_")) / f"update{ext}"
    print()
    
    proxy_prefix, fast_url = pick_fastest_proxy(zip_url, tag_name)
    all_urls = [(proxy_prefix or "直连", fast_url)]
    seen_urls = {fast_url}
    for p in PROXIES:
        if not p:
            u = zip_url
        elif "/releases/download/" in zip_url:
            rel_path = zip_url.split("/releases/download/")[1]
            u = p + "https://github.com/CatmaoU/live2d-extension/releases/download/" + rel_path
        else:
            u = p + zip_url
        if u not in seen_urls:
            seen_urls.add(u)
            all_urls.append((p or "直连", u))
    
    downloaded_ok = False
    for label, url in all_urls:
        if downloaded_ok:
            break
        print(f"  尝试 {label}...")
        download_with_progress(url, tmp_zip, "下载更新包")
        if zipfile.is_zipfile(tmp_zip) or (is_7z and tmp_zip.stat().st_size > 1000):
            downloaded_ok = True
            break
    
    if not downloaded_ok:
        tmp_zip.unlink()
        raise Exception("所有节点均下载失败，请检查网络")
    
    print("[解压中] 正在解压更新包...")
    tmp_dir = tmp_zip.parent
    _extract_archive(tmp_zip, tmp_dir)
    tmp_zip.unlink()
    
    items = list(tmp_dir.iterdir())
    if len(items) == 1 and items[0].is_dir():
        return items[0]
    return tmp_dir


def replace_extension(extracted_dir):
    print("[替换中] 正在更新本地文件...")
    exclude = {".git", "node_modules", "__pycache__", "live2d-static-api/assets", "Develop.zip"}
    for item in BASE_DIR.iterdir():
        if item.name in exclude or item.name.startswith("."):
            continue
        if item.name == "Live2D Update.exe":
            continue  # 不删除/改名运行中的 EXE
        if item.is_dir():
            shutil.rmtree(item, ignore_errors=True)
        else:
            try:
                item.unlink()
            except PermissionError:
                print(f"  [跳过] 无法删除 {item.name}（可能正在使用）")
    
    # 复制更新包文件（跳过 EXE，稍后处理）
    has_new_exe = False
    for item in extracted_dir.iterdir():
        if item.name.startswith("."):
            continue
        if item.name == "Live2D Update.exe":
            has_new_exe = True
            continue  # 稍后处理
        dst = BASE_DIR / item.name
        if item.is_dir():
            shutil.copytree(item, dst, dirs_exist_ok=True)
        else:
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
    
    # 处理 EXE 替换
    if has_new_exe:
        new_exe_src = extracted_dir / "Live2D Update.exe"
        tmp_exe = BASE_DIR / "Live2D Update.exe.new"
        # 1. 复制新 EXE 到临时文件名
        import time as _time
        copied = False
        for _attempt in range(3):
            try:
                shutil.copy2(new_exe_src, tmp_exe)
                copied = True
                break
            except PermissionError:
                if _attempt < 2:
                    _time.sleep(1)
        if copied:
            # 2. 旧 EXE 改名 .old
            old_exe_path = BASE_DIR / "Live2D Update.exe"
            old_exe_backup = BASE_DIR / "Live2D Update.exe.old"
            try:
                if old_exe_path.exists():
                    old_exe_path.rename(old_exe_backup)
            except:
                pass
            # 3. 临时文件改名正式名
            try:
                tmp_exe.rename(old_exe_path)
            except:
                pass
    
    # 清理旧版 EXE 残留
    old_exe = BASE_DIR / "Live2D Update.exe.old"
    if old_exe.exists():
        try:
            old_exe.unlink()
        except:
            pass
    print("[完成] 更新文件已替换！")


def check_only():
    try:
        with_zip, no_zip = get_versions()
        current = get_current_version()
        latest_ver = with_zip["version"] if with_zip else (no_zip["version"] if no_zip else current)
        latest_url = with_zip["html_url"] if with_zip else (no_zip["html_url"] if no_zip else "")
        data = {"current": current, "latest": latest_ver,
                "has_update": compare_versions(latest_ver, current) > 0,
                "url": latest_url}
        print(json.dumps(data, ensure_ascii=False))
        return 0
    except Exception as e:
        print(json.dumps({"error": str(e)}, ensure_ascii=False))
        return 1


def apply_update():
    try:
        with_zip, no_zip = get_versions()
        current = get_current_version()
        if not with_zip:
            print(json.dumps({"message": "未找到可用的更新包", "done": True}, ensure_ascii=False))
            return 0
        if compare_versions(with_zip["version"], current) <= 0:
            print(json.dumps({"message": "已是最新版本", "done": True}, ensure_ascii=False))
            return 0
        release = with_zip
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
        with_zip, no_zip = get_versions()
    except Exception as e:
        print(f"[错误] 无法获取版本信息：{e}")
        input("\n按 Enter 退出...")
        return
    
    # 决定使用哪个版本
    release = None
    
    if with_zip and compare_versions(with_zip["version"], current) > 0:
        release = with_zip
        if no_zip and compare_versions(no_zip["version"], with_zip["version"]) > 0:
            print(f"\n发现最新版本：v{no_zip['version']}")
            print()
            print(f"存在新版本 v{no_zip['version']} 但项目不存在或未发布，请检查发布页")
            print(f"  尝试更新到 v{release['version']}")
        else:
            print(f"\n发现最新版本：v{release['version']}")
        print()
    elif no_zip and compare_versions(no_zip["version"], current) > 0:
        print(f"\n⚠ 存在新版本 v{no_zip['version']} 但未上传更新包")
        input("\n按 Enter 退出...")
        return
    else:
        print("\n当前已是最新版本，无需更新。")
        input("\n按 Enter 退出...")
        return
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
