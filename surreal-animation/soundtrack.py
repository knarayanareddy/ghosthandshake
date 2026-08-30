#!/usr/bin/env python3
"""Original synthesized soundtrack for 'The Sketchbook Comes Alive'.
Whimsical ambient score: warm pads, plucks, percussion, foley-style
SFX (page flutter, pencil scratches, monster growl, fan wind, water
plips, coffee whirl, spoon clink, beach shaker, finale gliss)."""
import numpy as np, wave, os

SR = 44100
TOTAL = 61.4
N = int(SR * TOTAL)
L = np.zeros(N); R = np.zeros(N)
rng = np.random.default_rng(7)

def t_axis(dur): return np.arange(int(SR * dur)) / SR

def env(dur, a, r, shape=1.0):
    n = int(SR * dur); t = np.arange(n) / SR
    e = np.minimum(t / max(a, 1e-3), 1.0)
    e *= np.exp(-shape * np.maximum(t - a, 0) / max(r, 1e-3) * 6)
    return e

def add(sig, t0, amp=1.0, pan=0.0):
    i0 = int(t0 * SR); i1 = min(i0 + len(sig), N)
    if i0 >= N: return
    seg = sig[:i1 - i0] * amp
    gl = np.sqrt(0.5 * (1 - pan)); gr = np.sqrt(0.5 * (1 + pan))
    L[i0:i1] += seg * gl; R[i0:i1] += seg * gr

def sine(f, dur, a=0.01, r=0.3, vib=0.0, vf=5.0):
    t = t_axis(dur); ph = 2 * np.pi * f * t
    if vib: ph += vib * np.sin(2 * np.pi * vf * t)
    return np.sin(ph) * env(dur, a, r)

def pluck(f, dur=0.9, bright=1.0):
    t = t_axis(dur); e = np.exp(-t * 5.5) * np.minimum(t / 0.004, 1)
    s = (np.sin(2 * np.pi * f * t) + 0.45 * bright * np.sin(2 * np.pi * 2 * f * t)
         + 0.18 * bright * np.sin(2 * np.pi * 3 * f * t)
         + 0.07 * np.sin(2 * np.pi * 4.2 * f * t))
    return s * e

def pad_chord(freqs, dur, a=1.2, r=1.5, detune=0.15):
    t = t_axis(dur); s = np.zeros(len(t))
    for f in freqs:
        for d in (-detune, detune):
            ff = f * (1 + d / 100)
            s += np.sin(2 * np.pi * ff * t + rng.uniform(0, 6.28))
        s += 0.3 * np.sin(2 * np.pi * f * 2 * t)
    e = np.minimum(t / a, 1) * np.exp(-np.maximum(t - dur + r, 0) / r * 5)
    return s * e / (len(freqs) * 2.2)

def noise_burst(dur, lp=0.3, a=0.005, r=0.15):
    x = rng.standard_normal(int(SR * dur))
    for _ in range(3):  # cheap lowpass
        x = np.convolve(x, np.ones(int(max(lp * SR, 2))) / max(int(lp * SR), 2), 'same')
    return x * env(dur, a, r) / (np.abs(x).max() + 1e-9)

def scratch(dur=1.3):
    x = rng.standard_normal(int(SR * dur))
    b = np.convolve(x, np.ones(24) / 24, 'same') - np.convolve(x, np.ones(220) / 220, 'same')
    wob = 0.55 + 0.45 * np.sin(2 * np.pi * 5.5 * t_axis(dur))
    return b * env(dur, .06, dur * .5) * wob / (np.abs(b).max() + 1e-9)

def growl(dur=5.0):
    t = t_axis(dur)
    s = np.sign(np.sin(2 * np.pi * 52 * t)) * 0.5 + np.sin(2 * np.pi * 55 * t)
    s *= 0.6 + 0.4 * np.sin(2 * np.pi * 7.3 * t)
    x = rng.standard_normal(len(t)) * 0.25
    b = np.convolve(x, np.ones(30) / 30, 'same')
    return (s + b) * env(dur, 0.8, 1.8) / (np.abs(s).max() + 1e-9)

def boing(f0=420, f1=95, dur=0.75):
    t = t_axis(dur); f = f0 * (f1 / f0) ** (t / dur)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * env(dur, .006, .3, 2) 

def whoosh(dur=1.6, up=True):
    x = rng.standard_normal(int(SR * dur))
    x = np.convolve(x, np.ones(14) / 14, 'same')
    t = t_axis(dur)
    sweep = np.sin(2 * np.pi * (300 if up else 900) * t ** 2 / dur)
    e = env(dur, dur * .45, dur * .55)
    return (x * 0.8 + sweep * x) * e / (np.abs(x).max() + 1e-9)

def plip(f0=950, f1=280, dur=0.22):
    t = t_axis(dur); f = f0 * (f1 / f0) ** (t / dur)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(dur, .004, .1, 2)

def clink(f=2650, dur=0.5):
    t = t_axis(dur)
    return (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 1.62 * t)) * env(dur, .002, .12, 2)

def kick(dur=0.16):
    t = t_axis(dur); f = 95 * np.exp(-t * 22) + 42
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(dur, .002, .09, 2)

def hat(dur=0.05):
    x = rng.standard_normal(int(SR * dur))
    x = x - np.convolve(x, np.ones(12) / 12, 'same')
    return x * env(dur, .001, .03, 2) / (np.abs(x).max() + 1e-9)

def shaker(dur=0.07):
    x = rng.standard_normal(int(SR * dur))
    x = np.convolve(x, np.ones(6) / 6, 'same')
    return x * env(dur, .004, .045, 2) / (np.abs(x).max() + 1e-9)

# ---------------- arrangement ----------------
# 0-7 intro: warm pad + page flutters
add(pad_chord([110, 164.81, 220, 277.18], 8.0, a=2.2, r=2.5), 0.0, 0.30)
for tp, pp in [(2.4, -.5), (4.0, .4), (5.6, -.2)]: add(noise_burst(.5, lp=.002, a=.02, r=.3), tp, .16, pp)
add(pluck(440, .8), 3.0, .10); add(pluck(554.37, .8), 5.0, .09)

# 6.3-13.3 pencil: pad + graphite scratches + light beat enters ~8s
add(pad_chord([110, 164.81, 220, 329.63], 8.0, a=1.5, r=2), 6.3, 0.26)
for t0, pp in [(7.6, -.35), (9.4, .3), (11.3, -.15)]: add(scratch(1.4), t0, .17, pp)

BPM = 92; beat = 60 / BPM
bar = 4 * beat
for b in range(int((54 - 8) / beat)):
    tb = 8 + b * beat
    if b % 4 == 0: add(kick(), tb, .32)
    if b % 4 == 2: add(kick(), tb, .20)
    add(hat(), tb + beat / 2, .05, .25 if b % 2 else -.25)

# 12.6-20.6 monster: growl + boing + woodblock comedy
add(growl(6.5), 12.9, .30, -.2)
add(boing(430, 90), 14.2, .34, .3)
add(boing(560, 160, .5), 16.1, .22, -.4)
add(clink(320, .3), 18.4, .12)
add(pad_chord([110, 130.81, 164.81, 220], 7, a=1.2, r=2), 13.0, .18)  # minor color

# 19.9-26.9 fan: wind swell + fluttering papers
wind = noise_burst(7.5, lp=.004, a=2.8, r=2.2)
add(wind, 19.9, .22); add(wind * 0.8, 19.9, .15)  # L/R spread
for _ in range(9):
    t0 = 20.2 + rng.uniform(0, 6.2)
    add(noise_burst(rng.uniform(.08, .2), lp=.001, a=.004, r=.06), t0, rng.uniform(.05, .12), rng.uniform(-.8, .8))

# 26.2-34.2 plane: whoosh up + soaring pad + pentatonic plucks
add(whoosh(1.8, True), 26.0, .30)
add(pad_chord([146.83, 220, 293.66, 369.99], 8, a=1.5, r=2.2), 26.6, .26)  # D major
P5 = [440, 493.88, 554.37, 659.25, 739.99, 880]
for k in range(7):
    add(pluck(P5[k % 6], .7), 27.6 + k * .75, .11, .5 * np.sin(k))
add(pluck(1108.7, .9), 33.0, .08)

# 33.5-40.5 fishing: calm pad + water plips
add(pad_chord([130.81, 196, 261.63, 329.63], 7.5, a=1.6, r=2), 33.8, .24)
for t0, pp in [(35.4, .3), (36.7, -.25), (38.3, .15)]:
    add(plip(), t0, .20, pp); add(plip(700, 200, .18), t0 + .12, .08, -pp)

# 39.8-46.8 coffee: whirl (rotating pan) + spoon clink + boing + bubbles
wh = noise_burst(5.5, lp=.006, a=.8, r=1.2)
wob = .6 * np.sin(2 * np.pi * .5 * t_axis(5.5))
i0 = int(40.3 * SR)
for i in range(len(wh)):
    ii = i0 + i
    if ii >= N: break
    g = np.sqrt(.5 * (1 - wob[i])); gr = np.sqrt(.5 * (1 + wob[i]))
    L[ii] += wh[i] * .16 * g; R[ii] += wh[i] * .16 * gr
add(clink(2650, .5), 40.6, .16); add(clink(3300, .35), 45.9, .10)
add(boing(520, 170, .55), 42.3, .26, .2)
for _ in range(7):
    add(sine(rng.uniform(280, 620), .1, .002, .05), 40.8 + rng.uniform(0, 5), .05, rng.uniform(-.6, .6))

# 46.1-54.1 beach: major pad, steel-drum melody, shaker
add(pad_chord([110, 164.81, 220, 277.18, 329.63], 8.5, a=1.8, r=2.2), 46.2, .26)
mel = [880, 1108.7, 1318.5, 987.77, 880, 659.25]
for k, f in enumerate(mel):
    add(pluck(f, .8, bright=.6), 47.0 + k * .95, .12, .35 * np.cos(k))
for k in range(int((53.8 - 47) / (beat / 2))):
    add(shaker(), 47 + k * beat / 2, .06, .3 if k % 2 else -.3)

# 53.4-61.4 finale: glissando + big warm chord + twinkles + fadeout
GL = [440, 554.37, 659.25, 739.99, 880, 987.77, 1108.7, 1318.5]
for k, f in enumerate(GL):
    add(pluck(f, .8), 54.3 + k * .13, .13, -.4 + .1 * k)
add(pad_chord([55, 110, 164.81, 220, 277.18, 329.63, 493.88], 7.0, a=1.6, r=3.2), 55.3, .40)
for _ in range(10):
    add(pluck(rng.uniform(1200, 2400), .5, bright=.4), 55.5 + rng.uniform(0, 3.5), .05, rng.uniform(-.7, .7))

# global vinyl-ish crackle for cohesion
cr = (rng.standard_normal(N) > 0.9992).astype(float)
cr = np.convolve(cr, np.ones(9) / 9, 'same') * rng.standard_normal(N) * .5
L += cr * .05; R += cr * .05

# ---------------- master ----------------
mix = np.stack([L, R])
mix = np.tanh(mix * 1.25)
mix /= np.abs(mix).max() + 1e-9
mix *= 0.89
fade_in = int(1.2 * SR); fade_out = int(2.6 * SR)
mix[:, :fade_in] *= np.linspace(0, 1, fade_in)
mix[:, -fade_out:] *= np.linspace(1, 0, fade_out) ** 1.5

out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "build", "soundtrack.wav")
os.makedirs(os.path.dirname(out), exist_ok=True)
data = (mix.T * 32767).astype(np.int16)
with wave.open(out, "w") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(data.tobytes())
print("soundtrack:", out, f"{TOTAL}s")
