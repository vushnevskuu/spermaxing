"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";

export function LeaderboardTable(props: {
  rows: {
    id: string;
    nickname: string;
    wins: number;
    streak: number;
    rating: number;
    podiums: number;
  }[];
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return props.rows;
    return props.rows.filter((r) => r.nickname.toLowerCase().includes(s));
  }, [props.rows, q]);

  return (
    <div className="space-y-3">
      <Input placeholder="Search nickname…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="overflow-x-auto rounded-sm border-2 border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">#</th>
              <th className="p-3">Nick</th>
              <th className="p-3">Wins</th>
              <th className="p-3">Podiums</th>
              <th className="p-3">Streak</th>
              <th className="p-3">Rating</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted-foreground">
                  Nothing here or no matches.
                </td>
              </tr>
            ) : (
              filtered.map((r, idx) => (
                <tr key={r.id} className="border-t border-white/5 hover:bg-white/5">
                  <td className="p-3 text-muted-foreground">{idx + 1}</td>
                  <td className="p-3 font-medium text-foreground">{r.nickname}</td>
                  <td className="p-3">{r.wins}</td>
                  <td className="p-3">{r.podiums}</td>
                  <td className="p-3">{r.streak}</td>
                  <td className="p-3">{r.rating}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
