#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Live2D 看板娘 - 自动更新工具
从 GitHub 下载最新 Release 并替换本地文件
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
from pathlib import Path

# ─── 配置 ───
GITHUB_API = "https://api.github.com/repos/CatmaoU/live2d-extension/releases/latest"
# 脚本所在目录（项目根目录）
BASE_DIR = Path(__file__).resolve().parent


def get_current_version():
    """从 manifest.json 读取当前版本"""
    try:
        mf = BASE_DIR / "manifest.json"
        if not mf.exists():
            # 可能在子目录
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
    """获取 GitHub 最新 Release 信息"""
    req = urllib.request.Request(GITHUB_API, headers={"User-Agent": "Live2D-Updater"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    tag = data.get("tag_name", "").lstrip("v")
    zip_url = None
    for asset in data.get("assets", []):
        name = asset.get("name", "")
        if name.endswith(".zip") or "Source code" in name:
            zip_url = asset.get("browser_download_url")
            break
    if not zip_url:
        # 没有 asset，使用 GitHub 自动生成的源码 ZIP
        zip_url = data.get("zipball_url")
    return {
        "version": tag,
        "zip_url": zip_url,
        "html_url": data.get("html_url", ""),
        "body": data.get("body", ""),
    }


def compare_versions(a, b):
    """版本号比较，返回 1:a>b  0:a==b  -1:a<b"""
    pa = [int(x) for x in a.replace("-", ".").split(".") if x.isdigit()]
    pb = [int(x) for x in b.replace("-", ".").split(".") if x.isdigit()]
    for i in range(max(len(pa), len(pb))):
        na = pa[i] if i < len(pa) else 0
        nb = pb[i] if i < len(pb) else 0
        if na > nb:
            return 1
        if na < nb:
            return -1
    return 0


def download_and_extract(zip_url):
    """下载 ZIP 并解压到临时目录，返回临时目录路径"""
    print("[下载中] 正在从 GitHub 下载更新包...")
    req = urllib.request.Request(zip_url, headers={"User-Agent": "Live2D-Updater"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = resp.read()

    tmp_dir = Path(tempfile.mkdtemp(prefix="live2d_update_"))
    print(f"[解压中] 正在解压到临时目录...")

    with zipfile.ZipFile(io.BytesIO(data)) as zf:
        zf.extractall(tmp_dir)

    # GitHub 会创建一层嵌套目录（如 live2d-extension-xxx/）
    # 找到这一层
    items = list(tmp_dir.iterdir())
    if len(items) == 1 and items[0].is_dir():
        return items[0]
    return tmp_dir


def replace_extension(extracted_dir):
    """用解压后的文件替换本地扩展文件"""
    print("[替换中] 正在更新本地文件...")

    # 要排除的文件/目录（用户配置、缓存等）
    exclude = {
        ".git", "node_modules", "__pycache__",
        "live2d-static-api/assets",  # 动态生成的缓存，保留
    }

    # 删除旧文件（保留 exclude 中的）
    for item in BASE_DIR.iterdir():
        if item.name in exclude or item.name.startswith("."):
            continue
        if item.is_dir():
            shutil.rmtree(item, ignore_errors=True)
        else:
            item.unlink()

    # 复制新文件
    for item in extracted_dir.iterdir():
        if item.name.startswith("."):
            continue
        dst = BASE_DIR / item.name
        if item.is_dir():
            shutil.copytree(item, dst, dirs_exist_ok=True)
        else:
            shutil.copy2(item, dst)

    print("[完成] 更新文件已替换！")


def main():
    print("=" * 50)
    print("  Live2D 看板娘 - 自动更新工具")
    print("=" * 50)
    print()

    current = get_current_version()
    print(f"当前版本：v{current}")

    try:
        release = get_latest_release()
    except urllib.error.HTTPError as e:
        print(f"[错误] GitHub API 请求失败 (HTTP {e.code})")
        print("请检查网络连接后重试。")
        input("\n按 Enter 退出...")
        return
    except Exception as e:
        print(f"[错误] 无法获取版本信息：{e}")
        input("\n按 Enter 退出...")
        return

    latest = release["version"]
    print(f"最新版本：v{latest}")

    if compare_versions(latest, current) <= 0:
        print(f"\n当前已是最新版本，无需更新。")
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
        extracted = download_and_extract(release["zip_url"])
        replace_extension(extracted)
        # 清理临时目录
        shutil.rmtree(extracted.parent if extracted.parent.name.startswith("live2d_update_") else extracted,
                      ignore_errors=True)
        print()
        print("=" * 50)
        print("  更新成功！")
        print()
        print("  请重新加载浏览器扩展：")
        print("  chrome://extensions → 点击 ↻ 刷新")
        print("=" * 50)
    except Exception as e:
        print(f"\n[错误] 更新失败：{e}")
        import traceback
        traceback.print_exc()

    input("\n按 Enter 退出...")


if __name__ == "__main__":
    main()
