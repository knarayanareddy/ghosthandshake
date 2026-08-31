#!/usr/bin/env python3
"""THE SKETCHBOOK ODYSSEY — final assembly.
36 shots -> zoompan camera moves -> xfade timeline (303s target, synced to
build/score.wav) -> narration fitted & placed -> final H.264 + AAC MP4."""
import os, subprocess, sys, wave
import numpy as np

FF = os.path.expanduser("~/bin/ffmpeg")
ROOT = os.path.dirname(os.path.abspath(__file__))
FR = os.path.join(ROOT, "frames")
NAR = os.path.join(ROOT, "narration")
BUILD = os.path.join(ROOT, "work")
os.makedirs(BUILD, exist_ok=True)

W, H, FPS = 1080, 1920, 24
HEAD = 1.22
SW, SH = 1318, 2342
D = 0.7                     # crossfade duration
TARGET = 303.0              # score length

# (frame, dur, z0,z1, px0,px1, py0,py1, sway)
SHOTS = [
    ("A0_moonlit_notebook.png",   6.0, 1.00,1.12, .50,.50, .45,.55, 1.5),
    ("A1_folding_the_boat.png",   6.5, 1.05,1.18, .46,.54, .42,.50, 2.0),
    ("A2_boat_placed_on_page.png",6.5, 1.12,1.02, .50,.48, .50,.44, 1.5),
    ("A3_scrib_awakens.png",      6.0, 1.03,1.20, .50,.52, .55,.45, 2.5),
    ("A4_the_god_and_the_eraser.png",8.0,1.18,1.04, .40,.50, .30,.42, 2.5),
    ("A5_hatch_half_erased.png",  8.0, 1.06,1.22, .48,.52, .45,.55, 2.0),
    ("A6_cup_council_prophecy.png",8.0,1.02,1.15, .50,.48, .42,.52, 2.0),
    ("A7_launch_down_the_spine.png",8.0,1.10,1.24, .40,.60, .40,.50, 4.0),
    ("A8_desk_sea_sunrise.png",   9.5, 1.20,1.04, .35,.62, .32,.45, 2.5),
    ("B1_fan_storm_leviathan.png",9.0, 1.04,1.20, .55,.45, .45,.52, 5.0),
    ("B2_monster_anchor.png",     8.5, 1.12,1.05, .48,.52, .45,.50, 4.5),
    ("B3_ink_canyon.png",         8.0, 1.05,1.19, .50,.46, .50,.55, 2.0),
    ("B4_pencil_bridge.png",      9.0, 1.08,1.22, .48,.55, .40,.50, 2.5),
    ("B5_bridge_un_drawn.png",    8.5, 1.20,1.06, .52,.48, .42,.48, 3.5),
    ("B6_whirlpool_reveal.png",   8.5, 1.04,1.18, .50,.50, .42,.55, 2.0),
    ("B7_stirring_promise.png",   8.0, 1.06,1.16, .48,.52, .50,.46, 1.5),
    ("B8_siren_beach_conga.png",  9.0, 1.08,1.06, .28,.70, .45,.48, 2.5),
    ("B9_radio_bell_wake.png",    8.5, 1.10,1.20, .55,.48, .35,.50, 2.0),
    ("B10_hug_toll.png",          8.5, 1.04,1.15, .50,.50, .45,.52, 2.0),
    ("B11_full_crew_rowing.png",  9.0, 1.10,1.05, .30,.68, .48,.45, 3.0),
    ("C1_eraser_on_horizon.png",  8.0, 1.05,1.16, .50,.50, .40,.52, 1.5),
    ("C2_crumb_rain.png",         8.0, 1.06,1.18, .48,.52, .45,.52, 3.0),
    ("C3_scrib_half_erased.png",  8.5, 1.04,1.22, .50,.50, .50,.45, 1.5),
    ("C4_crew_fading.png",        8.0, 1.08,1.18, .50,.50, .45,.52, 2.5),
    ("C5_bird_carries_scrib.png", 8.5, 1.05,1.22, .50,.46, .55,.38, 2.0),
    ("D1_the_hand_gasps.png",    10.0, 1.16,1.05, .52,.48, .40,.48, 2.0),
    ("D2_drawer_of_kept_things.png",10.0,1.04,1.18, .50,.50, .45,.55, 1.5),
    ("D3_childhood_painting.png", 10.0, 1.06,1.15, .48,.54, .45,.50, 1.5),
    ("D4_hatch_redrawn.png",     10.0, 1.05,1.20, .50,.50, .48,.52, 1.5),
    ("D5_color_flood.png",       10.0, 1.02,1.18, .50,.50, .50,.45, 2.0),
    ("D6_painted_crew_joy.png",  10.0, 1.10,1.04, .30,.66, .45,.50, 2.0),
    ("D7_scrib_at_the_edge.png", 10.0, 1.06,1.20, .50,.48, .50,.42, 1.5),
    ("D8_the_hand_watches.png",  10.0, 1.12,1.04, .42,.58, .42,.48, 1.5),
    ("E1_beyond_the_page.png",    9.0, 1.04,1.20, .50,.50, .45,.55, 1.5),
    ("E2_title_card.png",         8.0, 1.00,1.06, .50,.50, .50,.48, 0.8),
    ("B7_stirring_promise.png",   7.0, 1.10,1.20, .60,.40, .50,.55, 1.5),  # S36 post-credits gag (reframe)
]

TRANS = [
    "fade","fade","fade","fade","dissolve","fade","smoothup","fade","fade",
    "fade","smoothleft","fade","fade","circleopen","fade","fade","fade","fade",
    "fade","fade","dissolve","dissolve","dissolve","fade","fadeblack","fade",
    "fade","fade","fadewhite","fade","fade","fade","fade","fadeblack","fade",
]

# narration: (file, shot_index, offset_in_shot)
NARR = [
    ("N01_invocation.mp3",      0, 0.8), ("N02_the_hand_creates.mp3",  1, 0.5),
    ("N03_scrib_introduced.mp3",3, 0.5), ("N04_morning_gods.mp3",       4, 0.8),
    ("N05_hatch_erased.mp3",    5, 0.8), ("N06_prophecy.mp3",           6, 0.6),
    ("N07_launch.mp3",          7, 0.6), ("N08_fan_storm.mp3",          9, 0.8),
    ("N09_monster_anchor.mp3", 10, 0.8), ("N10_bridge_plan.mp3",       12, 0.8),
    ("N11_whirlpool_promise.mp3",14,0.8),("N12_sirens.mp3",            16, 0.8),
    ("N13_one_note.mp3",       17, 0.8), ("N14_hug_toll.mp3",           18, 0.8),
    ("N15_dusk_early.mp3",     20, 0.8), ("N16_half_erased.mp3",        22, 1.0),
    ("N17_bird_carries.mp3",   24, 0.5), ("N18_gods_can_cry.mp3",       25, 1.2),
    ("N19_book_of_kept.mp3",   27, 0.8), ("N20_color_sunrise.mp3",      29, 0.8),
    ("N21_looked_back_once.mp3",31,0.8), ("N22_never_lost.mp3",         33, 0.5),
    ("N23_title_line.mp3",     34, 0.8),
]


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(r.stderr[-1600:]); sys.exit(1)


def dur_of(path):
    out = subprocess.run([FF, "-hide_banner", "-i", path], capture_output=True, text=True).stderr
    hh, mm, ss = out.split("Duration: ")[1].split(",")[0].strip().split(":")
    return int(hh) * 3600 + int(mm) * 60 + float(ss)


def scene_filter(z0, z1, px0, px1, py0, py1, sway, dur):
    n = int(dur * FPS)
    e = f"(on/{n - 1})"
    sm = f"({e}*{e}*(3-2*{e}))"
    zexpr = f"{z0}+({z1}-{z0})*{sm}"
    px = f"({px0}+({px1}-{px0})*{sm})"
    py = f"({py0}+({py1}-{py0})*{sm})"
    x = f"max(0,min(iw-iw/zoom,(iw-iw/zoom)*{px}+{sway}*sin(on/14)))"
    y = f"max(0,min(ih-ih/zoom,(ih-ih/zoom)*{py}+{sway * 0.6}*sin(on/9+1.3)))"
    return (f"scale={SW}:{SH}:flags=lanczos,"
            f"zoompan=z='min({HEAD},{zexpr})':x='{x}':y='{y}':d={n}:s={W}x{H}:fps={FPS},"
            f"unsharp=5:5:0.35:5:5:0.0,format=yuv420p")


def build_clips(shots):
    paths = []
    for i, (fname, dur, z0, z1, px0, px1, py0, py1, sway) in enumerate(shots):
        outp = os.path.join(BUILD, f"o{i:02d}.mp4")
        if os.path.exists(outp) and abs(dur_of(outp) - dur) < 0.15:
            paths.append(outp)
            continue
        cmd = [FF, "-y", "-hide_banner", "-loglevel", "error",
               "-i", os.path.join(FR, fname),
               "-vf", scene_filter(z0, z1, px0, px1, py0, py1, sway, dur),
               "-frames:v", str(int(dur * FPS)),
               "-c:v", "libx264", "-preset", "veryfast", "-crf", "15",
               "-r", str(FPS), outp]
        run(cmd); paths.append(outp)
        if i % 6 == 0: print(f"  clip {i + 1}/{len(shots)}")
    return paths


def assemble(clip_paths, durs, total, silent):
    # hierarchical: 3 chunks of 12 (fits memory), baked dip-to-black at joints
    JOINTS = (11, 23)          # clip indices where a chunk boundary falls
    for j in JOINTS:
        d = durs[j]
        run([FF, "-y", "-hide_banner", "-loglevel", "error", "-i", clip_paths[j],
             "-vf", f"fade=t=out:st={d - 0.75:.2f}:d=0.75,format=yuv420p",
             "-c:v", "libx264", "-preset", "veryfast", "-crf", "15",
             "-r", str(FPS), clip_paths[j] + ".fadeout.mp4"])
        run([FF, "-y", "-hide_banner", "-loglevel", "error", "-i", clip_paths[j + 1],
             "-vf", "fade=t=in:d=0.75,format=yuv420p",
             "-c:v", "libx264", "-preset", "veryfast", "-crf", "15",
             "-r", str(FPS), clip_paths[j + 1] + ".fadein.mp4"])
        clip_paths[j] = clip_paths[j] + ".fadeout.mp4"
        clip_paths[j + 1] = clip_paths[j + 1] + ".fadein.mp4"

    chunks = []
    for ci, (a, b) in enumerate([(0, 11), (12, 23), (24, 35)]):
        inputs = []
        for p in clip_paths[a:b + 1]: inputs += ["-i", p]
        fc, prev, off = [], "[0:v]", 0.0
        for k in range(a + 1, b + 1):
            off += durs[k - 1] - D
            fc.append(f"{prev}[{k - a}:v]xfade=transition={TRANS[k - 1]}:duration={D}:offset={off:.3f}[x{k}]")
            prev = f"[x{k}]"
        fc.append(f"{prev}format=yuv420p[vout]")
        outp = os.path.join(BUILD, f"chunk{ci}.mp4")
        expect = sum(durs[a:b + 1]) - D * (b - a)
        if os.path.exists(outp) and abs(dur_of(outp) - expect) < 0.3:
            chunks.append(outp)
            print(f"  chunk {ci + 1}/3 reused")
            continue
        run([FF, "-y", "-hide_banner", "-loglevel", "error"] + inputs +
            ["-filter_complex", ";".join(fc), "-map", "[vout]",
             "-c:v", "libx264", "-preset", "medium", "-crf", "18",
             "-r", str(FPS), outp])
        chunks.append(outp)
        print(f"  chunk {ci + 1}/3 done")

    finish = ("eq=contrast=1.05:saturation=1.06:brightness=0.01,"
              "vignette=angle=PI/4.6,noise=alls=5:allf=t+u,"
              "fade=t=in:d=1.2,fade=t=out:st={:.2f}:d=1.6,format=yuv420p[vout]").format(total - 1.6)
    run([FF, "-y", "-hide_banner", "-loglevel", "error",
         "-i", chunks[0], "-i", chunks[1], "-i", chunks[2],
         "-filter_complex", "[0:v][1:v][2:v]concat=n=3:v=1:a=0[cat];[cat]" + finish,
         "-map", "[vout]", "-c:v", "libx264", "-preset", "medium", "-crf", "19",
         "-r", str(FPS), "-movflags", "+faststart", silent])
    return silent


def mix_audio(total, starts):
    SR = 44100
    n = int(SR * total)
    score = np.zeros((n, 2)); narr = np.zeros((n, 2))
    with wave.open(os.path.join(BUILD, "score.wav"), "rb") as w:
        raw = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16)
    sc = raw.reshape(-1, 2).astype(np.float64) / 32767.0
    m = min(n, len(sc)); score[:m] = sc[:m]

    anchors = []
    for fname, si, off in NARR:
        anchors.append((os.path.join(NAR, fname), starts[si] + off))
    for i, (src, t0) in enumerate(anchors):
        t1 = anchors[i + 1][1] - 0.35 if i + 1 < len(anchors) else min(total - 1.0, t0 + 8)
        slot = max(2.0, t1 - t0)
        dsrc = dur_of(src)
        tempo = min(1.32, max(1.0, dsrc / slot))
        wav = os.path.join(BUILD, f"n{i:02d}.wav")
        run([FF, "-y", "-hide_banner", "-loglevel", "error", "-i", src,
             "-filter:a", (f"atempo={tempo:.4f}" if tempo > 1.001 else "anull"),
             "-ar", str(SR), "-ac", "2", wav])
        with wave.open(wav, "rb") as w:
            raw = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16)
        sig = raw.reshape(-1, 2).astype(np.float64) / 32767.0
        sig *= 0.88 / (np.abs(sig).max() + 1e-9)
        i0 = int(t0 * SR); i1 = min(i0 + len(sig), n)
        narr[i0:i1] += sig[:i1 - i0]
        print(f"  {os.path.basename(src)} @ {t0:6.2f}s  slot {slot:4.1f}s tempo {tempo:.2f}")
    mix = np.tanh(score * 1.0 + narr * 1.25) * 0.92
    out = os.path.join(BUILD, "odyssey_mix.wav")
    data = (np.clip(mix, -1, 1) * 32767).astype(np.int16)
    with wave.open(out, "w") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(data.tobytes())
    return out


def main():
    shots = list(SHOTS)
    # fit E2 (title card) so the film lands exactly on the score length
    base = sum(s[1] for s in shots) - D * (len(shots) - 1)
    shots[-2] = (shots[-2][0], shots[-2][1] + max(0.0, TARGET - base), *shots[-2][2:])
    total = sum(s[1] for s in shots) - D * (len(shots) - 1)
    durs = [s[1] for s in shots]
    starts = [sum(durs[:i]) - D * i for i in range(len(shots))]
    print(f"[1/4] animating {len(shots)} shots (timeline {total:.1f}s)...")
    clips = build_clips(shots)
    print("[2/4] assembling timeline...")
    silent = assemble(clips, durs, total, os.path.join(BUILD, "odyssey_silent.mp4"))
    print("[3/4] narration + score mix...")
    mix = mix_audio(total, starts)
    print("[4/4] muxing...")
    final = os.path.join(ROOT, "sketchbook_odyssey_9x16.mp4")
    run([FF, "-y", "-hide_banner", "-loglevel", "error", "-i", silent, "-i", mix,
         "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", final])
    print(f"FINAL: {final} ({os.path.getsize(final) / 1e6:.1f} MB, {dur_of(final):.1f}s)")


if __name__ == "__main__":
    main()
