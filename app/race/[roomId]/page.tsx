import { RaceClient } from "@/components/race/race-client";

export default async function RacePage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  return <RaceClient roomId={roomId} />;
}
