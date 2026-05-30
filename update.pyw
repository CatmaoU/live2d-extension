#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Live2D 看板娘 - 自动更新工具（图形界面）
支持 GitHub 代理加速 + 下载进度条
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



try:
    import tkinter as tk
    from tkinter import ttk, messagebox
except ImportError:
    print("错误：需要 tkinter 支持。请安装 Python 时勾选 'tcl/tk and IDLE'。")
    input("按 Enter 退出...")
    sys.exit(1)

# ─── 启动验证 ───
BASE_DIR = Path(__file__).resolve().parent
if not (BASE_DIR / "manifest.json").exists():
    print("=" * 50)
    print("  错误：未在扩展文件夹中运行！")
    print()
    print("  请将 update.py 放入扩展文件夹目录内")
    print("  （与 manifest.json 同目录）后再运行。")
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


class UpdateApp:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("Live2D 看板娘 - 自动更新")
        self.root.geometry("480x480")
        self.root.resizable(False, False)
        self.root.configure(bg="#f0f0f0")

        try:
            self.root.iconbitmap(default=str(BASE_DIR / "icon.ico"))
        except:
            pass

        # Win11 圆角（需要 Windows 10+）
        try:
            from ctypes import windll, byref, c_int
            HWND = windll.user32.GetParent(self.root.winfo_id())
            DWMWA_WINDOW_CORNER_PREFERENCE = 33
            windll.dwmapi.DwmSetWindowAttribute(HWND, DWMWA_WINDOW_CORNER_PREFERENCE, byref(c_int(2)), 4)
        except:
            pass

        self.current_version = get_current_version()
        self.latest_info = None
        self._build_ui()
        self._update_status("就绪")

    def _mkbtn(self, parent, text, color, hover, command, state="normal", width=14):
        btn = tk.Canvas(parent, width=width*9, height=34, bg=color,
                        highlightthickness=0, cursor="hand2")
        btn._color = color
        btn._hover = hover
        btn._text = text
        btn._state = state
        btn._command = command
        btn.bind("<Button-1>", self._on_btn_click)
        btn.bind("<Enter>", lambda e: btn.configure(bg=hover))
        btn.bind("<Leave>", lambda e: btn.configure(bg=color if state == "normal" else "#bbb"))
        btn.create_text(width*9//2, 17, text=text, fill="#fff",
                        font=("Segoe UI", 10), tags="txt")
        if state == "disabled":
            btn.configure(bg="#bbb")
            btn.itemconfig("txt", fill="#ddd")
        return btn

    def _on_btn_click(self, event):
        btn = event.widget
        if btn._state == "disabled":
            return
        # 点击反馈
        btn.configure(bg="#333")
        self.root.after(80, lambda: btn.configure(bg=btn._color))
        btn._command()

    def _mkframe(self, parent, padx=20, pady=0, fill="x", bg=None):
        f = tk.Frame(parent, bg=bg or self.root.cget("bg"))
        f.pack(padx=padx, pady=pady, fill=fill)
        return f

    def _build_ui(self):
        bg = self.root.cget("bg")

        # ─── 顶部标题区 ───
        header = tk.Frame(self.root, bg="#667eea", height=80)
        header.pack(fill="x")
        header.pack_propagate(False)

        tk.Label(header, text="Live2D 看板娘", font=("Segoe UI", 16, "bold"),
                 bg="#667eea", fg="#fff").place(relx=0.5, rely=0.35, anchor="center")
        tk.Label(header, text="自动更新工具", font=("Segoe UI", 10),
                 bg="#667eea", fg="#dde4ff").place(relx=0.5, rely=0.7, anchor="center")

        # ─── 版本卡片 ───
        card = tk.Frame(self.root, bg="#fff", highlightbackground="#e0e0e0",
                        highlightthickness=1, padx=16, pady=12)
        card.place(relx=0.5, rely=0.32, anchor="center", width=420)

        row1 = tk.Frame(card, bg="#fff")
        row1.pack(fill="x")
        tk.Label(row1, text="当前版本", font=("Segoe UI", 9), bg="#fff", fg="#888").pack(side="left")
        tk.Label(row1, text=f"v{self.current_version}", font=("Segoe UI", 11, "bold"),
                 bg="#fff", fg="#333").pack(side="right")

        row2 = tk.Frame(card, bg="#fff")
        row2.pack(fill="x", pady=(6, 0))
        tk.Label(row2, text="最新版本", font=("Segoe UI", 9), bg="#fff", fg="#888").pack(side="left")
        self.latest_label = tk.Label(row2, text="---", font=("Segoe UI", 11, "bold"),
                                     bg="#fff", fg="#333")
        self.latest_label.pack(side="right")

        # ─── 更新内容 ───
        self._mkframe(self.root, pady=(190, 2)).pack_forget()
        note_header = tk.Frame(self.root, bg=bg)
        note_header.pack(padx=20, pady=(150, 2), fill="x")
        tk.Label(note_header, text="更新内容", font=("Segoe UI", 9), bg=bg, fg="#888").pack(anchor="w")

        self.notes_text = tk.Text(self.root, height=5,
                                  font=("Segoe UI", 9), wrap="word",
                                  bg="#fafafa", fg="#444",
                                  relief="flat", bd=0,
                                  state="disabled",
                                  highlightbackground="#e8e8e8",
                                  highlightthickness=1,
                                  padx=10, pady=8)
        self.notes_text.pack(padx=20, pady=(0, 6), fill="x")

        # ─── 进度条 ───
        self.progress_var = tk.DoubleVar()
        style = ttk.Style()
        style.theme_use("clam")
        style.configure("purple.Horizontal.TProgressbar", background="#667eea",
                        troughcolor="#e8e8e8", borderwidth=0, lightcolor="#667eea",
                        darkcolor="#667eea", thickness=6)
        self.progress_bar = ttk.Progressbar(self.root, style="purple.Horizontal.TProgressbar",
                                             variable=self.progress_var, maximum=100, length=440)
        self.progress_bar.pack(padx=20, pady=(0, 4))

        # ─── 状态 ───
        self.status_label = tk.Label(self.root, text="", font=("Segoe UI", 9),
                                     bg=bg, fg="#999")
        self.status_label.pack()

        # ─── 按钮 ───
        btn_frame = tk.Frame(self.root, bg=bg)
        btn_frame.pack(pady=(10, 16))

        self.check_btn = self._mkbtn(btn_frame, "检查更新", "#667eea", "#5a6fd6",
                                      self._on_check)
        self.check_btn.pack(side="left", padx=6)

        self.update_btn = self._mkbtn(btn_frame, "下载并更新", "#4CAF50", "#43a047",
                                       self._on_update, state="disabled")
        self.update_btn.pack(side="left", padx=6)

        quit_btn = self._mkbtn(btn_frame, "退出", "#999", "#888",
                                self.root.destroy)
        quit_btn.pack(side="left", padx=6)

    def _update_status(self, text):
        self.status_label.config(text=text)
        self.root.update_idletasks()

    def _set_notes(self, text):
        self.notes_text.config(state="normal")
        self.notes_text.delete("1.0", "end")
        self.notes_text.insert("1.0", text or "（无说明）")
        self.notes_text.config(state="disabled")

    def _set_btn_state(self, btn, state, text=None):
        btn._state = state
        if text:
            btn.itemconfig("txt", text=text)
            btn._text = text
        if state == "disabled":
            btn.configure(bg="#bbb")
            btn.itemconfig("txt", fill="#ddd")
        else:
            btn.configure(bg=btn._color)
            btn.itemconfig("txt", fill="#fff")

    def _on_check(self):
        self._set_btn_state(self.check_btn, "disabled", "检查中...")
        self._update_status("正在检查更新...")
        self.latest_label.config(text="最新版本：检查中...")
        self.progress_var.set(0)
        threading.Thread(target=self._do_check, daemon=True).start()

    def _do_check(self):
        try:
            release = get_latest_release()
            self.latest_info = release
            latest = release["version"]
            self.root.after(0, lambda: self.latest_label.config(
                text=f"最新版本：v{latest}" + ("  ✓ 已是最新" if compare_versions(latest, self.current_version) <= 0 else "")))
            self.root.after(0, lambda: self._set_notes(release.get("body", "")))
            if compare_versions(latest, self.current_version) > 0:
                self.root.after(0, lambda: self.update_btn.config(state="normal"))
                self.root.after(0, lambda: self._update_status(f"发现新版本 v{latest}，可点击下载更新"))
            else:
                self.root.after(0, lambda: self._update_status("已是最新版本"))
        except urllib.error.HTTPError as e:
            self.root.after(0, lambda: self._update_status(f"检查失败 (HTTP {e.code})"))
            self.root.after(0, lambda: messagebox.showerror("错误", f"GitHub API 请求失败 (HTTP {e.code})\n请检查网络连接。"))
        except Exception as e:
            self.root.after(0, lambda: self._update_status(f"检查失败：{e}"))
        finally:
            self.root.after(0, lambda: self._set_btn_state(self.check_btn, "normal", "检查更新"))

    def _on_update(self):
        if not self.latest_info:
            return
        self._set_btn_state(self.update_btn, "disabled", "下载中...")
        self._set_btn_state(self.check_btn, "disabled")
        self._update_status("正在测速选择最快节点...")
        threading.Thread(target=self._do_update, daemon=True).start()

    def _do_update(self):
        try:
            zip_url = self.latest_info["zip_url"]
            tag_name = self.latest_info.get("tag_name", "")

            # 测速
            best_proxy, best_url = self._pick_fastest_proxy(zip_url, tag_name)
            self.root.after(0, lambda: self._update_status("正在下载更新包..."))

            # 下载
            tmp_zip = Path(tempfile.mkdtemp(prefix="live2d_update_")) / "update.zip"
            self._download_with_progress(best_url, tmp_zip)

            self.root.after(0, lambda: self._update_status("正在解压..."))

            # 解压
            tmp_dir = tmp_zip.parent
            with zipfile.ZipFile(tmp_zip, "r") as zf:
                zf.extractall(tmp_dir)
            tmp_zip.unlink()

            items = list(tmp_dir.iterdir())
            extracted = items[0] if len(items) == 1 and items[0].is_dir() else tmp_dir

            self.root.after(0, lambda: self._update_status("正在替换文件..."))

            # 替换文件
            exclude = {".git", "node_modules", "__pycache__", "live2d-static-api/assets"}
            for item in BASE_DIR.iterdir():
                if item.name in exclude or item.name.startswith("."):
                    continue
                if item.is_dir():
                    shutil.rmtree(item, ignore_errors=True)
                else:
                    item.unlink()
            for item in extracted.iterdir():
                if item.name.startswith("."):
                    continue
                dst = BASE_DIR / item.name
                if item.is_dir():
                    shutil.copytree(item, dst, dirs_exist_ok=True)
                else:
                    shutil.copy2(item, dst)

            shutil.rmtree(tmp_dir.parent if tmp_dir.parent.name.startswith("live2d_update_") else tmp_dir,
                          ignore_errors=True)

            self.root.after(0, lambda: self._update_status("更新成功！请重新加载扩展"))
            self.root.after(0, lambda: self._set_btn_state(self.update_btn, "disabled", "更新完成"))
            self.root.after(0, lambda: messagebox.showinfo("更新成功",
                                                           "更新完成！请重新加载浏览器扩展：\n"
                                                           "chrome://extensions → 点击 ↻ 刷新"))
        except Exception as e:
            self.root.after(0, lambda: self._update_status(f"更新失败：{e}"))
            self.root.after(0, lambda: messagebox.showerror("更新失败", str(e)))
        finally:
            self.root.after(0, lambda: self._set_btn_state(self.check_btn, "normal"))
            self.root.after(0, lambda: self._set_btn_state(self.update_btn, "normal", "下载并更新"))

    def _pick_fastest_proxy(self, zip_url, tag_name):
        results = []
        total = len(PROXIES)
        self.root.after(0, lambda: self._update_status(f"正在测试 {total} 个镜像节点..."))
        for i, proxy in enumerate(PROXIES):
            prefix = proxy or "直连"
            if not proxy:
                url = zip_url
            elif "/releases/download/" in zip_url:
                rel_path = zip_url.split("/releases/download/")[1]
                url = proxy + "https://github.com/CatmaoU/live2d-extension/releases/download/" + rel_path
            else:
                url = proxy + zip_url
            latency = self._test_url(url)
            if latency is not None:
                results.append((latency, proxy, url))
        if not results:
            return "", zip_url
        results.sort(key=lambda x: x[0])
        return results[0][1], results[0][2]

    def _test_url(self, url, timeout=5):
        start = time.time()
        try:
            req = urllib.request.Request(url, method="HEAD",
                                         headers={"User-Agent": "Live2D-Updater"})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                r.read(0)
            return time.time() - start
        except:
            try:
                req = urllib.request.Request(url,
                                             headers={"User-Agent": "Live2D-Updater", "Range": "bytes=0-0"})
                with urllib.request.urlopen(req, timeout=timeout) as r:
                    r.read()
                return time.time() - start
            except:
                return None

    def _download_with_progress(self, url, target_path):
        req = urllib.request.Request(url, headers={"User-Agent": "Live2D-Updater"})
        with urllib.request.urlopen(req, timeout=120) as resp:
            total = int(resp.headers.get("Content-Length", 0))
            downloaded = 0
            with open(target_path, "wb") as f:
                while True:
                    chunk = resp.read(65536)
                    if not chunk:
                        break
                    f.write(chunk)
                    downloaded += len(chunk)
                    if total > 0:
                        pct = int(downloaded / total * 100)
                        self.root.after(0, lambda v=pct: self.progress_var.set(v))
                        self.root.after(0, lambda d=downloaded, t=total:
                                        self._update_status(
                                            f"下载中 {d//1024//1024}MB/{t//1024//1024}MB ({pct}%)"))
                    else:
                        self.root.after(0, lambda d=downloaded:
                                        self._update_status(f"下载中 {d//1024//1024}MB..."))
            if total > 0:
                self.root.after(0, lambda: self.progress_var.set(100))
                self.root.after(0, lambda: self._update_status("下载完成"))

    def run(self):
        self.root.mainloop()


if __name__ == "__main__":
    # 支持命令行参数 --check（JSON 输出供扩展内部调用）
    if len(sys.argv) > 1:
        if sys.argv[1] == "--check":
            try:
                release = get_latest_release()
                current = get_current_version()
                data = {"current": current, "latest": release["version"],
                        "has_update": compare_versions(release["version"], current) > 0,
                        "url": release["html_url"]}
                print(json.dumps(data, ensure_ascii=False))
                sys.exit(0)
            except Exception as e:
                print(json.dumps({"error": str(e)}, ensure_ascii=False))
                sys.exit(1)

    app = UpdateApp()
    app.run()
