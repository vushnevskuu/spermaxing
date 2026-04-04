"use client";

import { create } from "zustand";

interface LobbyState {
  inEggZone: boolean;
  setInEggZone: (v: boolean) => void;
  queueHint: string | null;
  setQueueHint: (v: string | null) => void;
  selectedProfileId: string | null;
  setSelectedProfileId: (id: string | null) => void;
  wardrobeOpen: boolean;
  setWardrobeOpen: (v: boolean) => void;
  profileOpen: boolean;
  setProfileOpen: (v: boolean) => void;
}

export const useLobbyStore = create<LobbyState>((set) => ({
  inEggZone: false,
  setInEggZone: (v) => set({ inEggZone: v }),
  queueHint: null,
  setQueueHint: (v) => set({ queueHint: v }),
  selectedProfileId: null,
  setSelectedProfileId: (id) => set({ selectedProfileId: id }),
  wardrobeOpen: false,
  setWardrobeOpen: (v) => set({ wardrobeOpen: v }),
  profileOpen: false,
  setProfileOpen: (v) => set({ profileOpen: v }),
}));
