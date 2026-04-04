"use client";

import { create } from "zustand";

interface LobbyRhythmState {
  /** Увеличивается на каждый акцентный бит (синхрон визуал). */
  accentGeneration: number;
  bumpAccent: () => void;
  lobbyMusicOn: boolean;
  setLobbyMusicOn: (v: boolean) => void;
}

export const useLobbyRhythmStore = create<LobbyRhythmState>((set) => ({
  accentGeneration: 0,
  bumpAccent: () => set((s) => ({ accentGeneration: s.accentGeneration + 1 })),
  lobbyMusicOn: false,
  setLobbyMusicOn: (v) => set({ lobbyMusicOn: v }),
}));
