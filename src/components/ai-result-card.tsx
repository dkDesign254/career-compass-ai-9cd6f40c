import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function ScoreRing({ score, label }: { score: number; label?: string }) {
  const color = score >= 75 ? "text-emerald-500" : score >= 50 ? "text-coral" : "text-destructive";
  return (
    <div className="flex flex-col items-center justify-center">
      <div className={cn("font-display text-5xl font-bold", color)}>{score}</div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label ?? "Score"}</div>
    </div>
  );
}

export function MetricRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}</span>
      </div>
      <Progress value={value} />
    </div>
  );
}

export function ChipList({ items, variant = "default" }: { items: string[]; variant?: "default" | "secondary" | "destructive" | "outline" }) {
  if (!items?.length) return <p className="text-sm text-muted-foreground">None.</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((s, i) => (
        <Badge key={i} variant={variant}>{s}</Badge>
      ))}
    </div>
  );
}

export function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}