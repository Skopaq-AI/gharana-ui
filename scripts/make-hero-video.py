"""Generate the landing hero's ambient loop with Veo, once.

Run by hand, not in CI: it costs money per invocation and the output is
committed. Kept in the repo so the prompt that produced the asset is part of the
record — the same reason the still image's prompt is in the commit message.
Regenerating without changing the prompt should not be necessary.

    GEMINI_API_KEY=... python apps/console/scripts/make-hero-video.py

WHAT THIS ASSET IS ALLOWED TO BE
--------------------------------
Atmosphere. Studio hardware in the dark, evocative of the room this product is
used in.

It is explicitly NOT allowed to depict the product: no screens, no waveforms, no
readouts, no numbers. A generated shot of a GHARANA interface would be a picture
of software that does not exist, on the marketing site of a system whose entire
claim is that it never shows you something nothing produced. The rule is about
fabricated *evidence*, and a rendered UI is fabricated evidence in the most
literal way available.
"""

from __future__ import annotations

import os
import sys
import time
from pathlib import Path

PROMPT = """Extreme macro cinematography of vintage analogue studio hardware in
near-total darkness. One hard key light rakes across brushed metal at a shallow
angle from the left. A single slow, steady dolly move from left to right across
eight seconds. No cuts, no zoom, no camera shake.

In frame: the knurled aluminium edge of a mixing console rotary knob catching a
thin specular highlight, and behind it, thrown far out of focus, the machined
faceplate of a rack-mounted compressor with visible screw heads and brushed
grain. One very small lime-yellow indicator LED glows steadily as the only
colour anywhere in the frame.

Palette: almost entirely black and dark neutral grey, metal highlights in cool
white, shadows that stay genuinely black with no lift. Macro lens, very shallow
depth of field, fine film grain. Photorealistic, calm, precise, expensive — a
mastering suite at 2am, not a stock-footage music studio."""

NEGATIVE = (
    "text, letters, numbers, watermarks, logos, user interface, screens, "
    "monitors, waveforms, meters with readable scales, people, hands, faces, "
    "colourful lighting, purple, blue, teal, RGB, neon, gradients, lens flare, "
    "bokeh balls, glossy plastic, cheap consumer gear, headphones, microphones, "
    "laptops, stock footage look, fast cuts, camera shake, zoom"
)

OUT = Path(__file__).resolve().parents[1] / "public" / "console-hero.mp4"


def main() -> int:
    key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not key:
        print("set GEMINI_API_KEY (or GOOGLE_API_KEY)", file=sys.stderr)
        return 2

    from google import genai
    from google.genai import types

    client = genai.Client(api_key=key)
    print("requesting generation (this takes a few minutes)...")
    operation = client.models.generate_videos(
        model="veo-3.1-generate-preview",
        prompt=PROMPT,
        config=types.GenerateVideosConfig(
            aspect_ratio="16:9",
            negative_prompt=NEGATIVE,
        ),
    )

    waited = 0
    while not operation.done:
        time.sleep(10)
        waited += 10
        print(f"  waiting... {waited}s")
        operation = client.operations.get(operation)

    if not getattr(operation, "response", None) or not operation.response.generated_videos:
        print(f"no video returned: {operation}", file=sys.stderr)
        return 1

    video = operation.response.generated_videos[0].video
    client.files.download(file=video)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    video.save(str(OUT))
    print(f"saved {OUT} ({OUT.stat().st_size / 1_000_000:.1f} MB)")
    print("Now transcode for the web — a raw Veo mp4 is far too heavy for a hero:")
    print("  ffmpeg -i console-hero.mp4 -an -vf scale=1600:-2 -c:v libx264 -crf 30 \\")
    print("         -preset veryslow -movflags +faststart console-hero-h264.mp4")
    return 0


if __name__ == "__main__":
    sys.exit(main())
