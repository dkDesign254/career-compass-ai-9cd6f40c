import { AlertTriangle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

export function AiError({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const msg = error instanceof Error ? error.message : String(error);
  const isQuota = /free AI runs|credits exhausted/i.test(msg);
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
        <div className="flex-1">
          <p className="font-medium text-destructive">
            {isQuota ? "Out of AI runs" : "AI request failed"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{msg}</p>
          <div className="mt-3 flex gap-2">
            {isQuota ? (
              <Button asChild size="sm" variant="default">
                <Link to="/billing">
                  <Sparkles className="mr-1 h-3 w-3" /> Upgrade
                </Link>
              </Button>
            ) : (
              onRetry && (
                <Button size="sm" variant="outline" onClick={onRetry}>
                  Try again
                </Button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
