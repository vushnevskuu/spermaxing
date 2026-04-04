import { Suspense } from "react";
import { LobbyClient } from "@/components/lobby/lobby-client";

export default function LobbyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center text-muted-foreground">
          Loading lobby…
        </div>
      }
    >
      <LobbyClient />
    </Suspense>
  );
}
