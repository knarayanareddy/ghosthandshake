#!/usr/bin/env python3
"""THE SKETCHBOOK ODYSSEY — five-movement score (~303s), fully synthesized.
M1 Lullaby (moonlit) · M2 Morning Threat (eraser) · M3 Trials (fanfares +
siren waltz) · M4 The Abyss (near-silence) · M5 Homecoming (color bloom)."""
import numpy as np, wave, os

SR = 44100
TOTAL = 303.0
N = int(SR * TOTAL)
L = np.zeros(N); R = np.zeros(N)
rng = np.random.default_rng(11)

def t_axis(dur): return np.arange(int(SR * dur)) / SR

def env(dur, a, r, shape=1.0):
    n = int(SR * dur); t = np.arange(n) / SR
    e = np.minimum(t / max(a, 1e-3), 1.0)
    e *= np.exp(-shape * np.maximum(t - a, 0) / max(r, 1e-3) * 6)
    return e

def add(sig, t0, amp=1.0, pan=0.0):
    i0 = int(t0 * SR)
    if i0 >= N: return
    i1 = min(i0 + len(sig), N)
    seg = sig[:i1 - i0] * amp
    gl = np.sqrt(0.5 * (1 - pan)); gr = np.sqrt(0.5 * (1 + pan))
    L[i0:i1] += seg * gl; R[i0:i1] += seg * gr

def sine(f, dur, a=0.01, r=0.3, vib=0.0, vf=5.0):
    t = t_axis(dur); ph = 2 * np.pi * f * t
    if vib: ph += vib * np.sin(2 * np.pi * vf * t)
    return np.sin(ph) * env(dur, a, r)

def music_box(f, dur=1.6):
    t = t_axis(dur)
    s = (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 4 * f * t)
         + 0.12 * np.sin(2 * np.pi * 6.7 * f * t))
    return s * np.exp(-t * 3.2) * np.minimum(t / 0.002, 1)

def pluck(f, dur=0.9, bright=1.0):
    t = t_axis(dur); e = np.exp(-t * 5.5) * np.minimum(t / 0.004, 1)
    return (np.sin(2 * np.pi * f * t) + 0.45 * bright * np.sin(2 * np.pi * 2 * f * t)
            + 0.18 * bright * np.sin(2 * np.pi * 3 * f * t) + 0.07 * np.sin(2 * np.pi * 4.2 * f * t)) * e

def pad_chord(freqs, dur, a=1.2, r=1.5, detune=0.15, shimmer=0.0):
    t = t_axis(dur); s = np.zeros(len(t))
    for f in freqs:
        for d in (-detune, detune):
            s += np.sin(2 * np.pi * f * (1 + d / 100) * t + rng.uniform(0, 6.28))
        s += 0.3 * np.sin(2 * np.pi * f * 2 * t)
        if shimmer:
            s += shimmer * np.sin(2 * np.pi * f * 1.003 * t + 1.0)
    e = np.minimum(t / a, 1) * np.exp(-np.maximum(t - dur + r, 0) / r * 5)
    return s * e / (len(freqs) * 2.2)

def strings(freqs, dur, a=0.9, r=1.6):
    t = t_axis(dur); s = np.zeros(len(t))
    for f in freqs:
        for k, d in enumerate((-0.22, -0.08, 0.09, 0.25)):
            s += np.sin(2 * np.pi * f * (1 + d / 100) * t) * (1 - 0.12 * k)
    vib = 1 + 0.006 * np.sin(2 * np.pi * 5.2 * t)
    s *= vib
    e = np.minimum(t / a, 1) * np.exp(-np.maximum(t - dur + r, 0) / r * 5)
    return s * e / (len(freqs) * 3.2)

def noise_burst(dur, lp=0.3, a=0.005, r=0.15):
    x = rng.standard_normal(int(SR * dur))
    k = max(int(lp * SR), 2)
    for _ in range(3): x = np.convolve(x, np.ones(k) / k, 'same')
    return x * env(dur, a, r) / (np.abs(x).max() + 1e-9)

def shhk(dur=0.55):     # eraser foley: dry rubbing
    x = rng.standard_normal(int(SR * dur))
    x = np.convolve(x, np.ones(5) / 5, 'same') - np.convolve(x, np.ones(90) / 90, 'same')
    wob = 0.5 + 0.5 * np.sin(2 * np.pi * 11 * t_axis(dur))
    return x * env(dur, .03, .18) * wob / (np.abs(x).max() + 1e-9)

def growl(dur=4.0, f=52):
    t = t_axis(dur)
    s = np.sign(np.sin(2 * np.pi * f * t)) * 0.5 + np.sin(2 * np.pi * (f + 3) * t)
    s *= 0.6 + 0.4 * np.sin(2 * np.pi * 6.7 * t)
    x = np.convolve(rng.standard_normal(len(t)), np.ones(30) / 30, 'same') * 0.25
    return (s + x) * env(dur, 0.7, 1.4) / (np.abs(s).max() + 1e-9)

def kick(dur=0.16):
    t = t_axis(dur); f = 95 * np.exp(-t * 22) + 42
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(dur, .002, .09, 2)

def tick(dur=0.06):
    t = t_axis(dur)
    return np.sin(2 * np.pi * 1900 * t) * env(dur, .001, .03, 2)

def shaker(dur=0.07):
    x = rng.standard_normal(int(SR * dur))
    x = np.convolve(x, np.ones(6) / 6, 'same')
    return x * env(dur, .004, .045, 2) / (np.abs(x).max() + 1e-9)

def gliss(scale, step, dur=0.14):
    return [(f, step * i) for i, f in enumerate(scale)]

# ============ MOVEMENT 1: LULLABY (0 – 47) — moonlit, boat theme ============
A3, C4, D4, E4, G4, A4, C5, D5, E5, G5, A5 = 220.0, 261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0
F4, F5, B4 = 349.23, 698.46, 493.88
C6, D6, E6, G6, B5 = 1046.5, 1174.66, 1318.51, 1567.98, 987.77
add(pad_chord([110, A3, E4, C5], 12, a=3.5, r=3.5), 0.0, 0.24)
LULL = [(E5, 0.8), (D5, 1.5), (C5, 2.2), (A4, 3.4), (G4, 4.2), (A4, 4.9), (C5, 5.8), (E5, 7.0)]
for f, tt in LULL:
    add(music_box(f), 2.5 + tt, 0.16, 0.2 * np.sin(tt))
add(music_box(A5), 11.0, 0.10)
add(pad_chord([110, A3, E4, C5], 10, a=3, r=3), 8.0, 0.20)
for f, tt in LULL:                                   # phrase repeats softer
    add(music_box(f), 14.5 + tt, 0.11, -0.2 * np.sin(tt))
for tp in [(3.2, -.4), (7.1, .35), (12.6, -.2)]:     # page whispers
    add(noise_burst(.5, lp=.002, a=.02, r=.3), tp[0], .10, tp[1])
# 20–32: morning arrives warm but uneasy
add(pad_chord([130.81, C4, G4, E5], 8, a=2, r=2.5), 22.0, 0.18)
for k, f in enumerate([C5, E5, G5]):
    add(pluck(f), 24.0 + k * .8, .09, .3 * np.cos(k))
add(music_box(E5), 30.0, 0.12)
# 32–47: the Eraser arrives — theme of consequence
for k in range(3):
    add(shhk(0.6), 33.0 + k * 2.4, .30, .15 * (1 if k % 2 else -1))
add(growl(7, 46), 33.2, .20)
add(pad_chord([103.83, 155.56, 207.65], 8, a=2.5, r=3), 33.5, 0.16)   # ab color
add(music_box(A4), 40.5, 0.08)
add(shhk(0.7), 43.5, .26, .2)
# 43.5 Hatch half-erased: single desolate bell
add(sine(523.25 * 0.5, 4, .002, 2.4), 45.0, .16, -.1)

# ============ MOVEMENT 2: PROPHECY & LAUNCH (47 – 77) ============
add(pad_chord([130.81, C4, E4, G4], 8, a=2, r=2.5), 47.5, 0.22)       # C major hope
for f, tt in [(E5, .0), (G5, .7), (C5 * 2, 1.4), (G4, 2.4)]:
    add(music_box(f), 49.0 + tt, 0.12, .25 * np.sin(tt))
add(pad_chord([110, A3, E4, C5], 9, a=2.5, r=3), 56.0, 0.22)
for k in range(4):
    add(shaker(), 60.0 + k * .35, .05, .3 if k % 2 else -.3)
# launch whoosh + rising figure (66)
x = rng.standard_normal(int(SR * 1.8)); x = np.convolve(x, np.ones(12) / 12, 'same')
add(x * env(1.8, .8, .9) / (np.abs(x).max() + 1e-9) * 0.5, 66.0, .30)
for k, f in enumerate([C5, E5, G5, C6]):
    add(music_box(f), 66.8 + k * .18, 0.13)
# Desk Sea sunrise (68–77): wide warm pads + lullaby quote
add(pad_chord([110, A3, E4, A4, C5], 9.5, a=2.5, r=3, shimmer=.05), 68.5, 0.26)
for f, tt in LULL[:4]:
    add(pluck(f, .8, .6), 70.0 + tt * .8, .10, .3 * np.sin(tt))

# ============ MOVEMENT 3: TRIALS (77 – 163) ============
BPM = 96; beat = 60 / BPM
# 77–96 fan storm: driving percussion + wind
wind = noise_burst(20, lp=.004, a=2.5, r=3.0)
add(wind, 77.0, .20); add(wind, 77.0, .14)
for b in range(int((96 - 77) / beat)):
    tb = 77 + b * beat
    if b % 4 == 0: add(kick(), tb, .30)
    if b % 4 == 3: add(kick(), tb, .18)
    if b % 2 == 1: add(noise_burst(.06, lp=.001, a=.002, r=.03), tb + beat / 2, .07, .25)
for f, tt in [(A4, 0), (E5, 1.5), (F5 := 698.46, 3.0), (E5, 4.5), (D5, 6.0), (E5, 7.5), (A5, 9.0)]:
    add(pluck(f, .7, .9), 78.0 + tt, .12, .35 * np.sin(tt))
add(growl(4, 55), 86.0, .22, -.2)                    # monster roars the dial to zero
for k in range(3):
    add(shhk(.5), 92.0 + k * 1.6, .18)
# 96–117 ink canyon & graphite bridge: ticking pursuit + pencil taps
add(pad_chord([98, 146.83, 196, 246.94], 10, a=2, r=3), 96.5, 0.18)   # Bm-ish
for k in range(int((112 - 98) / .5)):
    add(tick(), 98.0 + k * .5, .045, .2 * np.sin(k))
for k, f in enumerate([B4 := 493.88, D5, F5, A5]):   # bridge drawn just ahead
    add(pluck(f, .5), 108.0 + k * .28, .12)
add(pluck(1174.7, .7), 111.4, .09)                   # the leap!
add(pad_chord([110, A3, E4, A4], 6, a=1.5, r=2), 112.5, .20)
# 117–134 Charybdis: slow whirl, lonely waltz
wh = noise_burst(14, lp=.006, a=2.5, r=2.5)
wob = np.sin(2 * np.pi * .33 * t_axis(14))
i0 = int(118.0 * SR)
for i in range(len(wh)):
    ii = i0 + i
    if ii >= N: break
    g = np.sqrt(.5 * (1 - wob[i])); gr = np.sqrt(.5 * (1 + wob[i]))
    L[ii] += wh[i] * .13 * g; R[ii] += wh[i] * .13 * gr
W3 = [(E4, 0), (G4, 1), (B4, 2), (E5, 3), (D5, 4.5), (B4, 6), (G4, 7.5), (E4, 9)]
for f, tt in W3:
    add(music_box(f, 1.4), 120.0 + tt, .10, .3 * np.sin(tt))
add(pad_chord([164.81, 196, 246.94, 392], 8, a=2, r=3), 126.5, .16)   # e minor tenderness
add(music_box(B5 := 987.77, 1.8), 133.0, .07)
# 134–148 Siren Beach: detuned endless waltz 3/4
for bar in range(4):
    tb = 136.0 + bar * 1.8
    add(pad_chord([220, 277.18, 329.63], 1.8, a=.4, r=.8, detune=.9), tb, .16)
    add(pluck(1108.7 * (1 + .004 * np.sin(tb)), .6, .5), tb + .6, .06, .3)
    add(pluck(1318.5 * (1 - .004 * np.cos(tb)), .6, .5), tb + 1.2, .05, -.3)
add(clink := (lambda: pluck(2650, .4, .3))(), 142.8, .05)             # radio bell glint
# 148–148.5: THE NOTE (bell) — everything stops
add(sine(1567.98, 3.5, .002, 2.8), 148.5, .22)
add(sine(1567.98 * 1.5, 2.5, .002, 2.0), 148.53, .08)
# 152–163 hug toll: warm comedy + crew rowing groove
add(pad_chord([130.81, C4, E4, G4], 5, a=1.2, r=2), 152.5, .22)
for k, f in enumerate([C5, E5, G5, E5, C5]):
    add(pluck(f, .6, .8), 153.5 + k * .45, .11, .3 * np.sin(k))
for b in range(int((163 - 156) / beat)):
    tb = 156 + b * beat
    add(kick(), tb, .26)
    add(shaker(), tb + beat / 2, .06, .3 if b % 2 else -.3)
    if b % 4 == 2: add(pluck(659.25, .4), tb, .08)

# ============ MOVEMENT 4: THE ABYSS (163 – 226) ============
add(pad_chord([98, 146.83, 185, 220], 9, a=3, r=4), 163.5, .14)       # dim
for k in range(int((190 - 166) / 1.0)):              # clock ticks into silence
    add(tick(), 166.0 + k, .04, .15 * np.sin(k))
add(music_box(E5, 2.2), 172.0, .09)                  # lullaby fragments, failing
add(music_box(D5, 2.0), 178.0, .07)
add(music_box(C5, 1.6), 183.0, .05)
add(shhk(0.8), 188.5, .22)                           # the eraser's last pass
# 190–200: N16 silence beat ("Neither here, nor there")
# (near-empty; just air and a heartbeat)
for k, tt in enumerate([192.0, 192.8]):
    add(sine(58, .30, .01, .22), tt, .20)
add(sine(58, .30, .01, .22), 193.6, .14)
# 196–206: bird ascent — rising figure toward the lamp
for k, f in enumerate([A4, C5, E5, A5, C6, E6 := 1318.5]):
    add(music_box(f, 1.2), 198.0 + k * .9, .10 - k * .008, .2 * np.sin(k))
add(pad_chord([220, 329.63, 440, 659.25], 8, a=2.5, r=3, shimmer=.08), 201.0, .18)
# 206–226: the Hand gasps / kneels — heartbeat + first mercy
for tt in [208.0, 209.2, 210.6]:
    add(sine(62, .4, .01, .3), tt, .22)
add(pad_chord([103.83, 207.65, 311.13, 415.3], 8, a=2.5, r=3), 210.0, .13)
add(shhk(.5), 216.0, .14)                            # pencil on paper (soft)
for k, f in enumerate([E5, G5, B5, E6]):
    add(pluck(f, .6, .4), 218.0 + k * .5, .10)       # Hatch restored, line by line
add(pad_chord([130.81, C4, E4, G4], 6, a=2, r=2.5), 220.5, .18)

# ============ MOVEMENT 5: HOMECOMING (226 – 303) ============
# 226–244 drawer & book of kept things — warm bloom, instruments enter
add(pad_chord([110, 164.81, 220, 329.63], 10, a=3, r=3, shimmer=.06), 227.0, .26)
for k, f in enumerate([C5, E5, G5, C6]):
    add(music_box(f), 232.0 + k * .6, .12)
add(strings([C4, G4, E5], 7, a=2.2), 236.0, .16)
# 244–262 COLOR FLOOD — full orchestra gains color
add(strings([C4, E4, G4, C5, E5], 9, a=2.5, r=3), 245.0, .26)
add(pad_chord([65.41, 130.81, 196, 261.63, 329.63, 392], 12, a=3, r=4, shimmer=.1), 247.0, .30)
for k, f in enumerate([E5, G5, C6, E6, G6 := 1567.98]):
    add(pluck(f, .8, .7), 248.5 + k * .4, .12, .3 * np.sin(k))
GL = [C5, D5, E5, G5, A5, C6, D6 := 1174.7, E6, G6]
for k, f in enumerate(GL):
    add(pluck(f, .7), 256.0 + k * .16, .11, -.4 + .1 * k)
add(strings([E4, G4, B4, E5], 8, a=2, r=3), 258.5, .22)
# 262–276 bittersweet edge — lullaby major reprise, one shade of ache
add(pad_chord([110, A3, E4, C5, A4], 10, a=3, r=3.5), 263.0, .26)
for f, tt in LULL:
    add(music_box(f), 264.0 + tt, .15, .2 * np.sin(tt))
add(strings([C4, E4, A4, C5], 9, a=2.5, r=3), 266.0, .20)
add(music_box(A5, 2.2), 274.5, .12)
# 276–292 beyond the page: starfield sparkle + last swell
for k in range(12):
    add(pluck(rng.uniform(1200, 2600), .6, .4), 277.0 + rng.uniform(0, 9), .05, rng.uniform(-.7, .7))
add(strings([130.81, 196, 261.63, 329.63, 392, 523.25], 10, a=3, r=4), 280.0, .28)
add(pad_chord([65.41, 130.81, 196, 261.63, 392], 14, a=4, r=5, shimmer=.08), 282.0, .30)
# 292–303: title card — final lullaby bell + long fade
for f, tt in [(E5, 0), (A4, .9), (C5, 1.8), (E5, 2.8), (A5, 4.2)]:
    add(music_box(f, 2.5), 293.0 + tt, .13)
add(pad_chord([110, A3, E4, A4, C5], 10, a=3, r=4), 293.0, .24)

# ---------------- global dressing ----------------
cr = (rng.standard_normal(N) > 0.9993).astype(float)
cr = np.convolve(cr, np.ones(9) / 9, 'same') * rng.standard_normal(N) * .5
L += cr * .04; R += cr * .04

def duck(t0, t1, depth=0.35, ramp=0.5):
    i0, i1 = int(t0 * SR), int(t1 * SR)
    r = int(ramp * SR)
    seg = np.ones(i1 - i0) * depth
    seg[:r] = np.linspace(1, depth, min(r, len(seg)))
    seg[-r:] = np.linspace(depth, 1, min(r, len(seg)))
    L[i0:i1] *= seg; R[i0:i1] *= seg

# duck under narration anchors (refined at mux time)
for a, b in [(0.9, 7.0), (33.0, 46.0), (47.5, 55.0), (77.5, 95.0), (108.0, 112.0),
             (119.0, 133.0), (136.0, 148.0), (163.5, 200.0), (207.5, 224.0),
             (227.0, 262.0), (263.5, 279.0)]:
    duck(a, b)

mix = np.stack([L, R])
mix = np.tanh(mix * 1.2)
mix /= np.abs(mix).max() + 1e-9
mix *= 0.88
fi, fo = int(1.5 * SR), int(4.0 * SR)
mix[:, :fi] *= np.linspace(0, 1, fi)
mix[:, -fo:] *= np.linspace(1, 0, fo) ** 1.4

out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "work", "score.wav")
os.makedirs(os.path.dirname(out), exist_ok=True)
data = (mix.T * 32767).astype(np.int16)
with wave.open(out, "w") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(data.tobytes())
print("odyssey score:", out, f"{TOTAL}s")
