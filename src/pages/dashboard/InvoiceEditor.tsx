import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Trash2,
  Loader2,
  ArrowLeft,
  Zap,
  Check,
  Copy,
  Send,
  ExternalLink,
  CalendarIcon,
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMerchant } from "@/hooks/useMerchant";
import { createInvoice } from "@/lib/db";

interface LineItem {
  name: string;
  qty: number;
  price: number;
}

export default function InvoiceEditor() {
  const navigate = useNavigate();
  const { merchant } = useMerchant();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d;
  });
  const [note, setNote] = useState("Thank you for your business! Payment is due within 30 days.");
  const [items, setItems] = useState<LineItem[]>([
    { name: "Service", qty: 1, price: 0 },
  ]);

  const total = items.reduce((sum, item) => sum + item.qty * item.price, 0);

  function addItem() {
    setItems([...items, { name: "", qty: 1, price: 0 }]);
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  function updateItem(index: number, field: keyof LineItem, value: string) {
    setItems(
      items.map((item, i) =>
        i === index
          ? {
              ...item,
              [field]: field === "name" ? value : parseFloat(value) || 0,
            }
          : item,
      ),
    );
  }

  async function handleCreate() {
    if (!merchant || total <= 0) return;
    setCreating(true);
    setError(null);
    try {
      const inv = await createInvoice({
        merchant_id: merchant.id,
        client_name: clientName.trim(),
        client_email: clientEmail.trim(),
        items: items.filter((i) => i.name.trim() && i.price > 0),
        total,
        due_date: dueDate ? format(dueDate, "yyyy-MM-dd") : undefined,
      });
      setShareUrl(`${window.location.origin}/invoice/${inv.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create invoice");
    } finally {
      setCreating(false);
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const validItems = items.filter((i) => i.name.trim());
  const merchantName = merchant?.name || "Your Business";

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => navigate("/dashboard/invoices")}
          aria-label="Back to invoices"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-2xl font-bold">New Invoice</h1>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {/* Left: Live Preview */}
        <div className="rounded-xl border bg-white shadow-sm p-8 min-h-[600px] order-2 xl:order-1">
          {/* Invoice header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-3xl font-black tracking-tight">INVOICE</h2>
              <p className="text-xs text-muted-foreground mt-0.5 font-mono">[draft]</p>
              <p className="text-sm text-accent mt-3 font-medium">{today}</p>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="size-5 text-accent" />
              <span className="text-xl font-bold">{merchantName}</span>
            </div>
          </div>

          {/* From / To */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">From:</p>
              <p className="text-sm font-bold">{merchantName}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">To:</p>
              <p className="text-sm font-bold">{clientName || "Client Name"}</p>
              {clientEmail && (
                <p className="text-sm text-muted-foreground">{clientEmail}</p>
              )}
            </div>
          </div>

          {/* Due date */}
          <div className="mb-8">
            <p className="text-xs font-semibold text-muted-foreground mb-1">Due Date:</p>
            <p className="text-sm font-bold">
              {dueDate ? format(dueDate, "MMMM d, yyyy") : "Not set"}
            </p>
          </div>

          <Separator className="mb-4" />

          {/* Table header */}
          <div className="grid grid-cols-[1fr_80px_100px_100px] gap-2 text-xs font-semibold text-muted-foreground pb-2 border-b">
            <span>Item</span>
            <span className="text-right">Quantity</span>
            <span className="text-right">Amount</span>
            <span className="text-right">Total</span>
          </div>

          {/* Table rows */}
          <div className="divide-y">
            {(validItems.length > 0 ? validItems : [{ name: "Service", qty: 1, price: 0 }]).map(
              (item, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[1fr_80px_100px_100px] gap-2 py-3 text-sm"
                >
                  <span>{item.name}</span>
                  <span className="text-right tabular-nums">{item.qty}</span>
                  <span className="text-right tabular-nums">
                    {item.price.toFixed(2)} STRK
                  </span>
                  <span className="text-right tabular-nums font-medium">
                    {(item.qty * item.price).toFixed(2)} STRK
                  </span>
                </div>
              ),
            )}
          </div>

          {/* Total */}
          <div className="flex justify-end pt-4 border-t mt-2">
            <div className="text-right">
              <span className="text-sm text-muted-foreground mr-4">Total:</span>
              <span className="text-xl font-bold tabular-nums">
                {total.toFixed(2)} STRK
              </span>
            </div>
          </div>

          {/* Note */}
          {note && (
            <div className="mt-10 pt-4 border-t">
              <p className="text-xs font-semibold text-accent mb-1">Note:</p>
              <p className="text-sm text-muted-foreground">{note}</p>
            </div>
          )}
        </div>

        {/* Right: Form */}
        <div className="rounded-xl border bg-card shadow-sm p-6 space-y-6 order-1 xl:order-2">
          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Due date */}
          <div className="space-y-2">
            <Label>
              Due Date <span className="text-destructive">*</span>
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={`w-full justify-start text-left font-normal ${!dueDate ? "text-muted-foreground" : ""}`}
                >
                  <CalendarIcon className="size-4 mr-2" />
                  {dueDate ? format(dueDate, "MMMM d, yyyy") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <Separator />

          {/* Client info */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Bill To</h3>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Client name"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="client@example.com"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Line items */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Items</h3>
            {items.map((item, i) => (
              <div key={i} className="flex gap-2 items-end">
                <div className="flex-1 space-y-1">
                  {i === 0 && (
                    <span className="text-xs text-muted-foreground">Name</span>
                  )}
                  <Input
                    value={item.name}
                    onChange={(e) => updateItem(i, "name", e.target.value)}
                    placeholder="Item name"
                  />
                </div>
                <div className="w-16 space-y-1">
                  {i === 0 && (
                    <span className="text-xs text-muted-foreground">Qty</span>
                  )}
                  <Input
                    type="number"
                    value={item.qty || ""}
                    onChange={(e) => updateItem(i, "qty", e.target.value)}
                    className="text-center"
                  />
                </div>
                <div className="w-24 space-y-1">
                  {i === 0 && (
                    <span className="text-xs text-muted-foreground">Price</span>
                  )}
                  <Input
                    type="number"
                    value={item.price || ""}
                    onChange={(e) => updateItem(i, "price", e.target.value)}
                    placeholder="0.00"
                    className="text-right"
                  />
                </div>
                <div className="w-9">
                  {items.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeItem(i)}
                      aria-label="Remove item"
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addItem} className="w-full">
              <Plus className="size-4" />
              Add Item
            </Button>
          </div>

          <Separator />

          {/* Note */}
          <div className="space-y-2">
            <Label>Note</Label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note for the client"
              rows={2}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
          </div>

          {/* Total + create */}
          <div className="flex justify-between items-center pt-2 border-t">
            <span className="font-medium">Total</span>
            <span className="text-xl font-bold tabular-nums">
              {total.toFixed(2)} STRK
            </span>
          </div>

          <Button
            onClick={handleCreate}
            disabled={creating || total <= 0}
            className="w-full"
            size="lg"
          >
            {creating && <Loader2 className="size-4 animate-spin" />}
            Create Invoice
          </Button>
        </div>
      </div>

      {/* Share Invoice Dialog */}
      <Dialog
        open={!!shareUrl}
        onOpenChange={(open) => {
          if (!open) navigate("/dashboard/invoices");
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Share Invoice</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Social share buttons */}
            <div className="flex justify-center gap-3">
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`You can view and pay this invoice here: ${shareUrl}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="size-11 rounded-full bg-[#1DA1F2] flex items-center justify-center text-white hover:opacity-90 transition-opacity"
                aria-label="Share on X"
              >
                <svg viewBox="0 0 24 24" className="size-5 fill-current">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a
                href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl ?? "")}&text=${encodeURIComponent("You can view and pay this invoice here:")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="size-11 rounded-full bg-[#0088cc] flex items-center justify-center text-white hover:opacity-90 transition-opacity"
                aria-label="Share on Telegram"
              >
                <Send className="size-5" />
              </a>
            </div>

            {/* Link preview */}
            <div className="rounded-lg border bg-muted/50 p-3 text-sm text-muted-foreground break-all">
              You can view and pay this invoice here: {shareUrl}
            </div>

            {/* Copy button */}
            <Button
              onClick={() => {
                navigator.clipboard.writeText(
                  `You can view and pay this invoice here: ${shareUrl}`,
                );
                setLinkCopied(true);
                setTimeout(() => setLinkCopied(false), 2000);
              }}
              className="w-full"
              size="lg"
            >
              {linkCopied ? (
                <Check className="size-5" />
              ) : (
                <Copy className="size-5" />
              )}
              {linkCopied ? "Copied!" : "Copy Link"}
            </Button>

            {/* Action buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                asChild
              >
                <a
                  href={shareUrl ?? ""}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="size-4" />
                  View
                </a>
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => navigate("/dashboard/invoices")}
              >
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
