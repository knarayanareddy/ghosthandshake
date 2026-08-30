#!/usr/bin/env python3
"""
Scene animator: turns 9 still keyframes into motion clips with
cinematic camera moves (push-ins, pull-back reveals, pans, handheld sway),
then assembles them with smooth crossfade transitions, film grain,
vignette and a gentle grade. Output: 1080x1920 @ 24fps, H.264 + AAC.
"""
import os, subprocess, sys

FF = os.path.expanduser("~/bin/ffmpeg")
ROOT = os.path.dirname(os.path.abspath(__file__))
KEY = os.path.join(ROOT, "keyframes")
BUILD = os.path.join(ROOT, "build")
OUT = os.path.join(ROOT, "out")
os.makedirs(BUILD, exist_ok=True)
os.makedirs(OUT, exist_ok=True)

W, H, FPS = 1080, 1920, 24
HEAD = 1.22                      # overscan headroom for camera moves
SW, SH = 1318, 2342              # scaled canvas (W*HEAD, H*HEAD rounded even)
D = 0.7                          # crossfade duration
FADE_AUDIO = False

# scene file, duration, z0,z1, px0,px1, py0,py1, sway px
SCENES = [
    ("scene01_notebook.png",       7, 1.00, 1.13, .42, .40, .40, .46, 2.0),
    ("scene02_giant_pencil.png",   7, 1.04, 1.19, .48, .58, .40, .55, 3.0),
    ("scene03_monster_scare.png",  8, 1.20, 1.03, .28, .50, .35, .40, 4.0),
    ("scene04_fan_sheets.png",     7, 1.05, 1.21, .55, .45, .45, .50, 5.0),
    ("scene05_paper_plane_ride.png",8,1.16, 1.04, .35, .60, .30, .45, 4.0),
    ("scene06_fishing.png",        7, 1.06, 1.17, .50, .52, .30, .55, 2.0),
    ("scene07_coffee_surprise.png",7, 1.02, 1.18, .50, .50, .45, .58, 2.0),
    ("scene08_beach_umbrella.png", 8, 1.12, 1.05, .30, .68, .42, .45, 3.0),
    ("scene09_paper_lift.png",     8, 1.00, 1.16, .50, .48, .45, .58, 2.0),
]

# transitions between consecutive scenes
TRANS = ["fade", "smoothup", "fade", "circleopen", "fade", "fade", "fade", "fadewhite"]


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(r.stderr[-1800:])
        sys.exit(1)


def scene_filter(idx, z0, z1, px0, px1, py0, py1, sway, dur):
    n = int(dur * FPS)
    e = f"(on/{n - 1})"                       # linear progress 0..1
    sm = f"({e}*{e}*(3-2*{e}))"               # smoothstep easing
    zexpr = f"{z0}+({z1}-{z0})*{sm}"
    px = f"({px0}+({px1}-{px0})*{sm})"
    py = f"({py0}+({py1}-{py0})*{sm})"
    x = (f"max(0,min(iw-iw/zoom,(iw-iw/zoom)*{px}+{sway}*sin(on/14)))")
    y = (f"max(0,min(ih-ih/zoom,(ih-ih/zoom)*{py}+{sway * 0.6}*sin(on/9+1.3)))")
    return (
        f"scale={SW}:{SH}:flags=lanczos,"
        f"zoompan=z='min({HEAD},{zexpr})':x='{x}':y='{y}':d={n}:s={W}x{H}:fps={FPS},"
        f"unsharp=5:5:0.35:5:5:0.0,format=yuv420p"
    )


def build_clips():
    for i, (fname, dur, z0, z1, px0, px1, py0, py1, sway) in enumerate(SCENES):
        outp = os.path.join(BUILD, f"clip{i}.mp4")
        vf = scene_filter(i, z0, z1, px0, px1, py0, py1, sway, dur)
        cmd = [FF, "-y", "-hide_banner", "-loglevel", "error",
               "-i", os.path.join(KEY, fname),
               "-vf", vf, "-frames:v", str(int(dur * FPS)),
               "-c:v", "libx264", "-preset", "veryfast", "-crf", "15",
               "-r", str(FPS), outp]
        print(f"  clip{i}: {fname} ({dur}s)")
        run(cmd)


def assemble():
    total = sum(s[1] for s in SCENES) - D * (len(SCENES) - 1)
    silent = os.path.join(BUILD, "video_silent.mp4")
    inputs = []
    for s in SCENES:
        inputs += ["-i", os.path.join(BUILD, f"clip{SCENES.index(s)}.mp4")]
    fc, prev, off = [], "[0:v]", 0.0
    for k in range(1, len(SCENES)):
        off += SCENES[k - 1][1] - D
        out = f"[x{k}]"
        fc.append(f"{prev}[{k}:v]xfade=transition={TRANS[k - 1]}:duration={D}:offset={off:.3f}{out}")
        prev = out
    finish = (f"{prev}eq=contrast=1.05:saturation=1.07:brightness=0.01,"
              f"vignette=angle=PI/4.6,"
              f"noise=alls=5:allf=t+u,format=yuv420p[vout]")
    fc.append(finish)
    cmd = [FF, "-y", "-hide_banner", "-loglevel", "error"] + inputs + [
        "-filter_complex", ";".join(fc), "-map", "[vout]",
        "-c:v", "libx264", "-preset", "medium", "-crf", "19",
        "-r", str(FPS), "-movflags", "+faststart", silent]
    print(f"  assembling {total:.1f}s timeline with {len(TRANS)} transitions")
    run(cmd)
    return total


def mux(total):
    final = os.path.join(OUT, "sketchbook_comes_alive_9x16.mp4")
    wav = os.path.join(BUILD, "soundtrack.wav")
    cmd = [FF, "-y", "-hide_banner", "-loglevel", "error",
           "-i", os.path.join(BUILD, "video_silent.mp4"),
           "-i", wav,
           "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "44100",
           "-shortest", "-movflags", "+faststart", final]
    run(cmd)
    print(f"  final: {final} ({os.path.getsize(final) / 1e6:.1f} MB, {total:.1f}s)")


if __name__ == "__main__":
    print("[1/3] animating scenes...")
    build_clips()
    print("[2/3] assembling timeline...")
    total = assemble()
    print("[3/3] muxing soundtrack...")
    mux(total)
