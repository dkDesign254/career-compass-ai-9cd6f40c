import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteBlogPost, listBlogPosts, upsertBlogPost } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/blog")({
  head: () => ({ meta: [{ title: "Blog CMS — Admin" }] }),
  component: BlogAdminPage,
});

function BlogAdminPage() {
  const listFn = useServerFn(listBlogPosts);
  const upsertFn = useServerFn(upsertBlogPost);
  const delFn = useServerFn(deleteBlogPost);
  const qc = useQueryClient();
  const { data: posts, isLoading } = useQuery({ queryKey: ["blog-posts"], queryFn: () => listFn() });
  const [draft, setDraft] = useState({ title: "", slug: "", excerpt: "", body_md: "", cover_image_url: "", published: false });

  const upsert = useMutation({
    mutationFn: (v: any) => upsertFn({ data: v }),
    onSuccess: () => { toast.success("Saved"); setDraft({ title: "", slug: "", excerpt: "", body_md: "", cover_image_url: "", published: false }); qc.invalidateQueries({ queryKey: ["blog-posts"] }); },
    onError: (e: any) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["blog-posts"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="font-display text-2xl font-bold">Blog / CMS</h1>

        <Card>
          <CardContent className="space-y-3 p-4">
            <p className="font-semibold">New post</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input placeholder="Title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
              <Input placeholder="slug-like-this" value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} />
            </div>
            <Input placeholder="Cover image URL (optional)" value={draft.cover_image_url} onChange={(e) => setDraft({ ...draft, cover_image_url: e.target.value })} />
            <Textarea placeholder="Excerpt" value={draft.excerpt} onChange={(e) => setDraft({ ...draft, excerpt: e.target.value })} />
            <Textarea placeholder="Body (Markdown)" rows={8} value={draft.body_md} onChange={(e) => setDraft({ ...draft, body_md: e.target.value })} />
            <div className="flex items-center gap-3">
              <span className="text-sm">Publish now</span>
              <Switch checked={draft.published} onCheckedChange={(v) => setDraft({ ...draft, published: v })} />
              <Button className="ml-auto" onClick={() => upsert.mutate({ ...draft, cover_image_url: draft.cover_image_url || null, excerpt: draft.excerpt || undefined })} disabled={!draft.title || !draft.slug || !draft.body_md || upsert.isPending}>
                Save post
              </Button>
            </div>
          </CardContent>
        </Card>

        {isLoading ? <p>Loading…</p> : (
          <div className="grid gap-2">
            {(posts ?? []).map((p: any) => (
              <Card key={p.id}>
                <CardContent className="flex items-center justify-between gap-3 p-3">
                  <div>
                    <p className="font-medium">{p.title}</p>
                    <p className="text-xs text-muted-foreground">/{p.slug} · {new Date(p.updated_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.published ? <Badge>published</Badge> : <Badge variant="outline">draft</Badge>}
                    <Button size="sm" variant="destructive" onClick={() => { if (confirm("Delete post?")) del.mutate(p.id); }}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
