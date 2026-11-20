#!/usr/bin/env python3
"""Capture screenshots/ from the running app with headless Chrome shell,
then compress each to the gate limits (<=256 KiB, long side <=1280)."""
import json
import os
import subprocess
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.abspath(__file__))
CHROME = os.path.expanduser(
    "~/.cache/ms-playwright/chromium_headless_shell-1255/"
    "chrome-headless-shell-linux64/chrome-headless-shell"
)
PORT = os.environ.get("PORT", "8080")

with open(os.path.join(ROOT, "shots.json")) as f:
    shots = json.load(f)

out_dir = os.path.join(ROOT, "screenshots")
os.makedirs(out_dir, exist_ok=True)

for shot in shots:
    url = f"http://localhost:{PORT}/{shot['query']}"
    tmp = os.path.join("/tmp", f"shot-{shot['name']}.png")
    cmd = [
        CHROME, "--headless", "--disable-gpu", "--no-sandbox",
        "--hide-scrollbars", "--force-device-scale-factor=1",
        f"--window-size={shot['w']},{shot['h']}",
        "--virtual-time-budget=12000",
        f"--screenshot={tmp}", url,
    ]
    print("capturing", shot["name"], url)
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    if r.returncode != 0 or not os.path.exists(tmp):
        print("FAILED", shot["name"], r.stdout[-500:], r.stderr[-500:])
        sys.exit(1)
    im = Image.open(tmp).convert("RGB")
    print("  raw", im.size)
    # Fit inside the gate limits without enlarging.
    scale = min(1.0, 1280 / max(im.size))
    if scale < 1.0:
        im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
    dest = os.path.join(out_dir, shot["name"])
    quality = 88
    while quality >= 55:
        im.save(dest, "JPEG", quality=quality, optimize=True)
        if os.path.getsize(dest) <= 256 * 1024:
            break
        quality -= 8
    print("  saved", dest, im.size, os.path.getsize(dest), "bytes, quality", quality)
    os.remove(tmp)
print("done")
