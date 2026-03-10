import { useState, useEffect } from "react";
import { Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMerchant } from "@/hooks/useMerchant";

export default function Settings() {
  const { merchant, loading, saveMerchant } = useMerchant();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (merchant) {
      setName(merchant.name);
      setSlug(merchant.slug ?? "");
      setDescription(merchant.description);
    }
  }, [merchant]);

  async function handleSave() {
    if (!name.trim() || !slug.trim()) return;
    setSaving(true);
    setSaved(false);
    try {
      await saveMerchant({
        name: name.trim(),
        slug: slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-"),
        description: description.trim(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Merchant Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Shop Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Shop"
            />
          </div>

          <div className="space-y-2">
            <Label>Shop URL Slug *</Label>
            <div className="flex">
              <span className="inline-flex items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground">
                /shop/
              </span>
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="my-shop"
                className="rounded-l-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell customers about your business"
              rows={3}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <Button
            onClick={handleSave}
            disabled={saving || !name.trim() || !slug.trim()}
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : saved ? (
              <Check className="size-4" />
            ) : null}
            {saved ? "Saved!" : "Save Settings"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
