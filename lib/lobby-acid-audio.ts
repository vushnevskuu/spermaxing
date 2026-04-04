/**
 * Лобби-ритм: лёгкий «acid techno» намёк через Web Audio (кик + короткий resonant squelch).
 * Только акцентные удары (раз в такт), без частой сетки — визуал синхронизируется через onAccent.
 */

export type LobbyAcidAudioHandle = {
  start: () => Promise<void>;
  stop: () => void;
};

type Opts = {
  /** BPM сетки (между акцентами beatsPerPulse долей). */
  bpm?: number;
  /** Пульс звуком/колбэком каждые N четвертей (4 = раз в такт в 4/4). */
  beatsPerPulse?: number;
  onAccent: () => void;
  masterVolume?: number;
};

export function createLobbyAcidLoop(opts: Opts): LobbyAcidAudioHandle {
  const bpm = opts.bpm ?? 92;
  const beatsPerPulse = opts.beatsPerPulse ?? 4;
  const vol = Math.min(0.45, Math.max(0.05, opts.masterVolume ?? 0.32));
  const beatSec = 60 / bpm;
  const pulseSec = beatSec * beatsPerPulse;

  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let running = false;
  let nextPulseAt = 0;
  let raf = 0;

  function playAccentAt(time: number) {
    if (!ctx || !master) return;

    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(54, time);
    o.frequency.exponentialRampToValueAtTime(36, time + 0.075);
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(0.9 * vol, time + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.24);
    o.connect(g);
    g.connect(master);
    o.start(time);
    o.stop(time + 0.28);

    const o2 = ctx.createOscillator();
    const f = ctx.createBiquadFilter();
    const g2 = ctx.createGain();
    o2.type = "sawtooth";
    o2.frequency.setValueAtTime(92, time);
    f.type = "lowpass";
    f.Q.value = 9;
    f.frequency.setValueAtTime(180, time);
    f.frequency.exponentialRampToValueAtTime(3200, time + 0.055);
    g2.gain.setValueAtTime(0, time);
    g2.gain.linearRampToValueAtTime(0.22 * vol, time + 0.002);
    g2.gain.exponentialRampToValueAtTime(0.0001, time + 0.11);
    o2.connect(f);
    f.connect(g2);
    g2.connect(master);
    o2.start(time);
    o2.stop(time + 0.14);
  }

  function tick() {
    if (!running || !ctx || !master) return;
    const t = ctx.currentTime;
    while (nextPulseAt < t + 0.03) {
      playAccentAt(nextPulseAt);
      opts.onAccent();
      nextPulseAt += pulseSec;
    }
    raf = requestAnimationFrame(tick);
  }

  return {
    async start() {
      if (running) return;
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      ctx = new AudioCtx();
      master = ctx.createGain();
      master.gain.value = 1;
      master.connect(ctx.destination);
      await ctx.resume();
      running = true;
      nextPulseAt = ctx.currentTime + 0.12;
      tick();
    },
    stop() {
      running = false;
      cancelAnimationFrame(raf);
      raf = 0;
      void ctx?.close();
      ctx = null;
      master = null;
    },
  };
}
