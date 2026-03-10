import { Link } from "react-router-dom";
import { useState } from "react";
import { Search, ArrowLeft, Zap, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { listMerchants } from "@/lib/db";

export default function Explore() {
  const [search, setSearch] = useState("");

  const { data: merchants = [], isLoading: loading } = useQuery({
    queryKey: ["merchants"],
    queryFn: listMerchants,
  });

  const filtered = merchants.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.slug?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="min-h-dvh bg-background">
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon-sm" asChild aria-label="Back to wallet">
            <Link to="/wallet">
              <ArrowLeft className="size-5" />
            </Link>
          </Button>
          <h1 className="text-xl font-bold">Explore Merchants</h1>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search merchants..."
            className="pl-10"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center">
              <Zap className="size-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {merchants.length === 0
                  ? "No merchants registered yet. Be the first!"
                  : "No merchants match your search."}
              </p>
              {merchants.length === 0 && (
                <Button variant="link" size="sm" asChild className="mt-2">
                  <Link to="/dashboard/settings">Register as merchant</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((m) => (
              <Link
                key={m.id}
                to={`/shop/${m.slug}`}
                className="flex items-center gap-4 rounded-xl bg-card border p-4 hover:border-accent/30 transition-colors"
              >
                <div className="size-10 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                  {m.avatar_url ? (
                    <img
                      src={m.avatar_url}
                      alt={m.name}
                      className="size-10 rounded-full object-cover"
                    />
                  ) : (
                    <Zap className="size-5 text-accent" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate">{m.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    /shop/{m.slug}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
