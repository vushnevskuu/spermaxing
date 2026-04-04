"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function AgeWarningBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="border-b border-amber-500/40 bg-amber-950/40 px-4 py-2 text-center text-sm text-amber-100">
      <span className="font-semibold">18+</span> — entertainment arcade product, not medical or health
      education.{" "}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="ml-2 h-7 text-amber-200 hover:text-white"
        onClick={() => setDismissed(true)}
      >
        Got it
      </Button>
    </div>
  );
}
