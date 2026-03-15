import requests
import xml.etree.ElementTree as ET
import re
import os
import zipfile
import shutil
import subprocess
import sys
import tkinter as tk
from tkinter import filedialog

CACHE_FILE = "StepManiaLocation.ikacache"
STEPmania_EXE_NAME = "StepMania.exe"
STEPmania_ROOT_DIR = None
STEPMANIA_SONGS_DIR = None

url = "https://zenius-i-vanisher.com/v5.2/simfiles_search_ajax.php"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36",
    "Content-Type": "application/x-www-form-urlencoded",
    "Origin": "https://zenius-i-vanisher.com",
    "Referer": "https://zenius-i-vanisher.com/v5.2/simfiles.php"
}

def get_all_drives():
    drives = []
    if os.name == "nt":
        import string
        from ctypes import windll
        drives = [f"{d}:/" for d in string.ascii_uppercase if windll.kernel32.GetLogicalDrives() & (1 << (ord(d) - ord("A")))]
    else:
        drives = ["/"]
    print(f"🔍 Searching all drives: {drives}")
    return drives

def find_stepmania_exe():
    print("🔍 Searching for StepMania.exe across all connected drives... This may take some time.")
    drives = get_all_drives()
    stepmania_path = None
    if os.name == "nt":
        for drive in drives:
            try:
                ps_command = f"""
                $searchPath = "{drive}"
                Get-ChildItem -Path $searchPath -Recurse -Filter "{STEPmania_EXE_NAME}" -File -ErrorAction SilentlyContinue |
                Select-Object -ExpandProperty FullName
                """
                result = subprocess.run(
                    ["powershell", "-Command", ps_command],
                    capture_output=True,
                    text=True,
                    timeout=180
                )
                found_paths = result.stdout.strip().split("\n")
                found_paths = [p.strip() for p in found_paths if p.strip()]
                if found_paths:
                    exe_path = found_paths[0]
                    stepmania_path = os.path.abspath(os.path.join(exe_path, "..", ".."))
                    print(f"✅ Found StepMania at: {stepmania_path}")
                    return stepmania_path
            except subprocess.TimeoutExpired:
                print(f"⚠ PowerShell search on {drive} timed out. Skipping...")
    elif hasattr(os, "uname") and os.uname().sysname == "Darwin":
        try:
            result = subprocess.run(
                ["mdfind", STEPmania_EXE_NAME],
                capture_output=True,
                text=True,
                timeout=60
            )
            found_paths = result.stdout.strip().split("\n")
            if found_paths:
                stepmania_path = os.path.abspath(os.path.join(found_paths[0], "..", ".."))
                print(f"✅ Found StepMania at: {stepmania_path}")
                return stepmania_path
        except subprocess.TimeoutExpired:
            print("⚠ Spotlight search timed out.")
    else:
        try:
            result = subprocess.run(
                ["locate", "-b", "--limit=1", STEPmania_EXE_NAME],
                capture_output=True,
                text=True,
                timeout=60
            )
            found_path = result.stdout.strip()
            if found_path:
                stepmania_path = os.path.abspath(os.path.join(found_path, "..", ".."))
                print(f"✅ Found StepMania at: {stepmania_path}")
                return stepmania_path
        except subprocess.TimeoutExpired:
            print("⚠ locate command timed out.")
    return None

def get_stepmania_directory(parent):
    # Linux: Use hardcoded path
    if sys.platform == "linux":
        home = os.path.expanduser("~")
        stepmania_dir = os.path.join(home, "stepmania")
        print(f"✅ Using Linux StepMania path: {stepmania_dir}")
        return stepmania_dir

    # Windows: Check cache first
    if os.path.exists(CACHE_FILE):
        with open(CACHE_FILE, "r") as f:
            cached_path = f.read().strip()
            exe_path = os.path.join(cached_path, "Program", STEPmania_EXE_NAME)
            if os.path.exists(exe_path):
                print(f"✅ Using cached StepMania location: {cached_path}")
                return cached_path
            else:
                print("⚠ Cached StepMania location is invalid. Searching again...")
    stepmania_dir = find_stepmania_exe()
    if not stepmania_dir:
        print("❌ StepMania.exe not found automatically. Please locate it manually.")
        exe_path = filedialog.askopenfilename(
            parent=parent,
            title="Select StepMania.exe",
            filetypes=[("StepMania Executable", STEPmania_EXE_NAME)]
        )
        if exe_path:
            stepmania_dir = os.path.abspath(os.path.join(os.path.dirname(exe_path), ".."))
        else:
            print("❌ StepMania.exe not found. Exiting.")
            sys.exit(1)
    with open(CACHE_FILE, "w") as f:
        f.write(stepmania_dir)
    print(f"✅ StepMania location saved: {stepmania_dir}")
    return stepmania_dir

def search_songs(songtitle, songartist):
    data = {
        "songtitle": songtitle,
        "songartist": songartist
    }
    response = requests.post(url, headers=headers, data=data)
    html = response.text
    html = re.sub(r'&(?!amp;|lt;|gt;)', '&amp;', html)
    root = ET.ElementTree(ET.fromstring(f"<root>{html}</root>"))
    rows = root.findall(".//tr")
    search_results = []
    for row in rows[2:]:
        columns = row.findall("td")
        if len(columns) < 4:
            continue
        name_tag = columns[0].find("a")
        song_name = name_tag.text.strip() if name_tag is not None and name_tag.text else "Unknown"
        song_link = "https://zenius-i-vanisher.com/v5.2/" + name_tag.attrib["href"] if name_tag is not None and "href" in name_tag.attrib else "No link"
        sp_difficulty = columns[1].text.strip() if columns[1].text else "-"
        dp_difficulty = columns[2].text.strip() if columns[2].text else "-"
        category_tag = columns[3].find("a")
        category = category_tag.text.strip() if category_tag is not None and category_tag.text else "Unknown"
        simfile_id = re.search(r"simfileid=(\d+)", song_link)
        simfile_id = simfile_id.group(1) if simfile_id else None
        search_results.append({
            "name": song_name,
            "link": song_link,
            "sp": sp_difficulty,
            "dp": dp_difficulty,
            "category": category,
            "simfile_id": simfile_id
        })
    return search_results

def download_and_extract(selected):
    if not selected["simfile_id"]:
        print("invalid sim file! Sorry this cant be downloaded!")
        return
    simfile_id = selected["simfile_id"]
    download_url = f"https://zenius-i-vanisher.com/v5.2/download.php?type=ddrsimfile&simfileid={simfile_id}"
    print(f"Downloading from: {download_url}")
    zip_filename = os.path.join(STEPMANIA_SONGS_DIR, f"{selected['name']}.zip")
    temp_extract_folder = os.path.join(STEPMANIA_SONGS_DIR, f"{selected['name']}_temp")
    final_extract_folder = os.path.join(STEPMANIA_SONGS_DIR, selected["name"])
    response = requests.get(download_url, headers=headers, stream=True)
    with open(zip_filename, "wb") as f:
        for chunk in response.iter_content(1024):
            f.write(chunk)
    print(f"Downloaded to: {zip_filename}")
    with zipfile.ZipFile(zip_filename, "r") as zip_ref:
        zip_ref.extractall(temp_extract_folder)
    print(f"Extracted to temporary location: {temp_extract_folder}")
    extracted_contents = os.listdir(temp_extract_folder)
    if len(extracted_contents) == 1 and os.path.isdir(os.path.join(temp_extract_folder, extracted_contents[0])):
        extracted_main_folder = os.path.join(temp_extract_folder, extracted_contents[0])
        shutil.move(extracted_main_folder, final_extract_folder)
    else:
        os.makedirs(final_extract_folder, exist_ok=True)
        for item in extracted_contents:
            shutil.move(os.path.join(temp_extract_folder, item), final_extract_folder)
    print(f"Final extracted folder: {final_extract_folder}")
    os.remove(zip_filename)
    shutil.rmtree(temp_extract_folder, ignore_errors=True)
    print("Cleanup complete.")

import threading
class App:
    def __init__(self, root):
        self.root = root
        self.root.title("StepMania Simfile Downloader")
        self.results = []
        self.displayed_results = []
        self.current_page = 0
        self.page_size = 10

        self.top_frame = tk.Frame(root)
        self.middle_frame = tk.Frame(root)
        self.bottom_frame = tk.Frame(root)

        self.top_frame.pack(side=tk.TOP, fill=tk.BOTH, expand=False)
        self.middle_frame.pack(side=tk.TOP, fill=tk.BOTH, expand=True)
        self.bottom_frame.pack(side=tk.BOTTOM, fill=tk.BOTH, expand=False)

        self.name_label = tk.Label(self.top_frame, text="Name")
        self.name_entry = tk.Entry(self.top_frame)
        self.artist_label = tk.Label(self.top_frame, text="Artist")
        self.artist_entry = tk.Entry(self.top_frame)
        self.search_button = tk.Button(self.top_frame, text="Search", command=self.on_search)

        self.name_label.grid(row=0, column=0, padx=6, pady=4, sticky="w")
        self.name_entry.grid(row=0, column=1, padx=6, pady=4, sticky="ew")
        self.artist_label.grid(row=1, column=0, padx=6, pady=4, sticky="w")
        self.artist_entry.grid(row=1, column=1, padx=6, pady=4, sticky="ew")
        self.search_button.grid(row=2, column=0, columnspan=2, pady=8)

        self.top_frame.columnconfigure(1, weight=1)

        self.song_buttons = []
        for i in range(10):
            btn = tk.Button(self.middle_frame, text="", state="disabled", command=lambda: None)
            btn.pack(side=tk.TOP, fill=tk.X, padx=4, pady=2)
            self.song_buttons.append(btn)

        self.prev_button = tk.Button(self.bottom_frame, text="Prev", command=self.on_prev)
        self.next_button = tk.Button(self.bottom_frame, text="Next", command=self.on_next)

        self.prev_button.pack(side=tk.LEFT, padx=10, pady=8)
        self.next_button.pack(side=tk.RIGHT, padx=10, pady=8)

        self.update_nav_buttons()

    def on_search(self):
        self.results = search_songs(self.name_entry.get(), self.artist_entry.get())
        print(f"Found {len(self.results)} results!")
        self.current_page = 0
        self.refresh_displayed_results()

    def refresh_displayed_results(self):
        self.displayed_results = []
        start = self.current_page * self.page_size
        end = min(start + self.page_size, len(self.results))
        for i in range(start, end):
            self.displayed_results.append(self.results[i])
        for i in range(10):
            if i < len(self.displayed_results):
                r = self.displayed_results[i]
                text = f"{r['name']} ({r['category']})\nSP: {r['sp']} | DP: {r['dp']}"
                self.song_buttons[i].config(
                    text=text,
                    state="normal",
                    command=lambda res=r: self.on_song_click(res)
                )
            else:
                self.song_buttons[i].config(text="", state="disabled", command=lambda: None)
        self.update_nav_buttons()

    def update_nav_buttons(self):
        self.prev_button.config(state="normal" if self.current_page > 0 else "disabled")
        more = (self.current_page + 1) * self.page_size < len(self.results)
        self.next_button.config(state="normal" if more else "disabled")

    def on_prev(self):
        if self.current_page > 0:
            self.current_page -= 1
            self.refresh_displayed_results()

    def on_next(self):
        if (self.current_page + 1) * self.page_size < len(self.results):
            self.current_page += 1
            self.refresh_displayed_results()

    def on_song_click(self, res):
        if hasattr(self, 'loading_label'):
            self.loading_label.config(text="Downloading...")
        else:
            self.loading_label = tk.Label(self.top_frame, text="Downloading...")
            self.loading_label.grid(row=3, column=0, columnspan=2)
        for b in self.song_buttons:
            b.config(state="disabled")
        t = threading.Thread(target=lambda: self.thread_download(res))
        t.start()
        print(f"\nYou selected: {res['name']}")
        print(f"Category: {res['category']}")
        print(f"SP: {res['sp']} | DP: {res['dp']}")
        print(f"Download: {res['link']}")
        download_and_extract(res)

    def thread_download(self, res):
        try:
            download_and_extract(res)
        finally:
            self.root.after(0, self.finish_download)

    def finish_download(self):
        if hasattr(self, 'loading_label'):
            self.loading_label.config(text="")
        for i, r in enumerate(self.displayed_results):
            self.song_buttons[i].config(state="normal")


def main():
    global STEPmania_ROOT_DIR, STEPMANIA_SONGS_DIR
    root = tk.Tk()
    STEPmania_ROOT_DIR = get_stepmania_directory(root)
    STEPMANIA_SONGS_DIR = os.path.join(STEPmania_ROOT_DIR, "Songs", "AutoDownloaded")
    os.makedirs(STEPMANIA_SONGS_DIR, exist_ok=True)
    print(f"✅ StepMania Songs Directory: {STEPMANIA_SONGS_DIR}")
    app = App(root)
    root.mainloop()

if __name__ == "__main__":
    main()

