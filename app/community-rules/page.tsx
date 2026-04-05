import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function CommunityRulesPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Button variant="ghost" className="mb-6" asChild>
        <Link href="/">← Home</Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">OVUM RUSH community rules</CardTitle>
        </CardHeader>
        <CardContent className="max-w-none space-y-4 text-sm text-muted-foreground">
          <p>
            This is a <strong className="text-foreground">humorous arcade game</strong>, not a medical
            service. Do not share personal data, harass others, or post explicit or graphic content.
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>Public nicknames only; no separate DM inbox in MVP (whispers are lobby-only).</li>
            <li>No threats, discrimination, doxxing, spam, or moderation evasion.</li>
            <li>Chat is filtered; use Report on messages and profiles.</li>
            <li>Moderators may restrict access without warning for violations.</li>
          </ul>
          <p className="text-xs">
            Beta software — for entertainment and community chat only. Do not use the game as a source of
            medical or health advice.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
