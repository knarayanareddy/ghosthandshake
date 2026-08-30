#!/usr/bin/env python3
"""Mix narration clips over the existing score with automatic ducking,
then mux onto the film. Usage: python3 mix_narration.py"""
import os, subprocess, sys, wave
import numpy as np

FF = os.path.expanduser("~/bin/ffmpeg")
ROOT = os.path.dirname(os.path.abspath(__file__))
NAR = os.path.join(ROOT, "narration")
BUILD = os.path.join(ROOT, "build")
SR = 44100

# clip start times + tempo factors (matches narration/script.txt)
STARTS = [0.65, 7.99, 14.75, 22.10, 28.48, 35.70, 41.15, 47.43, 54.40]
TEMPOS = [1.15, 1.15, 1.22, 1.15, 1.22, 1.15, 1.15, 1.15, 1.22]
SRC = [f"line{i}.mp3" if i != 9 else "line9_trim.mp3" for i in range(1, 10)]
DUCK = 0.40          # music gain under speech (~ -8 dB)
RAMP = 0.35          # duck ramp seconds
FILM = os.path.join(ROOT, "sketchbook_comes_alive_9x16.mp4")
OUT = os.path.join(ROOT, "sketchbook_comes_alive_9x16_narrated.mp4")


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(r.stderr[-1500:]); sys.exit(1)


def read_wav(path):
    with wave.open(path, "rb") as w:
        assert w.getframerate() == SR and w.getnchannels() == 2
        data = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16)
    return data.reshape(-1, 2).astype(np.float64) / 32767.0


def write_wav(path, mix):
    data = (np.clip(mix, -1, 1) * 32767).astype(np.int16)
    with wave.open(path, "w") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(data.tobytes())


def main():
    # 1) convert tts clips to stereo wav (with tempo fit) and measure
    clips = []
    for i, (t0, tempo) in enumerate(zip(STARTS, TEMPOS), 1):
        src = os.path.join(NAR, SRC[i - 1])
        wav = os.path.join(NAR, f"line{i}.wav")
        run([FF, "-y", "-hide_banner", "-loglevel", "error", "-i", src,
             "-filter:a", f"atempo={tempo}", "-ar", str(SR), "-ac", "2", wav])
        sig = read_wav(wav)
        sig *= 0.85 / (np.abs(sig).max() + 1e-9)          # normalize level
        clips.append((t0, sig))
        print(f"  line{i}: {len(sig)/SR:.2f}s at {t0}s")

    # 2) timeline length = current film duration
    dur_str = subprocess.run(
        [FF, "-hide_banner", "-i", FILM], capture_output=True, text=True
    ).stderr.split("Duration: ")[1].split(",")[0].strip()
    h, m, s = dur_str.split(":")
    dur = int(h) * 3600 + int(m) * 60 + float(s)
    total = int(round(dur * SR))
    print(f"  film duration: {dur:.2f}s")

    music = read_wav(os.path.join(BUILD, "soundtrack.wav"))[:total]
    if len(music) < total:                                # pad just in case
        music = np.vstack([music, np.zeros((total - len(music), 2))])

    # 3) ducking envelope from clip spans
    env = np.ones(total)
    for t0, sig in clips:
        i0 = int(t0 * SR); i1 = min(int((t0 + len(sig) / SR + 0.25) * SR), total)
        r = int(RAMP * SR)
        seg = np.ones(i1 - i0) * DUCK
        seg[:r] = np.linspace(1, DUCK, min(r, len(seg)))
        seg[-r:] = np.linspace(DUCK, 1, min(r, len(seg)))
        env[i0:i1] = np.minimum(env[i0:i1], seg)
    music *= env[:, None]

    # 4) place narration
    narr = np.zeros((total, 2))
    for t0, sig in clips:
        i0 = int(t0 * SR); i1 = min(i0 + len(sig), total)
        narr[i0:i1] += sig[:i1 - i0]

    mix = np.tanh(music * 1.05 + narr * 1.15) * 0.92
    write_wav(os.path.join(BUILD, "final_mix.wav"), mix)

    # 5) mux: strip film audio, add new mix
    silent = os.path.join(BUILD, "video_only.mp4")
    run([FF, "-y", "-hide_banner", "-loglevel", "error", "-i", FILM,
         "-c:v", "copy", "-an", silent])
    run([FF, "-y", "-hide_banner", "-loglevel", "error", "-i", silent,
         "-i", os.path.join(BUILD, "final_mix.wav"),
         "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
         "-movflags", "+faststart", OUT])
    print(f"  final: {OUT} ({os.path.getsize(OUT)/1e6:.1f} MB)")


if __name__ == "__main__":
    main()
