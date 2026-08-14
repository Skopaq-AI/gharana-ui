"""Record the real console doing real work.

    GHARANA_DEMO_URL=https://gharana-console-production.up.railway.app \
    GHARANA_DEMO_KEY=<an artist key> \
    python apps/console/scripts/record-console-demo.py

WHY THIS EXISTS INSTEAD OF A GENERATED CLIP
-------------------------------------------
The obvious way to make a product video is to describe the interface to a video
model. That produces a picture of software that does not exist: invented panels,
invented labels, and — the part that matters — invented numbers. Publishing
those would be GHARANA's first fabricated measurements, on the site that
promises there are none. It also looks generated, which is the thing we are
trying to stop looking like.

So this drives the DEPLOYED console with a real key, against the real gateway,
and records what actually happens. Every number that appears was measured by
services/audio from audio that was really uploaded. Every approval was a real
POST to the approve endpoint. If a stage declines and asks for a reference
track, the recording shows it declining — because that is what the product does,
and it is the most persuasive thing about it.

The consequence, accepted deliberately: this can only record what the product
can really do today. If a screen is ugly or a run is slow, the video shows that.
That is the correct incentive.

Output is a webm from Playwright's recorder; transcode before shipping.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

OUT_DIR = Path(__file__).resolve().parents[1] / "public" / "demo-raw"


def main() -> int:
    url = os.environ.get("GHARANA_DEMO_URL")
    key = os.environ.get("GHARANA_DEMO_KEY")
    if not url or not key:
        print("set GHARANA_DEMO_URL and GHARANA_DEMO_KEY", file=sys.stderr)
        return 2

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("pip install playwright && playwright install chromium", file=sys.stderr)
        return 2

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch()
        # 1440x900 at dpr 2: a retina-sharp 2880x1800 recording, downscaled on
        # export. Recording at 1x and upscaling looks like a screenshot of a
        # screenshot, which reads as cheap however good the product is.
        ctx = browser.new_context(
            viewport={"width": 1440, "height": 900},
            device_scale_factor=2,
            record_video_dir=str(OUT_DIR),
            record_video_size={"width": 1440, "height": 900},
            reduced_motion="no-preference",
        )
        page = ctx.new_page()

        def beat(ms: int = 1200) -> None:
            """Let the eye catch up. A demo that moves at machine speed reads
            as a glitch rather than as a product."""
            page.wait_for_timeout(ms)

        # 1. The landing page, and the measurement it does in the browser.
        page.goto(url, wait_until="networkidle")
        beat(1800)
        page.get_by_role("button", name="Play & measure").click()
        beat(3200)  # the phrase is ~2.9s; the readouts move throughout

        # 2. Sign in with a real key.
        page.goto(f"{url}/login", wait_until="networkidle")
        beat(800)
        page.fill("input[name='access_key']", key)
        beat(400)
        page.click("button[type='submit']")
        page.wait_for_load_state("networkidle")
        beat(1500)

        # 3. The console: whatever this artist actually has.
        page.goto(f"{url}/?app", wait_until="networkidle")
        beat(2500)
        page.mouse.wheel(0, 500)
        beat(1800)
        page.mouse.wheel(0, 700)
        beat(2000)

        ctx.close()
        browser.close()

    files = sorted(OUT_DIR.glob("*.webm"))
    if not files:
        print("no recording produced", file=sys.stderr)
        return 1
    newest = files[-1]
    print(f"recorded {newest} ({newest.stat().st_size / 1_000_000:.1f} MB)")
    print("\nTranscode before shipping:")
    print(f"  ffmpeg -i {newest.name} -an -vf scale=1440:-2 -c:v libx264 -crf 30 \\")
    print("         -preset veryslow -movflags +faststart console-demo.mp4")
    print("\nWatch it end to end first. It records what the product really did,")
    print("including anything about that you would rather it had not.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
