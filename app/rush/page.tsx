import type { Metadata } from "next";
import { VerticalRushClient } from "@/components/rush/vertical-rush-client";

export const metadata: Metadata = {
  title: "Vertical rush",
  description: "Nokia-style climb: lanes, buffs, junk debuffs, obstacles. alpha — not medical advice.",
};

export default function RushPage() {
  return <VerticalRushClient />;
}
