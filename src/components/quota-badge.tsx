import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getQuotaStatus } from "@/lib/ai.functions";

export function QuotaBadge() {
  const fn = useServerFn(getQuotaStatus);
  const { data } = useQuery({
    queryKey: ["ai-quota"],
    queryFn: () => fn(),
    staleTime: 30_000,
  });
  if (!data) return null;
  const label = data.isPaid
    ? `${data.used} runs this month`
    : `${data.used} / ${data.limit} AI runs`;
  const exhausted = !data.isPaid && data.limit !== null && data.used >= data.limit;
  return (
    <Badge variant={exhausted ? "destructive" : "secondary"} className="gap-1">
      <Zap className="h-3 w-3" />
      {label}
    </Badge>
  );
}