/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SoundType } from '../types';

export class AlarmSynth {
  private static audioCtx: AudioContext | null = null;
  private static activeNodes: AudioNode[] = [];
  private static intervalId: any = null;
  private static timeoutId: any = null;
  private static isPlaying = false;

  private static initAudioContext(): AudioContext {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  public static stop(): void {
    this.isPlaying = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    this.activeNodes.forEach((node) => {
      try {
        (node as any).stop();
      } catch (e) {
        // node might not have stop, or already stopped
      }
      try {
        node.disconnect();
      } catch (e) {
        // ignore
      }
    });
    this.activeNodes = [];
  }

  public static start(type: SoundType): void {
    this.stop(); // Stop any pending playing sound first
    const ctx = this.initAudioContext();
    this.isPlaying = true;

    // Based on the sound type, we run a schedule loop
    switch (type) {
      case 'digital':
        this.playDigitalLoop(ctx);
        break;
      case 'analog':
        this.playAnalogLoop(ctx);
        break;
      case 'bell':
        this.playBellLoop(ctx);
        break;
      case 'birds':
        this.playBirdsLoop(ctx);
        break;
      case 'melodic':
        this.playMelodicLoop(ctx);
        break;
      default:
        this.playDigitalLoop(ctx);
        break;
    }
  }

  public static preview(type: SoundType): void {
    this.start(type);
    this.timeoutId = setTimeout(() => {
      this.stop();
    }, 2500); // short preview
  }

  // SOUND GENERATORS

  private static playDigitalLoop(ctx: AudioContext): void {
    const playBeep = () => {
      if (!this.isPlaying) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // High pitch standard beep

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.2);

      this.activeNodes.push(osc);
    };

    // Standard interval double beep
    let step = 0;
    this.intervalId = setInterval(() => {
      if (step === 0 || step === 1) {
        playBeep();
      }
      step = (step + 1) % 4; // Beep Beep Pause Pause
    }, 200);
  }

  private static playAnalogLoop(ctx: AudioContext): void {
    const playRing = () => {
      if (!this.isPlaying) return;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(440, ctx.currentTime);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(445, ctx.currentTime); // Creates a vibrating ring (beating)

      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.45);
      osc2.stop(ctx.currentTime + 0.45);

      this.activeNodes.push(osc1, osc2);
    };

    this.intervalId = setInterval(() => {
      playRing();
    }, 600);
  }

  private static playBellLoop(ctx: AudioContext): void {
    const playBellStrike = () => {
      if (!this.isPlaying) return;

      const now = ctx.currentTime;
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0.3, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      gainNode.connect(ctx.destination);

      // A metallic bell is made of multiple carrier frequencies
      const frequencies = [300, 440, 543, 679, 821];
      frequencies.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        // Slightly shift tones for realistic bell richness
        const partialGain = ctx.createGain();
        partialGain.gain.setValueAtTime(0.4 / (index + 1), now);
        partialGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2 - (0.1 * index));

        osc.connect(partialGain);
        partialGain.connect(gainNode);

        osc.start(now);
        osc.stop(now + 1.3);
        this.activeNodes.push(osc);
      });
    };

    playBellStrike();
    this.intervalId = setInterval(() => {
      playBellStrike();
    }, 1500);
  }

  private static playBirdsLoop(ctx: AudioContext): void {
    const playBirdChirp = () => {
      if (!this.isPlaying) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const mod = ctx.createOscillator();
      const modGain = ctx.createGain();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(2500, now); // high pitch

      // Rapidly sweep the frequency up/down to represent a chirp
      osc.frequency.exponentialRampToValueAtTime(3500, now + 0.15);
      osc.frequency.exponentialRampToValueAtTime(2800, now + 0.3);

      mod.type = 'sine';
      mod.frequency.setValueAtTime(45, now);
      modGain.gain.setValueAtTime(200, now);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      mod.connect(modGain);
      modGain.connect(osc.frequency);
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      mod.start(now);
      osc.stop(now + 0.4);
      mod.stop(now + 0.4);

      this.activeNodes.push(osc, mod);
    };

    let step = 0;
    this.intervalId = setInterval(() => {
      // Simulate natural chirping groupings
      if (step % 4 === 0 || step % 4 === 1) {
        playBirdChirp();
      }
      step++;
    }, 450);
  }

  private static playMelodicLoop(ctx: AudioContext): void {
    const notes = [
      261.63, // C4
      329.63, // E4
      392.00, // G4
      523.25, // C5
      392.00, // G4
      329.63, // E4
    ];

    let noteIndex = 0;
    const playNote = () => {
      if (!this.isPlaying) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle'; // Soft flute/synth sound
      osc.frequency.setValueAtTime(notes[noteIndex], now);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.5);

      this.activeNodes.push(osc);
      noteIndex = (noteIndex + 1) % notes.length;
    };

    this.intervalId = setInterval(() => {
      playNote();
    }, 300);
  }
}
