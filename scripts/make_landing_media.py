#!/usr/bin/env python3
"""Generate the landing page's atmosphere: Veo clips and Imagen stills.

THE ONE RULE
------------
Nothing generated here may depict the GHARANA interface — no screens, no
waveforms, no readouts, no numbers, no lettering. A rendered UI would be
fabricated evidence, and it would be the first fabricated measurement this
project publishes, on the page that promises it publishes none. A visitor
cannot tell a mocked-up readout from a real one, and the whole argument of the
page is that they should never have to.

So: rooms, hands, metal, faders, light. Texture the copy sits on, carrying no
claim. Every prompt below states this negatively as well as positively, because
these models will happily invent a glowing dashboard if a prompt leaves room
for one, and they invent lettering even more readily.

Output goes to public/media/. Existing files are skipped unless
--force, because each clip costs money and a rerun should not re-bill for
assets that already shipped.
"""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path
from typing import Final

OUT: Final[Path] = Path(__file__).resolve().parents[1] / "public" / "media"
VEO_MODEL: Final[str] = "veo-3.1-fast-generate-preview"
#: imagen-4.0-generate-001 was here and answers 404 "no longer available to new
#: users" — listed by the API, unusable. Same trap as gemini-2.5-flash-lite and
#: gemini-3.1-pro-preview before it, which is why every model id in this repo is
#: checked against a live call rather than a docs page.
IMAGE_MODEL: Final[str] = "gemini-3-pro-image"

#: Shared negative clause. Repeated into every prompt rather than set once,
#: because these endpoints take no negative-prompt parameter that reliably
#: applies to both families.
#:
#: WHAT THE CLAUSE ASKS FOR VS WHAT THE RULE REQUIRES
#: --------------------------------------------------
#: It bans all lettering and numerals. That is deliberately broader than the
#: actual rule, because partial permission does not survive contact with these
#: models: ask for "no fake readouts" and you get a fake readout. So the prompt
#: overreaches on purpose and the returned image is judged against the real
#: boundary, which is narrower and is this:
#:
#:     nothing that a visitor could read as a measurement, a readout, or the
#:     GHARANA interface.
#:
#: Engraving that belongs to physical hardware — ON/OFF beside a toggle, knob
#: positions, a maker's mark — is outside that boundary and may ship. A needle
#: on a scale is inside it and may not, which is why the `outboard` prompt below
#: bans meters by name after its first attempt returned a VU meter.
#:
#: This carve-out is written down so it stays narrow. The failure it guards
#: against is not a stray glyph; it is a rendered panel with plausible numbers
#: on it, which a visitor cannot tell from a real one.
NO_UI: Final[str] = (
    " Absolutely no text, no lettering, no numbers, no logos, no computer screens, "
    "no phone screens, no software interfaces, no waveforms, no meters, no graphs. "
    "Physical objects and people only."
)

CLIPS: Final[tuple[tuple[str, str], ...]] = (
    (
        "faders",
        "Extreme close-up, shallow depth of field: a hand slowly pushes a single "
        "channel fader up on a large analogue mixing console. Brushed aluminium, "
        "worn knobs, dust in a shaft of warm afternoon light. Camera drifts a few "
        "centimetres left. Cinematic, moody, dark room, film grain." + NO_UI,
    ),
    (
        "tape",
        "Close-up of a reel-to-reel tape machine running, reels turning steadily, "
        "warm tungsten light raking across the metal. Slow push in. Dark studio, "
        "cinematic, shallow focus, film grain." + NO_UI,
    ),
    (
        "room",
        "Slow dolly through an empty professional recording live room at dusk: "
        "wood floor, acoustic panels, a microphone on a stand, an unoccupied stool. "
        "Soft directional light, dust motes. Cinematic, unhurried, film grain." + NO_UI,
    ),
)

STILLS: Final[tuple[tuple[str, str], ...]] = (
    (
        "console-metal",
        "Macro photograph of a vintage analogue mixing desk at an oblique angle, "
        "rows of faders and knobs, brushed metal and worn paint, dramatic low-key "
        "side lighting, deep shadows, shallow depth of field." + NO_UI,
    ),
    (
        "hands-guitar",
        "Low-key photograph of a musician's hands on an electric guitar neck in a "
        "dark studio, warm rim light, shallow depth of field, film grain." + NO_UI,
    ),
    (
        "cables",
        "Macro photograph of coiled patch cables and jack plugs on a dark surface, "
        "single warm light source, deep shadows, high contrast, shallow focus." + NO_UI,
    ),
    (
        # No VU meters. The first prompt here asked for them and got a needle on
        # a scale — which NO_UI forbids two lines further down, and which was in
        # this prompt because the author wrote it, not because the model
        # misbehaved. A meter is the one physical object on a studio rack that
        # reads as a measurement, and this page's whole argument is that the
        # only measurements on it are real ones.
        "outboard",
        "Macro photograph of a rack of vintage outboard studio compressors and "
        "equalisers seen at an oblique angle, rows of large metal knobs and toggle "
        "switches, brushed steel faceplates, visible screws, dramatic low-key side "
        "lighting, deep shadows, shallow depth of field. No meters, no dials with "
        "scales, no gauges, no needles." + NO_UI,
    ),
    (
        "vinyl",
        "Macro photograph of a vinyl record spinning on a turntable platter, tonearm "
        "and stylus in the groove, warm single light source raking across the grooves, "
        "deep shadows, shallow depth of field, film grain." + NO_UI,
    ),
)


def preflight(*, need_video: bool) -> None:
    """Fail before spending money, not after.

    Every tool this script needs downstream of a paid call is checked here.
    Twice now a generation run has died on the encode step with the API call
    already billed — first on an ffmpeg built without libwebp, then on a venv
    without Pillow. The lazy import inside ``to_webp`` was the whole reason: an
    ImportError cannot fire until after the image exists, by which point the
    money is gone. So the import happens up front, where it is free.
    """
    try:
        import PIL  # noqa: F401
    except ModuleNotFoundError:
        raise SystemExit(
            "Pillow is not installed, and it is what encodes every asset here.\n"
            "  pip install Pillow\n"
            "Checked now rather than after the first generate call, because that "
            "call costs money and this one does not."
        ) from None
    if need_video and shutil.which("ffmpeg") is None:
        raise SystemExit("ffmpeg is not on PATH; it encodes the Veo output. Install it first.")


def to_webp(src: Path, target: Path, *, width: int, quality: int = 82) -> None:
    """Resize and encode to WebP with Pillow.

    Not ffmpeg: this machine's build has no libwebp encoder, and the failure is
    a non-zero exit with "Unknown encoder" buried in stderr — which killed a
    whole generation run after the paid call had already succeeded.
    """
    from PIL import Image

    with Image.open(src) as im:
        resized = im.convert("RGB").resize(
            (width, round(width * im.height / im.width)), Image.LANCZOS
        )
        resized.save(target, "WEBP", quality=quality, method=6)


def encode(src: Path, stem: str) -> None:
    """MP4 + WebM, both muted-autoplay friendly and small enough for a hero.

    faststart matters: without it the moov atom sits at the end of the file and
    the browser buffers the whole clip before showing a frame, which on a
    landing page reads as a broken video rather than a slow one.
    """
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-i", str(src), "-an", "-vf", "scale=1280:-2",
         "-c:v", "libx264", "-crf", "30", "-preset", "slow", "-movflags", "+faststart",
         str(OUT / f"{stem}.mp4")], check=True,
    )  # fmt: skip
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-i", str(src), "-an", "-vf", "scale=1280:-2",
         "-c:v", "libvpx-vp9", "-crf", "40", "-b:v", "0", "-row-mt", "1",
         str(OUT / f"{stem}.webm")], check=True,
    )  # fmt: skip
    # A poster, so the panel is never empty while the clip loads. Extracted as
    # PNG then encoded by Pillow: the ffmpeg on this machine is built without
    # libwebp and fails with a bare "Unknown encoder", which is a confusing way
    # to lose an asset.
    frame = src.with_suffix(".poster.png")
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-ss", "1", "-i", str(src), "-frames:v", "1",
         str(frame)], check=True,
    )  # fmt: skip
    to_webp(frame, OUT / f"{stem}-poster.webp", width=960)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--force", action="store_true", help="regenerate assets that exist")
    parser.add_argument("--skip-video", action="store_true")
    parser.add_argument("--skip-images", action="store_true")
    args = parser.parse_args(argv)

    key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not key:
        print("GEMINI_API_KEY is not set", file=sys.stderr)
        return 2

    preflight(need_video=not args.skip_video)

    from google import genai

    client = genai.Client(api_key=key)
    OUT.mkdir(parents=True, exist_ok=True)
    # OUTSIDE public/. This was `OUT.parent / ".genmedia"`, which put the raw
    # originals under the console's served root: /.genmedia/room.mp4 answered
    # 200 with 2.9 MB of un-encoded Veo output to anyone who asked, and four of
    # them had been committed, so every console image carried 6.8 MB of files
    # nothing references. A leading dot hides a directory from `ls`, not from a
    # static file server.
    scratch = OUT.parent.parent / ".genmedia"
    scratch.mkdir(exist_ok=True)

    if not args.skip_images:
        for stem, prompt in STILLS:
            target = OUT / f"{stem}.webp"
            if target.exists() and not args.force:
                print(f"skip  {target.name} (exists)")
                continue
            raw = scratch / f"{stem}.png"
            # The raw PNG is written before it is encoded, so a crash in the
            # encode step leaves a paid-for image on disk. Reuse it rather than
            # buying the same picture twice — this is the retry path for exactly
            # the failure `preflight` now prevents, and it costs nothing to keep.
            if raw.exists() and not args.force:
                print(f"image {stem}… (re-encoding the saved original, no API call)")
                to_webp(raw, target, width=1400)
                print(f"      -> {target.name} ({target.stat().st_size // 1024} KB)")
                continue
            print(f"image {stem}…", flush=True)
            # generateContent, not generate_images: the gemini-*-image family
            # returns an inlineData part in the ordinary envelope.
            result = client.models.generate_content(model=IMAGE_MODEL, contents=prompt)
            blob = next(
                (
                    p.inline_data
                    for p in result.candidates[0].content.parts
                    if getattr(p, "inline_data", None)
                ),
                None,
            )
            if blob is None:
                print(f"      no image part returned for {stem}; skipping", file=sys.stderr)
                continue
            raw.write_bytes(blob.data)
            to_webp(raw, target, width=1400)
            print(f"      -> {target.name} ({target.stat().st_size // 1024} KB)")

    if not args.skip_video:
        for stem, prompt in CLIPS:
            if (OUT / f"{stem}.mp4").exists() and not args.force:
                print(f"skip  {stem}.mp4 (exists)")
                continue
            print(f"video {stem}… (Veo takes a few minutes)", flush=True)
            op = client.models.generate_videos(model=VEO_MODEL, prompt=prompt)
            waited = 0
            while not op.done:
                time.sleep(15)
                waited += 15
                op = client.operations.get(op)
                print(f"      …{waited}s", flush=True)
            video = op.response.generated_videos[0].video
            client.files.download(file=video)
            raw = scratch / f"{stem}.mp4"
            video.save(str(raw))
            encode(raw, stem)
            print(f"      -> {stem}.mp4 ({(OUT / f'{stem}.mp4').stat().st_size // 1024} KB)")

    print(
        "\nGenerated files must still be watched before shipping. These models "
        "invent lettering readily, and a clip with a fake readout in the corner "
        "is the one thing this page cannot carry."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
