"use client";

import { useEffect, useRef } from "react";
import { createLobbyAcidLoop } from "@/lib/lobby-acid-audio";
import { useLobbyRhythmStore } from "@/store/lobby-rhythm-store";

/** Стартует/гасит Web Audio петлю лобби и дергает bumpAccent по сетке. */
export function LobbyAudioBridge() {
  const on = useLobbyRhythmStore((s) => s.lobbyMusicOn);
  const bumpAccent = useLobbyRhythmStore((s) => s.bumpAccent);
  const handleRef = useRef<ReturnType<typeof createLobbyAcidLoop> | null>(null);

  useEffect(() => {
    if (!on) {
      handleRef.current?.stop();
      handleRef.current = null;
      return;
    }
    const h = createLobbyAcidLoop({
      bpm: 92,
      beatsPerPulse: 4,
      masterVolume: 0.3,
      onAccent: () => bumpAccent(),
    });
    handleRef.current = h;
    void h.start();
    return () => {
      h.stop();
      if (handleRef.current === h) handleRef.current = null;
    };
  }, [on, bumpAccent]);

  return null;
}
