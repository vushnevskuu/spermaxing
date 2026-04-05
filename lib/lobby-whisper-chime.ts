/**
 * Короткий двухтоновый «пинг» в духе лобби (лёгкий acid/neon): личное сообщение.
 * Не зависит от фона Beat — отдельный короткий one-shot.
 */

let sharedCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedCtx || sharedCtx.state === "closed") {
    sharedCtx = new Ctor();
  }
  return sharedCtx;
}

export function playLobbyWhisperChime(): void {
  try {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
  } catch {
    /* ignore */
  }

  const ctx = getCtx();
  if (!ctx) return;

  void (async () => {
    try {
      await ctx.resume();
    } catch {
      return;
    }
    const t0 = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.value = 0.22;
    master.connect(ctx.destination);

    const freqs = [740, 1180];
    freqs.forEach((freq, i) => {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.setValueAtTime(freq, t0 + i * 0.028);
      const g = ctx.createGain();
      const start = t0 + i * 0.028;
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(0.55, start + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0008, start + 0.16);
      o.connect(g);
      g.connect(master);
      o.start(start);
      o.stop(start + 0.2);
    });

    const squelch = ctx.createOscillator();
    squelch.type = "sawtooth";
    squelch.frequency.setValueAtTime(220, t0);
    const filt = ctx.createBiquadFilter();
    filt.type = "bandpass";
    filt.frequency.setValueAtTime(900, t0);
    filt.frequency.exponentialRampToValueAtTime(2400, t0 + 0.05);
    filt.Q.value = 8;
    const gS = ctx.createGain();
    gS.gain.setValueAtTime(0, t0);
    gS.gain.linearRampToValueAtTime(0.08, t0 + 0.004);
    gS.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.09);
    squelch.connect(filt);
    filt.connect(gS);
    gS.connect(master);
    squelch.start(t0);
    squelch.stop(t0 + 0.1);
  })();
}
