"""Generate the "someone is actually working" clip. Run by hand, once.

    GEMINI_API_KEY=... python apps/console/scripts/make-studio-video.py

WHY THERE IS NO SCREEN IN THIS SHOT
-----------------------------------
The obvious version of this brief is an engineer at a desk with the GHARANA
console glowing on the monitor. That version cannot be generated, and the reason
is not squeamishness.

A model asked to render "our product" invents an interface: plausible panels,
plausible labels, plausible numbers. Those numbers would be the first fabricated
measurements GHARANA has ever published, on the page that exists to promise it
never publishes any. The last clip already demonstrated the failure mode in
miniature — Veo wrote "SU" and "MTU" onto a rack unit, meaningless lettering
that had to be cropped out before shipping. At interface scale that becomes
paragraphs of confident nonsense, and it is exactly the generated-looking tell
this redesign was written to remove.

So: hands, faders, the room. Any monitor is off-frame, switched off, or thrown
so far out of focus that nothing on it could be read as a claim.

The real product footage is a screen recording of the deployed console, driven
by Playwright — see scripts/record-console-demo.py. That one shows real runs,
real approvals and real measured numbers, because they exist.
"""

from __future__ import annotations

import os
import sys
import time
from pathlib import Path

PROMPT = """Cinematic macro shot inside a professional mixing studio at night,
lit only by a single warm desk lamp far off to the left and the faint glow of
hardware. Shallow depth of field, slow steady push-in over eight seconds, no
cuts.

A recording engineer's hands rest on a large analogue mixing console. One hand
moves a single channel fader upward slowly and deliberately, then pauses. The
knuckles and tendons are visible; the skin is real and textured. In the
background, thrown completely out of focus, the dark shapes of monitor speakers
and rack gear, with one small lime-yellow indicator LED glowing.

Palette: black, deep neutral grey, brushed aluminium, one warm key light. Fine
film grain, 35mm look, no lens flare. Calm, expensive, unhurried — a mastering
suite at 2am. Documentary realism, not an advertisement."""

NEGATIVE = (
    "computer screens, monitors, displays, user interface, software, windows, "
    "dashboards, waveforms on a screen, text, letters, numbers, labels, "
    "watermarks, logos, faces, portraits, smiling, colourful RGB lighting, "
    "purple, blue, teal, neon, lens flare, bloom, stock footage look, fast "
    "cuts, camera shake, zoom, extra fingers, deformed hands"
)

OUT = Path(__file__).resolve().parents[1] / "public" / "studio-raw.mp4"


def main() -> int:
    key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not key:
        print("set GEMINI_API_KEY", file=sys.stderr)
        return 2

    from google import genai
    from google.genai import types

    client = genai.Client(api_key=key)
    print("requesting generation...")
    op = client.models.generate_videos(
        model="veo-3.1-generate-preview",
        prompt=PROMPT,
        config=types.GenerateVideosConfig(aspect_ratio="16:9", negative_prompt=NEGATIVE),
    )
    waited = 0
    while not op.done:
        time.sleep(10)
        waited += 10
        print(f"  waiting... {waited}s")
        op = client.operations.get(op)

    if not getattr(op, "response", None) or not op.response.generated_videos:
        print(f"no video returned: {op}", file=sys.stderr)
        return 1

    video = op.response.generated_videos[0].video
    client.files.download(file=video)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    video.save(str(OUT))
    print(f"saved {OUT} ({OUT.stat().st_size / 1_000_000:.1f} MB)")
    print("Inspect EVERY frame for invented lettering before shipping it.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
