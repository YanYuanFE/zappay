import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Copy,
  Check,
  Loader2,
  QrCode,
  Trash2,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useMerchant } from "@/hooks/useMerchant";
import {
  listPaymentCodes,
  createPaymentCode,
  deletePaymentCode,
} from "@/lib/db";

export default function PaymentCodes() {
  const { merchant } = useMerchant();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [showQR, setShowQR] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");

  const { data: codes = [], isLoading: loading } = useQuery({
    queryKey: ["paymentCodes", merchant?.id],
    queryFn: () => listPaymentCodes(merchant!.id),
    enabled: !!merchant,
  });

  async function handleCreate() {
    if (!merchant) return;
    setCreating(true);
    try {
      await createPaymentCode({
        merchant_id: merchant.id,
        label: label.trim() || "Payment",
        amount: amount ? parseFloat(amount) : null,
      });
      setLabel("");
      setAmount("");
      setShowCreate(false);
      queryClient.invalidateQueries({ queryKey: ["paymentCodes", merchant.id] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create payment code");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    await deletePaymentCode(id);
    queryClient.invalidateQueries({ queryKey: ["paymentCodes", merchant?.id] });
  }

  function getPayUrl(id: string) {
    return `${window.location.origin}/pay/${id}`;
  }

  function handleCopy(id: string) {
    navigator.clipboard.writeText(getPayUrl(id));
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  if (!merchant) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Payment Codes</h1>
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
        <h1 className="text-2xl font-bold">Payment Codes</h1>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" />
              New Code
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Payment Code</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {error && (
                <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label>Label</Label>
                <Input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. Coffee, Donation"
                />
              </div>
              <div className="space-y-2">
                <Label>Fixed Amount (optional)</Label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Leave empty for custom amount"
                />
              </div>
              <Button
                onClick={handleCreate}
                disabled={creating}
                className="w-full"
              >
                {creating && <Loader2 className="size-4 animate-spin" />}
                Create Payment Code
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* QR modal */}
      <Dialog open={!!showQR} onOpenChange={() => setShowQR(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Scan to Pay</DialogTitle>
          </DialogHeader>
          {showQR && (
            <div className="flex flex-col items-center gap-4">
              <QRCodeSVG value={getPayUrl(showQR)} size={200} />
              <p className="text-xs text-muted-foreground break-all text-center">
                {getPayUrl(showQR)}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : codes.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            No payment codes yet. Create one to start accepting payments.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {codes.map((code) => (
            <Card key={code.id} className="py-0">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <QrCode className="size-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">
                      {code.label || "Payment"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {code.amount
                        ? `${code.amount} ${code.token}`
                        : "Custom amount"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setShowQR(code.id)}
                    aria-label="Show QR code"
                  >
                    <QrCode className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleCopy(code.id)}
                    aria-label="Copy payment link"
                  >
                    {copied === code.id ? (
                      <Check className="size-4 text-emerald-500" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Delete payment code"
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete payment code?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete this payment code. Existing links will stop working.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(code.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
