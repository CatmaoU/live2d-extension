#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Live2D 看板娘 - 自动更新工具（卡片风格 UI）
"""

import os, sys, json, urllib.request, urllib.error, zipfile, io, shutil, tempfile, time, threading
from pathlib import Path

try:
    import tkinter as tk
    from tkinter import ttk, messagebox
except ImportError:
    print("错误：需要 tkinter 支持。请安装 Python 时勾选 'tcl/tk and IDLE'。")
    input("按 Enter 退出...")
    sys.exit(1)

BASE_DIR = Path(__file__).resolve().parent
if not (BASE_DIR / "manifest.json").exists():
    print("="*50+"\n  错误：未在扩展文件夹中运行！\n\n  请将脚本放入扩展文件夹目录内\n  （与 manifest.json 同目录）后再运行。\n"+"="*50)
    input("\n按 Enter 退出...")
    sys.exit(1)

GITHUB_API = "https://api.github.com/repos/CatmaoU/live2d-extension/releases/latest"
PROXIES = ["","https://gh-proxy.org/","https://v4.gh-proxy.org/","https://v6.gh-proxy.org/","https://cdn.gh-proxy.org/"]

def get_current_version():
    try:
        mf = BASE_DIR / "manifest.json"
        if not mf.exists():
            for p in BASE_DIR.iterdir():
                if p.is_dir() and (p / "manifest.json").exists():
                    return _read_manifest(p / "manifest.json")
            return "0.0.0"
        return _read_manifest(mf)
    except: return "0.0.0"

def _read_manifest(path):
    with open(path,"r",encoding="utf-8") as f:
        return json.load(f).get("version","0.0.0")

def get_latest_release():
    req = urllib.request.Request(GITHUB_API, headers={"User-Agent":"Live2D-Updater"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    tag = data.get("tag_name","").lstrip("v")
    zip_url = None
    for asset in data.get("assets",[]):
        name = asset.get("name","")
        if name.endswith(".zip"): zip_url = asset.get("browser_download_url"); break
    if not zip_url: zip_url = data.get("zipball_url")
    return {"version":tag, "zip_url":zip_url, "html_url":data.get("html_url",""),
            "body":data.get("body",""), "tag_name":data.get("tag_name","")}

def compare_versions(a,b):
    pa = [int(x) for x in a.replace("-",".").split(".") if x.isdigit()]
    pb = [int(x) for x in b.replace("-",".").split(".") if x.isdigit()]
    for i in range(max(len(pa),len(pb))):
        na = pa[i] if i<len(pa) else 0
        nb = pb[i] if i<len(pb) else 0
        if na>nb: return 1
        if na<nb: return -1
    return 0

# ═══════════════════════════════════════
#  UI
# ═══════════════════════════════════════

class Card(tk.Frame):
    """圆角白色卡片"""
    def __init__(self, parent, **kw):
        super().__init__(parent, bg="#fff", highlightbackground="#e8e8e8",
                         highlightthickness=1, padx=20, pady=16, **kw)

class App:
    COLORS = {
        "bg": "#f4f5f7",
        "card": "#ffffff",
        "accent": "#6c5ce7",
        "accent_hover": "#5a4bd1",
        "green": "#00b894",
        "green_hover": "#00a381",
        "gray": "#dfe6e9",
        "gray_hover": "#b2bec3",
        "text": "#2d3436",
        "sub": "#636e72",
        "muted": "#b2bec3",
        "border": "#e8e8e8",
    }

    def __init__(self):
        self.root = tk.Tk()
        self.root.title("更新工具")
        self.root.geometry("500x500")
        self.root.resizable(False, False)
        self.root.configure(bg=self.COLORS["bg"])

        try:
            self.root.iconbitmap(default=str(BASE_DIR / "icon.ico"))
        except: pass

        try:
            from ctypes import windll, byref, c_int
            windll.dwmapi.DwmSetWindowAttribute(
                windll.user32.GetParent(self.root.winfo_id()),
                33, byref(c_int(2)), 4)
        except: pass

        self.current_version = get_current_version()
        self.latest_info = None
        self._build()
        self._status("就绪")

    # ─── 构建 ───

    def _build(self):
        bg = self.COLORS["bg"]

        # 顶栏
        top = tk.Frame(self.root, bg=bg)
        top.pack(fill="x", padx=28, pady=(24,0))
        tk.Label(top, text="📦 更新工具", font=("Segoe UI", 18, "bold"),
                 bg=bg, fg=self.COLORS["text"]).pack(anchor="w")
        tk.Label(top, text="保持扩展为最新版本", font=("Segoe UI", 10),
                 bg=bg, fg=self.COLORS["sub"]).pack(anchor="w", pady=(2,0))

        # ─── 版本卡片 ───
        ver_card = Card(self.root)
        ver_card.pack(padx=28, pady=(16,0), fill="x")

        for label, key in [("当前版本", "cur"), ("最新版本", "lat")]:
            r = tk.Frame(ver_card, bg="#fff")
            r.pack(fill="x", pady=(4,0))
            tk.Label(r, text=label, font=("Segoe UI", 9), bg="#fff",
                     fg=self.COLORS["sub"]).pack(side="left")
            v = self.current_version if key=="cur" else "---"
            self._ver_label = tk.Label(r, text=f"v{v}", font=("Segoe UI", 13, "bold"),
                                       bg="#fff", fg=self.COLORS["text"])
            self._ver_label.pack(side="right")
            if key=="lat": self.latest_label = self._ver_label

        # ─── 更新内容卡片 ───
        tk.Label(self.root, text="更新内容", font=("Segoe UI", 9),
                 bg=bg, fg=self.COLORS["sub"]).pack(anchor="w", padx=28, pady=(16,4))
        note_card = Card(self.root)
        note_card.pack(padx=28, fill="x")
        self.notes_text = tk.Text(note_card, height=4, font=("Segoe UI", 9),
                                  wrap="word", bg="#fff", fg=self.COLORS["text"],
                                  relief="flat", bd=0, state="disabled",
                                  highlightthickness=0)
        self.notes_text.pack(fill="x")

        # ─── 进度条 ───
        self.progress_var = tk.DoubleVar()
        style = ttk.Style()
        style.theme_use("clam")
        style.configure("acc.Horizontal.TProgressbar", background=self.COLORS["accent"],
                        troughcolor="#eee", borderwidth=0, lightcolor=self.COLORS["accent"],
                        darkcolor=self.COLORS["accent"], thickness=5)
        self.progress_bar = ttk.Progressbar(self.root, style="acc.Horizontal.TProgressbar",
                                             variable=self.progress_var, maximum=100)
        self.progress_bar.pack(padx=28, pady=(16,4), fill="x")

        # ─── 状态 ───
        self.status_label = tk.Label(self.root, text="", font=("Segoe UI", 9),
                                     bg=bg, fg=self.COLORS["muted"])
        self.status_label.pack(padx=28, anchor="w")

        # ─── 按钮行 ───
        btn_row = tk.Frame(self.root, bg=bg)
        btn_row.pack(pady=(16,24), padx=28, fill="x")

        self.check_btn = self._mkbtn("🔍  检查更新", self.COLORS["accent"],
                                      self.COLORS["accent_hover"], self._on_check)
        self.check_btn.pack(side="left", padx=(0,6))

        self.update_btn = self._mkbtn("⬇  下载更新", self.COLORS["green"],
                                       self.COLORS["green_hover"], self._on_update,
                                       disabled=True)
        self.update_btn.pack(side="left", padx=6)

        tk.Label(btn_row, text="", bg=bg).pack(side="left", fill="x", expand=True)

        self._mkbtn("✕  关闭", self.COLORS["gray"], self.COLORS["gray_hover"],
                     self.root.destroy).pack(side="right")

    def _mkbtn(self, text, color, hover, cmd, disabled=False):
        btn = tk.Button(self.root, text=text, font=("Segoe UI", 10),
                        bg=color, fg="#fff", activebackground=hover,
                        activeforeground="#fff", padx=18, pady=7, bd=0,
                        cursor="hand2", command=cmd)
        if disabled: btn.config(state="disabled", bg=self.COLORS["muted"])
        return btn

    # ─── 工具 ───

    def _status(self, s):
        self.status_label.config(text=s)
        self.root.update_idletasks()

    def _notes(self, t):
        self.notes_text.config(state="normal")
        self.notes_text.delete("1.0","end")
        self.notes_text.insert("1.0", t or "（无说明）")
        self.notes_text.config(state="disabled")

    # ─── 检查 ───

    def _on_check(self):
        self.check_btn.config(state="disabled", text="⏳  检查中...")
        self._status("正在检查更新...")
        self.latest_label.config(text="最新版本：...")
        self.progress_var.set(0)
        threading.Thread(target=self._do_check, daemon=True).start()

    def _do_check(self):
        try:
            rel = get_latest_release()
            self.latest_info = rel
            lv = rel["version"]
            is_new = compare_versions(lv, self.current_version) > 0
            self.root.after(0, lambda: self.latest_label.config(
                text=f"v{lv}" + ("  ✅" if not is_new else "")))
            self.root.after(0, lambda: self._notes(rel.get("body","")))
            if is_new:
                self.root.after(0, lambda: self.update_btn.config(state="normal",
                                    bg=self.COLORS["green"], text="⬇  下载更新"))
                self.root.after(0, lambda: self._status(f"发现 v{lv}，可点击下载"))
            else:
                self.root.after(0, lambda: self._status("已是最新版本"))
        except urllib.error.HTTPError as e:
            self.root.after(0, lambda: self._status(f"检查失败 (HTTP {e.code})"))
            self.root.after(0, lambda: messagebox.showerror("错误",f"GitHub 请求失败 (HTTP {e.code})"))
        except Exception as e:
            self.root.after(0, lambda: self._status(f"检查失败：{e}"))
        finally:
            self.root.after(0, lambda: self.check_btn.config(state="normal", text="🔍  检查更新"))

    # ─── 下载 ───

    def _on_update(self):
        if not self.latest_info: return
        self.update_btn.config(state="disabled", text="⏳  下载中...")
        self.check_btn.config(state="disabled")
        self._status("测速中...")
        threading.Thread(target=self._do_update, daemon=True).start()

    def _do_update(self):
        try:
            zu = self.latest_info["zip_url"]
            tn = self.latest_info.get("tag_name","")
            bp, bu = self._fastest(zu, tn)
            self.root.after(0, lambda: self._status("下载中..."))
            tz = Path(tempfile.mkdtemp(prefix="lu_")) / "u.zip"
            self._dl_progress(bu, tz)
            self.root.after(0, lambda: self._status("解压中..."))
            td = tz.parent
            with zipfile.ZipFile(tz,"r") as z: z.extractall(td)
            tz.unlink()
            items = list(td.iterdir())
            ex = items[0] if len(items)==1 and items[0].is_dir() else td
            self.root.after(0, lambda: self._status("替换文件中..."))
            exclude = {".git","node_modules","__pycache__","live2d-static-api/assets"}
            for i in BASE_DIR.iterdir():
                if i.name in exclude or i.name.startswith("."): continue
                if i.is_dir(): shutil.rmtree(i, ignore_errors=True)
                else: i.unlink()
            for i in ex.iterdir():
                if i.name.startswith("."): continue
                d = BASE_DIR / i.name
                if i.is_dir(): shutil.copytree(i, d, dirs_exist_ok=True)
                else: shutil.copy2(i, d)
            shutil.rmtree(td.parent if td.parent.name.startswith("lu_") else td, ignore_errors=True)
            self.root.after(0, lambda: self._status("✅ 更新成功！请重新加载扩展"))
            self.root.after(0, lambda: self.update_btn.config(state="disabled", text="✅  已完成"))
            self.root.after(0, lambda: messagebox.showinfo("完成","更新成功！\nchrome://extensions → 刷新"))
        except Exception as e:
            self.root.after(0, lambda: self._status(f"❌ 失败：{e}"))
            self.root.after(0, lambda: messagebox.showerror("错误",str(e)))
        finally:
            self.root.after(0, lambda: self.check_btn.config(state="normal"))

    def _fastest(self, zu, tn):
        rs = []
        for i, p in enumerate(PROXIES):
            url = zu if not p else p + "https://github.com/CatmaoU/live2d-extension/releases/download/" + zu.split("/releases/download/")[1] if "/releases/download/" in zu else p + zu
            lat = self._test(url)
            if lat is not None: rs.append((lat, p, url))
        if not rs: return "", zu
        rs.sort(key=lambda x:x[0])
        return rs[0][1], rs[0][2]

    def _test(self, url, t=5):
        s = time.time()
        try:
            with urllib.request.urlopen(urllib.request.Request(url, method="HEAD", headers={"User-Agent":"Live2D-Updater"}), timeout=t) as r: r.read(0)
            return time.time()-s
        except:
            try:
                with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent":"Live2D-Updater","Range":"bytes=0-0"}), timeout=t) as r: r.read()
                return time.time()-s
            except: return None

    def _dl_progress(self, url, dst):
        with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent":"Live2D-Updater"}), timeout=120) as r:
            total = int(r.headers.get("Content-Length",0))
            dl = 0
            with open(dst,"wb") as f:
                while True:
                    c = r.read(65536)
                    if not c: break
                    f.write(c); dl += len(c)
                    if total>0:
                        pct = int(dl/total*100)
                        self.root.after(0, lambda v=pct: self.progress_var.set(v))
                        self.root.after(0, lambda d=dl, t=total, p=pct: self._status(f"下载中  {d//1024//1024}MB/{t//1024//1024}MB  {p}%"))
            if total>0: self.root.after(0, lambda: (self.progress_var.set(100), self._status("下载完成")))

    def run(self): self.root.mainloop()

if __name__ == "__main__":
    if len(sys.argv)>1 and sys.argv[1]=="--check":
        try:
            rel = get_latest_release(); cur = get_current_version()
            print(json.dumps({"current":cur,"latest":rel["version"],
                  "has_update":compare_versions(rel["version"],cur)>0,"url":rel["html_url"]}, ensure_ascii=False))
            sys.exit(0)
        except Exception as e: print(json.dumps({"error":str(e)}, ensure_ascii=False)); sys.exit(1)
    App().run()
