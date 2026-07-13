import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getThread, sendThreadMessage } from "@/lib/recruiter.functions";
import { supabase } from "@/integrations/supabase/client";

export function FeedbackThread({
  applicationId,
  currentUserId,
}: {
  applicationId: string;
  currentUserId: string;
}) {
  const fetchThread = useServerFn(getThread);
  const sendFn = useServerFn(sendThreadMessage);
  const qc = useQueryClient();
  const queryKey = useMemo(() => ["thread", applicationId], [applicationId]);
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchThread({ data: { applicationId } }),
  });
  const [body, setBody] = useState("");

  const m = useMutation({
    mutationFn: (text: string) => sendFn({ data: { threadId: data!.thread!.id, body: text } }),
    onSuccess: () => {
      setBody("");
      qc.invalidateQueries({ queryKey });
    },
  });

  useEffect(() => {
    if (!data?.thread?.id) return;
    const ch = supabase
      .channel(`thread:${data.thread.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "feedback_messages",
          filter: `thread_id=eq.${data.thread.id}`,
        },
        () => {
          qc.invalidateQueries({ queryKey });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [data?.thread?.id, qc, queryKey]);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading conversation…</p>;
  if (!data?.thread)
    return <p className="text-sm text-muted-foreground">No recruiter response yet.</p>;

  const decision = data.thread.decision;
  const badge =
    decision === "proceed" ? "default" : decision === "shortlist" ? "secondary" : "destructive";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Badge variant={badge as any}>{decision.toUpperCase()}</Badge>
        <span className="text-xs text-muted-foreground">
          {new Date(data.thread.created_at).toLocaleString()}
        </span>
      </div>
      <div className="max-h-80 space-y-3 overflow-y-auto rounded-lg border bg-muted/30 p-3">
        {data.messages.map((msg: any) => {
          const mine = msg.sender_id === currentUserId;
          return (
            <div key={msg.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-2 text-sm",
                  mine ? "bg-brand text-white" : "bg-background border",
                )}
              >
                <p className="whitespace-pre-wrap leading-relaxed">{msg.body}</p>
                <p className="mt-1 text-[10px] opacity-70">
                  {new Date(msg.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-end gap-2">
        <Textarea
          rows={2}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Reply to the recruiter…"
        />
        <Button
          onClick={() => body.trim() && m.mutate(body.trim())}
          disabled={!body.trim() || m.isPending}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
