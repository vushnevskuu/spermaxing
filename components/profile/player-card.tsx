"use client";

import { useCallback } from "react";
import { motion } from "framer-motion";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SwimmerAvatar } from "@/components/avatar/swimmer-avatar";
import type { ProfileCardData } from "@/types";

export function PlayerCard(props: { data: ProfileCardData; exportId?: string }) {
  const { data, exportId = "profile-card-export" } = props;

  const share = useCallback(async () => {
    const text = `${data.nickname} · ${data.title} · OVR ${data.ovr} · W ${data.wins} · OVUM RUSH`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
    if (navigator.share) {
      try {
        await navigator.share({ title: "OVUM RUSH", text });
      } catch {
        /* ignore */
      }
    }
  }, [data.nickname, data.title, data.ovr, data.wins]);

  return (
    <motion.div
      id={exportId}
      layout
      className="relative mx-auto w-full max-w-sm overflow-hidden rounded-lg border border-border bg-card p-5 shadow-sm"
    >
      <div className="relative flex gap-4">
        <div className="flex flex-col items-center">
          <SwimmerAvatar
            colorTheme={data.colorTheme}
            tailType={data.tailType}
            auraEffect={data.auraEffect}
            headgear={data.headgear}
            faceExtra={data.faceExtra}
            neckWear={data.neckWear}
            size="lg"
          />
          <p className="mt-2 text-center text-xs uppercase tracking-widest text-muted-foreground">
            {data.division}
          </p>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="truncate text-xl font-semibold tracking-tight text-foreground">
                {data.nickname}
              </h3>
              <p className="text-sm text-muted-foreground">{data.avatarName}</p>
            </div>
            <div className="rounded-md border border-border bg-muted/40 px-3 py-1 text-center">
              <div className="text-[10px] uppercase text-muted-foreground">OVR</div>
              <div className="text-2xl font-semibold tabular-nums text-foreground">{data.ovr}</div>
            </div>
          </div>
          <p className="mt-2 text-sm font-medium text-muted-foreground">{data.title}</p>
          <p className="text-xs text-muted-foreground line-clamp-2">{data.tagline}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="outline">W {data.wins}</Badge>
            <Badge variant="hot">Streak {data.streak}</Badge>
            {data.badges.slice(0, 3).map((b) => (
              <Badge key={b} variant="secondary">
                {b}
              </Badge>
            ))}
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-4 w-full border border-white/10"
            onClick={share}
          >
            <Share2 className="mr-2 h-4 w-4" />
            Share card
          </Button>
          <p className="mt-2 text-[10px] text-muted-foreground">
            Screenshot this area as your export. Text is copied to the clipboard.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
