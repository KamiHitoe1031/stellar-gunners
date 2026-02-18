"""
Generate placeholder audio files (WAV) for Stellar Gunners.
Uses Python's built-in wave/struct modules - no external dependencies.

Usage: python tools/generate_audio.py
"""

import wave
import struct
import math
import random
import os

SAMPLE_RATE = 44100
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'assets', 'audio')


def write_wav(filename, samples, sample_rate=SAMPLE_RATE):
    """Write mono 16-bit WAV file."""
    path = os.path.join(OUTPUT_DIR, filename)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with wave.open(path, 'w') as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(sample_rate)
        for s in samples:
            clamped = max(-1.0, min(1.0, s))
            f.writeframes(struct.pack('<h', int(clamped * 32767)))
    print(f"  -> {path} ({len(samples) / sample_rate:.1f}s)")


# ===== Wave generators =====

def sine(freq, t):
    return math.sin(2 * math.pi * freq * t)

def square(freq, t):
    return 1.0 if sine(freq, t) >= 0 else -1.0

def sawtooth(freq, t):
    phase = (freq * t) % 1.0
    return 2.0 * phase - 1.0

def triangle(freq, t):
    phase = (freq * t) % 1.0
    return 4.0 * abs(phase - 0.5) - 1.0

def noise():
    return random.uniform(-1, 1)

def envelope_adsr(t, duration, attack=0.01, decay=0.05, sustain_level=0.7, release=0.1):
    """ADSR envelope."""
    release_start = duration - release
    if t < attack:
        return t / attack
    elif t < attack + decay:
        return 1.0 - (1.0 - sustain_level) * ((t - attack) / decay)
    elif t < release_start:
        return sustain_level
    elif t < duration:
        return sustain_level * (1.0 - (t - release_start) / release)
    return 0.0

def envelope_exp_decay(t, decay_rate=3.0):
    """Exponential decay envelope."""
    return math.exp(-decay_rate * t)

def lowpass(samples, cutoff_factor=0.1):
    """Simple one-pole lowpass filter."""
    out = []
    prev = 0.0
    for s in samples:
        prev = prev + cutoff_factor * (s - prev)
        out.append(prev)
    return out


# ===== BGM Generation =====

def gen_bgm_title():
    """Ethereal, atmospheric title BGM (6s loop)."""
    duration = 6.0
    samples = []
    # Chord progression: Am - F - C - G (dreamy pads)
    chords = [
        (0.0, [220.0, 261.6, 329.6]),      # Am
        (1.5, [174.6, 220.0, 261.6]),       # F
        (3.0, [261.6, 329.6, 392.0]),       # C
        (4.5, [196.0, 246.9, 293.7]),       # G
    ]
    for i in range(int(duration * SAMPLE_RATE)):
        t = i / SAMPLE_RATE
        val = 0.0
        for chord_start, freqs in chords:
            chord_t = t - chord_start
            if chord_t < 0 or chord_t > 2.0:
                continue
            env = envelope_adsr(chord_t, 2.0, attack=0.3, decay=0.2, sustain_level=0.6, release=0.5)
            for freq in freqs:
                val += sine(freq, t) * env * 0.12
                # Add shimmer
                val += sine(freq * 2, t) * env * 0.03
        # Sub bass
        bass_freqs = [110.0, 87.3, 130.8, 98.0]
        idx = int(t / 1.5) % 4
        bass_env = envelope_adsr(t % 1.5, 1.5, attack=0.1, decay=0.3, sustain_level=0.4, release=0.3)
        val += sine(bass_freqs[idx], t) * bass_env * 0.15
        # Sparkle
        val += sine(880 + sine(0.5, t) * 100, t) * 0.02 * envelope_exp_decay(t % 3.0, 1.0)
        samples.append(val)
    return lowpass(samples, 0.3)


def gen_bgm_menu():
    """Calm, looping menu BGM (8s loop)."""
    duration = 8.0
    samples = []
    # Arpeggiated pattern
    notes = [261.6, 329.6, 392.0, 523.3, 392.0, 329.6,  # C major arp up/down
             293.7, 349.2, 440.0, 523.3, 440.0, 349.2,  # Dm arp
             261.6, 329.6, 392.0, 523.3, 392.0, 329.6,
             246.9, 311.1, 392.0, 493.9, 392.0, 311.1]   # G arp
    note_dur = duration / len(notes)

    for i in range(int(duration * SAMPLE_RATE)):
        t = i / SAMPLE_RATE
        val = 0.0
        note_idx = int(t / note_dur) % len(notes)
        note_t = t % note_dur
        freq = notes[note_idx]
        env = envelope_adsr(note_t, note_dur, attack=0.01, decay=0.1, sustain_level=0.3, release=0.05)
        val += triangle(freq, t) * env * 0.2
        val += sine(freq * 0.5, t) * env * 0.08
        # Pad
        pad_chords = [(261.6, 329.6, 392.0), (293.7, 349.2, 440.0),
                      (261.6, 329.6, 392.0), (246.9, 311.1, 392.0)]
        pad_idx = int(t / 2.0) % 4
        for pf in pad_chords[pad_idx]:
            val += sine(pf, t) * 0.04
        samples.append(val)
    return lowpass(samples, 0.4)


def gen_bgm_battle():
    """Energetic battle BGM (8s loop)."""
    duration = 8.0
    samples = []
    bpm = 140
    beat_dur = 60.0 / bpm

    # Bass line (Em pentatonic)
    bass_pattern = [82.4, 0, 82.4, 98.0, 0, 110.0, 82.4, 0,
                    82.4, 0, 82.4, 123.5, 110.0, 98.0, 82.4, 0]
    # Lead melody
    lead_pattern = [329.6, 392.0, 440.0, 392.0, 329.6, 293.7, 329.6, 0,
                    440.0, 493.9, 523.3, 493.9, 440.0, 392.0, 329.6, 0]

    for i in range(int(duration * SAMPLE_RATE)):
        t = i / SAMPLE_RATE
        val = 0.0
        beat = t / beat_dur
        step = int(beat * 2) % 16
        step_t = (beat * 2 % 1) * beat_dur / 2

        # Kick
        if step % 4 == 0:
            kick_t = step_t
            if kick_t < 0.15:
                kick_freq = 80 * math.exp(-kick_t * 30)
                val += sine(kick_freq, t) * envelope_exp_decay(kick_t, 15) * 0.3

        # Hi-hat
        if step % 2 == 0:
            hh_t = step_t
            if hh_t < 0.05:
                val += noise() * envelope_exp_decay(hh_t, 60) * 0.1

        # Snare on beats 2,4
        if step in [4, 12]:
            sn_t = step_t
            if sn_t < 0.1:
                val += noise() * envelope_exp_decay(sn_t, 20) * 0.15
                val += sine(200, t) * envelope_exp_decay(sn_t, 25) * 0.1

        # Bass
        bass_freq = bass_pattern[step]
        if bass_freq > 0:
            bass_env = envelope_adsr(step_t, beat_dur / 2, attack=0.005, decay=0.05, sustain_level=0.5, release=0.02)
            val += sawtooth(bass_freq, t) * bass_env * 0.12

        # Lead
        lead_freq = lead_pattern[step]
        if lead_freq > 0:
            lead_env = envelope_adsr(step_t, beat_dur / 2, attack=0.01, decay=0.1, sustain_level=0.4, release=0.05)
            val += square(lead_freq, t) * lead_env * 0.06
            val += sine(lead_freq, t) * lead_env * 0.06

        samples.append(val)
    return lowpass(samples, 0.5)


def gen_bgm_boss():
    """Intense boss battle BGM (8s loop)."""
    duration = 8.0
    samples = []
    bpm = 160
    beat_dur = 60.0 / bpm

    bass_pattern = [55.0, 0, 55.0, 0, 65.4, 0, 55.0, 73.4,
                    55.0, 0, 55.0, 82.4, 73.4, 0, 65.4, 55.0]
    lead_pattern = [220.0, 261.6, 293.7, 329.6, 293.7, 261.6, 220.0, 0,
                    261.6, 293.7, 349.2, 392.0, 349.2, 293.7, 261.6, 220.0]

    for i in range(int(duration * SAMPLE_RATE)):
        t = i / SAMPLE_RATE
        val = 0.0
        beat = t / beat_dur
        step = int(beat * 2) % 16
        step_t = (beat * 2 % 1) * beat_dur / 2

        # Heavy kick
        if step % 2 == 0:
            kick_t = step_t
            if kick_t < 0.15:
                val += sine(60 * math.exp(-kick_t * 25), t) * envelope_exp_decay(kick_t, 12) * 0.35

        # Snare
        if step in [4, 12]:
            sn_t = step_t
            if sn_t < 0.12:
                val += noise() * envelope_exp_decay(sn_t, 15) * 0.2
                val += sine(180, t) * envelope_exp_decay(sn_t, 20) * 0.15

        # Hi-hat
        hh_t = step_t
        if hh_t < 0.03:
            val += noise() * envelope_exp_decay(hh_t, 80) * 0.08

        # Distorted bass
        bass_freq = bass_pattern[step]
        if bass_freq > 0:
            bass_env = envelope_adsr(step_t, beat_dur / 2, attack=0.003, decay=0.03, sustain_level=0.6, release=0.01)
            raw = sawtooth(bass_freq, t) * bass_env * 0.2
            val += max(-0.15, min(0.15, raw * 1.5))  # Soft clip

        # Aggressive lead
        lead_freq = lead_pattern[step]
        if lead_freq > 0:
            lead_env = envelope_adsr(step_t, beat_dur / 2, attack=0.005, decay=0.08, sustain_level=0.5, release=0.03)
            val += square(lead_freq, t) * lead_env * 0.08
            val += sawtooth(lead_freq * 1.005, t) * lead_env * 0.05  # Detuned for thickness

        # Tension pad
        pad_env = 0.03
        val += sine(110 + sine(0.3, t) * 5, t) * pad_env
        val += sine(165 + sine(0.4, t) * 3, t) * pad_env * 0.7

        samples.append(val)
    return lowpass(samples, 0.6)


def gen_bgm_result():
    """Triumphant result BGM (6s loop)."""
    duration = 6.0
    samples = []
    # Fanfare-like chord progression: C - Am - F - G
    chords = [
        (0.0, [261.6, 329.6, 392.0]),
        (1.5, [220.0, 261.6, 329.6]),
        (3.0, [174.6, 261.6, 349.2]),
        (4.5, [196.0, 246.9, 392.0]),
    ]
    # Rising melody
    melody = [(0.0, 523.3), (0.4, 587.3), (0.8, 659.3), (1.2, 784.0),
              (1.5, 659.3), (2.0, 587.3), (2.5, 523.3),
              (3.0, 698.5), (3.5, 659.3), (4.0, 587.3),
              (4.5, 784.0), (5.0, 659.3), (5.5, 523.3)]

    for i in range(int(duration * SAMPLE_RATE)):
        t = i / SAMPLE_RATE
        val = 0.0
        # Pad chords
        for chord_start, freqs in chords:
            ct = t - chord_start
            if ct < 0 or ct > 2.0:
                continue
            env = envelope_adsr(ct, 2.0, attack=0.1, decay=0.2, sustain_level=0.5, release=0.4)
            for freq in freqs:
                val += sine(freq, t) * env * 0.08
        # Melody
        for j, (mt, mf) in enumerate(melody):
            mel_t = t - mt
            next_t = melody[j + 1][0] if j + 1 < len(melody) else duration
            mel_dur = next_t - mt
            if mel_t < 0 or mel_t > mel_dur:
                continue
            env = envelope_adsr(mel_t, mel_dur, attack=0.01, decay=0.1, sustain_level=0.5, release=0.1)
            val += triangle(mf, t) * env * 0.15
            break
        # Bass
        bass_freqs = [130.8, 110.0, 87.3, 98.0]
        bidx = int(t / 1.5) % 4
        val += sine(bass_freqs[bidx], t) * 0.08
        samples.append(val)
    return lowpass(samples, 0.35)


def gen_bgm_scenario():
    """Gentle narrative BGM (8s loop)."""
    duration = 8.0
    samples = []
    # Simple piano-like arpeggios: Dm - Bb - F - C
    chords = [
        (0.0, [146.8, 174.6, 220.0]),
        (2.0, [116.5, 146.8, 174.6]),
        (4.0, [174.6, 220.0, 261.6]),
        (6.0, [130.8, 164.8, 196.0]),
    ]
    for i in range(int(duration * SAMPLE_RATE)):
        t = i / SAMPLE_RATE
        val = 0.0
        for chord_start, freqs in chords:
            ct = t - chord_start
            if ct < 0 or ct > 2.5:
                continue
            # Arpeggiate
            for k, freq in enumerate(freqs):
                note_t = ct - k * 0.2
                if note_t < 0:
                    continue
                env = envelope_adsr(note_t, 1.5, attack=0.005, decay=0.3, sustain_level=0.2, release=0.3)
                val += sine(freq * 2, t) * env * 0.12
                val += sine(freq, t) * env * 0.06
        # Very quiet pad
        val += sine(220 + sine(0.2, t) * 10, t) * 0.015
        samples.append(val)
    return lowpass(samples, 0.25)


# ===== SFX Generation =====

def gen_sfx_shoot():
    """Quick laser-like shoot sound (0.15s)."""
    duration = 0.15
    samples = []
    for i in range(int(duration * SAMPLE_RATE)):
        t = i / SAMPLE_RATE
        freq = 1200 * math.exp(-t * 20)
        env = envelope_exp_decay(t, 18)
        val = sine(freq, t) * env * 0.4
        val += noise() * env * 0.05
        samples.append(val)
    return samples


def gen_sfx_hit():
    """Impact hit sound (0.2s)."""
    duration = 0.2
    samples = []
    for i in range(int(duration * SAMPLE_RATE)):
        t = i / SAMPLE_RATE
        env = envelope_exp_decay(t, 15)
        val = noise() * env * 0.3
        val += sine(300 * math.exp(-t * 10), t) * env * 0.3
        samples.append(val)
    return lowpass(samples, 0.4)


def gen_sfx_explosion():
    """Explosion sound (0.6s)."""
    duration = 0.6
    samples = []
    for i in range(int(duration * SAMPLE_RATE)):
        t = i / SAMPLE_RATE
        env = envelope_exp_decay(t, 4)
        val = noise() * env * 0.4
        val += sine(60 * math.exp(-t * 5), t) * env * 0.3
        val += sine(120, t) * envelope_exp_decay(t, 8) * 0.15
        samples.append(val)
    return lowpass(samples, 0.3)


def gen_sfx_skill():
    """Skill activation whoosh (0.4s)."""
    duration = 0.4
    samples = []
    for i in range(int(duration * SAMPLE_RATE)):
        t = i / SAMPLE_RATE
        # Rising sweep
        freq = 200 + 1500 * (t / duration)
        env = envelope_adsr(t, duration, attack=0.02, decay=0.1, sustain_level=0.6, release=0.15)
        val = sine(freq, t) * env * 0.2
        val += sine(freq * 1.5, t) * env * 0.1
        val += noise() * env * 0.05
        samples.append(val)
    return samples


def gen_sfx_ult():
    """Ultimate ability activation (0.8s)."""
    duration = 0.8
    samples = []
    for i in range(int(duration * SAMPLE_RATE)):
        t = i / SAMPLE_RATE
        # Power up sweep
        freq = 150 + 2000 * (t / duration) ** 2
        env = envelope_adsr(t, duration, attack=0.05, decay=0.1, sustain_level=0.8, release=0.2)
        val = sine(freq, t) * env * 0.2
        val += square(freq * 0.5, t) * env * 0.08
        # Impact at end
        if t > 0.5:
            impact_t = t - 0.5
            val += noise() * envelope_exp_decay(impact_t, 6) * 0.2
            val += sine(80, t) * envelope_exp_decay(impact_t, 4) * 0.2
        samples.append(val)
    return samples


def gen_sfx_dodge():
    """Quick dodge whoosh (0.2s)."""
    duration = 0.2
    samples = []
    for i in range(int(duration * SAMPLE_RATE)):
        t = i / SAMPLE_RATE
        env = envelope_adsr(t, duration, attack=0.01, decay=0.05, sustain_level=0.3, release=0.05)
        val = noise() * env * 0.2
        # Swoosh frequency
        freq = 800 + 600 * math.sin(t * 30)
        val += sine(freq, t) * env * 0.1
        samples.append(val)
    return lowpass(samples, 0.6)


def gen_sfx_levelup():
    """Level up chime (0.6s)."""
    duration = 0.6
    samples = []
    notes = [(0.0, 523.3), (0.1, 659.3), (0.2, 784.0), (0.35, 1047.0)]
    for i in range(int(duration * SAMPLE_RATE)):
        t = i / SAMPLE_RATE
        val = 0.0
        for nt, freq in notes:
            note_t = t - nt
            if note_t < 0:
                continue
            env = envelope_exp_decay(note_t, 3)
            val += sine(freq, t) * env * 0.2
            val += sine(freq * 2, t) * env * 0.05
        samples.append(val)
    return samples


def gen_sfx_button():
    """UI button click (0.08s)."""
    duration = 0.08
    samples = []
    for i in range(int(duration * SAMPLE_RATE)):
        t = i / SAMPLE_RATE
        env = envelope_exp_decay(t, 30)
        val = sine(800, t) * env * 0.2
        val += sine(1200, t) * env * 0.1
        samples.append(val)
    return samples


def gen_sfx_wave():
    """Wave clear fanfare (0.5s)."""
    duration = 0.5
    samples = []
    notes = [(0.0, 392.0), (0.08, 493.9), (0.16, 587.3), (0.3, 784.0)]
    for i in range(int(duration * SAMPLE_RATE)):
        t = i / SAMPLE_RATE
        val = 0.0
        for nt, freq in notes:
            note_t = t - nt
            if note_t < 0:
                continue
            env = envelope_exp_decay(note_t, 4)
            val += triangle(freq, t) * env * 0.15
            val += sine(freq * 2, t) * env * 0.05
        samples.append(val)
    return samples


def gen_sfx_portal():
    """Portal activation (0.5s)."""
    duration = 0.5
    samples = []
    for i in range(int(duration * SAMPLE_RATE)):
        t = i / SAMPLE_RATE
        freq = 300 + 400 * math.sin(t * 15)
        env = envelope_adsr(t, duration, attack=0.05, decay=0.1, sustain_level=0.5, release=0.15)
        val = sine(freq, t) * env * 0.15
        val += sine(freq * 1.5, t) * env * 0.08
        samples.append(val)
    return samples


def main():
    print("Generating audio files...")
    print()

    print("[BGM]")
    write_wav('bgm/title.wav', gen_bgm_title())
    write_wav('bgm/menu.wav', gen_bgm_menu())
    write_wav('bgm/battle.wav', gen_bgm_battle())
    write_wav('bgm/boss.wav', gen_bgm_boss())
    write_wav('bgm/result.wav', gen_bgm_result())
    write_wav('bgm/scenario.wav', gen_bgm_scenario())
    print()

    print("[SFX]")
    write_wav('sfx/shoot.wav', gen_sfx_shoot())
    write_wav('sfx/hit.wav', gen_sfx_hit())
    write_wav('sfx/explosion.wav', gen_sfx_explosion())
    write_wav('sfx/skill.wav', gen_sfx_skill())
    write_wav('sfx/ult.wav', gen_sfx_ult())
    write_wav('sfx/dodge.wav', gen_sfx_dodge())
    write_wav('sfx/levelup.wav', gen_sfx_levelup())
    write_wav('sfx/button.wav', gen_sfx_button())
    write_wav('sfx/wave.wav', gen_sfx_wave())
    write_wav('sfx/portal.wav', gen_sfx_portal())
    print()

    print("Done! All audio files generated.")


if __name__ == '__main__':
    main()
