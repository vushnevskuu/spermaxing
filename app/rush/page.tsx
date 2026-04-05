import type { Metadata } from "next";
import { VerticalRushClient } from "@/components/rush/vertical-rush-client";

export const metadata: Metadata = {
  title: "Vertical rush",
  description: "Arcade climb — dodge obstacles, collect buffs. Beta, not medical advice.",
};

export default function RushPage() {
  return <VerticalRushClient />;
}
