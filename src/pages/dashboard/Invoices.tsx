import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Plus,
  Copy,
  Check,
  Loader2,
  FileText,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMerchant } from "@/hooks/useMerchant";
import { listInvoices } from "@/lib/db";

export default function Invoices() {
  const navigate = useNavigate();
  const { merchant } = useMerchant();
  const [copied, setCopied] = useState<string | null>(null);

  const { data: invoices = [], isLoading: loading } = useQuery({
    queryKey: ["invoices", merchant?.id],
    queryFn: () => listInvoices(merchant!.id),
    enabled: !!merchant,
  });

  function getInvoiceUrl(id: string) {
    return `${window.location.origin}/invoice/${id}`;
  }

  function handleCopy(id: string) {
    navigator.clipboard.writeText(getInvoiceUrl(id));
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
    draft: "outline",
    sent: "secondary",
    paid: "default",
  };

  if (!merchant) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Invoices</h1>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            Please set up your merchant profile in Settings first.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Invoices</h1>
        <Button onClick={() => navigate("/dashboard/invoices/new")}>
          <Plus className="size-4" />
          New Invoice
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : invoices.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            No invoices yet. Create one to send payment requests to clients.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {invoices.map((inv) => (
            <Card key={inv.id} className="py-0">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="size-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">
                      {inv.client_name || "Unnamed client"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {inv.total} {inv.token} &middot;{" "}
                      {inv.due_date
                        ? `Due ${new Date(inv.due_date).toLocaleDateString()}`
                        : "No due date"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant={statusVariant[inv.status] ?? "outline"}>
                    {inv.status}
                  </Badge>
                  <Button variant="ghost" size="icon-sm" asChild aria-label="Open invoice">
                    <a
                      href={getInvoiceUrl(inv.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="size-4" />
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleCopy(inv.id)}
                    aria-label="Copy invoice link"
                  >
                    {copied === inv.id ? (
                      <Check className="size-4 text-emerald-500" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
