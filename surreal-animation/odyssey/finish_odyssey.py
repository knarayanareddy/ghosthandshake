#!/usr/bin/env python3
"""Finish: narration+score mix (silent video already rendered) + final mux."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import odyssey_build as B

shots = list(B.SHOTS)
base = sum(s[1] for s in shots) - B.D * (len(shots) - 1)
shots[-2] = (shots[-2][0], shots[-2][1] + max(0.0, B.TARGET - base), *shots[-2][2:])
total = sum(s[1] for s in shots) - B.D * (len(shots) - 1)
durs = [s[1] for s in shots]
starts = [sum(durs[:i]) - B.D * i for i in range(len(shots))]
print(f"timeline {total:.1f}s", flush=True)

print("[3/4] narration + score mix...", flush=True)
mix = B.mix_audio(total, starts)
print("[4/4] muxing...", flush=True)
final = os.path.join(B.ROOT, "sketchbook_odyssey_9x16.mp4")
B.run([B.FF, "-y", "-hide_banner", "-loglevel", "error",
       "-i", os.path.join(B.BUILD, "odyssey_silent.mp4"), "-i", mix,
       "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", final])
print(f"FINAL: {final} ({os.path.getsize(final)/1e6:.1f} MB, {B.dur_of(final):.1f}s)", flush=True)
