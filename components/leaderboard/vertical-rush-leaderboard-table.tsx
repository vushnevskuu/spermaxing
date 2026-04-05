"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";

export type VerticalRushRow = {
  id: string;
  nickname: string;
  bestM: number;
  runs: number;
};

export function VerticalRushLeaderboardTable(props: { rows: VerticalRushRow[] }) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return props.rows;
    return props.rows.filter((r) => r.nickname.toLowerCase().includes(s));
  }, [props.rows, q]);

  return (
    <div className="space-y-3">
      <Input
        className="min-h-11 text-base md:min-h-10 md:text-sm"
        placeholder="Search nickname…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="overflow-x-auto rounded-sm border-2 border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">#</th>
              <th className="p-3">Nick</th>
              <th className="p-3">Best (m)</th>
              <th className="p-3">Runs</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-6 text-center text-muted-foreground">
                  Nothing here or no matches.
                </td>
              </tr>
            ) : (
              filtered.map((r, idx) => (
                <tr key={r.id} className="border-t border-white/5 hover:bg-white/5">
                  <td className="p-3 text-muted-foreground">{idx + 1}</td>
                  <td className="p-3 font-medium text-foreground">{r.nickname}</td>
                  <td className="p-3 tabular-nums">{r.bestM.toLocaleString()}</td>
                  <td className="p-3 tabular-nums">{r.runs}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
