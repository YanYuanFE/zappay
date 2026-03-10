import { useParams } from "react-router-dom";
import { useState } from "react";
import {
  Loader2,
  AlertCircle,
  CheckCircle,
  Zap,
  Copy,
  Check,
  Wallet,
  ChevronDown,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useStarknetWallet } from "@/providers/StarknetWalletContext";
import { useBalance } from "@/hooks/useBalance";
import {
  getInvoice,
  recordTransaction,
  markInvoicePaid,
  type Invoice,
  type Merchant,
} from "@/lib/db";
import { CONTRACTS } from "@/lib/starkzap";
import { uint256, CallData } from "starknet";

type InvoiceData = Invoice & { merchants: Merchant };

const STRK_ADDRESS =
  "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";

export default function InvoicePage() {
  const { id } = useParams();
  const { authenticated, login } = useAuth();
  const { wallet, starknetAddress } = useStarknetWallet();
  const { strk: balance, refetch: refetchBalance } = useBalance(starknetAddress);
  const queryClient = useQueryClient();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [payOpen, setPayOpen] = useState(false);

  const { data = null, isLoading: loading } = useQuery<InvoiceData | null>({
    queryKey: ["invoice", id],
    queryFn: () => getInvoice(id!),
    enabled: !!id,
  });

  async function handlePay() {
    if (!wallet || !starknetAddress || !data || data.status === "paid") return;

    setPaying(true);
    setError(null);

    try {
      await wallet.ensureReady();

      const amountRaw = BigInt(Math.round(data.total * 1e18));
      const amountU256 = uint256.bnToUint256(amountRaw);

      const refHex = "0x" + data.id.replace(/-/g, "");

      const calls = [
        {
          contractAddress: STRK_ADDRESS,
          entrypoint: "approve",
          calldata: CallData.compile({
            spender: CONTRACTS.paymentRouter,
            amount: amountU256,
          }),
        },
        {
          contractAddress: CONTRACTS.paymentRouter,
          entrypoint: "pay",
          calldata: CallData.compile({
            merchant: data.merchants.wallet_address,
            token: STRK_ADDRESS,
            amount: amountU256,
            reference_id: refHex,
          }),
        },
      ];

      const tx = await wallet.execute(calls);
      const hash = tx.hash;

      await recordTransaction({
        merchant_id: data.merchant_id,
        payer_address: starknetAddress,
        token: data.token,
        amount: data.total,
        tx_hash: hash,
        reference_type: "invoice",
        reference_id: data.id,
      });

      await markInvoicePaid(data.id, hash);
      queryClient.setQueryData<InvoiceData | null>(["invoice", id], (old) =>
        old ? { ...old, status: "paid", tx_hash: hash } : old,
      );
      refetchBalance();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setPaying(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="size-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">Invoice not found</p>
        </div>
      </div>
    );
  }

  const items = data.items as { name: string; qty: number; price: number }[];
  const isPaid = data.status === "paid";

  return (
    <div className="min-h-dvh bg-background flex justify-center p-4 py-8 sm:py-12">
      <div className="w-full max-w-2xl space-y-4">
        {/* Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold">{data.merchants.name}</h1>
                <p className="text-lg text-accent mt-1">Sent you an Invoice</p>
              </div>
              <div className="flex items-center gap-1.5 text-accent">
                <Zap className="size-6" />
                <span className="text-lg font-bold hidden sm:inline">ZapPay</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Amount + Mini Invoice Preview */}
        <Card>
          <CardContent className="p-6">
            <div className="flex gap-6">
              {/* Left: amount info */}
              <div className="flex-1 space-y-4">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Request Amount
                  </p>
                  <p className="text-4xl sm:text-5xl font-bold tabular-nums mt-1">
                    {data.total}
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5">{data.token}</p>
                </div>

                {data.due_date && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Due Date
                    </p>
                    <p className="text-base font-medium mt-0.5">
                      {new Date(data.due_date + "T00:00:00").toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "2-digit",
                      })}
                    </p>
                  </div>
                )}

                {data.client_name && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Bill To
                    </p>
                    <p className="text-base font-medium mt-0.5">{data.client_name}</p>
                  </div>
                )}
              </div>

              {/* Right: Mini invoice preview */}
              <div className="hidden sm:block w-48 shrink-0">
                <div className="rounded-lg border bg-white p-4 text-[10px] leading-tight shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <span className="font-black text-[11px]">INVOICE</span>
                    <div className="flex items-center gap-0.5 text-accent">
                      <Zap className="size-2.5" />
                      <span className="font-bold text-[8px]">{data.merchants.name}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div>
                      <p className="font-semibold text-muted-foreground text-[8px]">From</p>
                      <p className="font-bold truncate">{data.merchants.name}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-muted-foreground text-[8px]">To</p>
                      <p className="font-bold truncate">{data.client_name || "—"}</p>
                    </div>
                  </div>

                  <p className="font-semibold text-muted-foreground text-[8px] mb-1">Details</p>
                  <div className="space-y-0.5 mb-2">
                    {items.slice(0, 3).map((item, i) => (
                      <div key={i} className="flex justify-between">
                        <span className="truncate flex-1 text-muted-foreground">
                          {item.name}
                        </span>
                        <span className="tabular-nums ml-2">
                          {(item.qty * item.price).toFixed(2)}
                        </span>
                      </div>
                    ))}
                    {items.length > 3 && (
                      <p className="text-muted-foreground">
                        +{items.length - 3} more...
                      </p>
                    )}
                  </div>

                  <Separator className="my-1.5" />
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span className="tabular-nums text-accent">
                      {data.total} {data.token}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Paid state */}
        {isPaid && (
          <Card>
            <CardContent className="p-6 text-center">
              <div className="size-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="size-7 text-emerald-500" />
              </div>
              <p className="font-semibold text-emerald-700 mb-1">
                This invoice has been paid
              </p>
              {data.tx_hash && (
                <a
                  href={`https://voyager.online/tx/${data.tx_hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-accent hover:underline"
                >
                  View on Voyager
                </a>
              )}
            </CardContent>
          </Card>
        )}

        {/* Payment section */}
        {!isPaid && (
          <>
            <h2 className="text-base font-semibold pt-2">Paying Method</h2>

            {!authenticated ? (
              <Card
                className="cursor-pointer hover:border-accent/30 transition-colors"
                onClick={login}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-accent/10 flex items-center justify-center">
                      <Wallet className="size-5 text-accent" />
                    </div>
                    <span className="font-medium">Login to Pay</span>
                  </div>
                  <ChevronDown className="size-5 text-muted-foreground" />
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-0">
                  {/* Accordion header */}
                  <button
                    onClick={() => setPayOpen(!payOpen)}
                    className="w-full p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-accent/10 flex items-center justify-center">
                        <Wallet className="size-5 text-accent" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">Pay with Wallet</p>
                        {starknetAddress && (
                          <p className="text-xs text-muted-foreground font-mono">
                            {starknetAddress.slice(0, 6)}...{starknetAddress.slice(-4)}
                          </p>
                        )}
                      </div>
                    </div>
                    <ChevronDown
                      className={`size-5 text-muted-foreground transition-transform ${payOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  {/* Accordion content */}
                  {payOpen && (
                    <div className="px-4 pb-4 space-y-3">
                      <Separator />

                      {starknetAddress && (
                        <div className="flex items-center justify-between text-sm py-1">
                          <span className="text-muted-foreground">Balance</span>
                          <span className="font-medium tabular-nums">
                            {balance ?? "—"} STRK
                          </span>
                        </div>
                      )}

                      {error && (
                        <div className="rounded-lg bg-destructive/10 p-3">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm text-destructive max-h-32 overflow-auto break-all flex-1">
                              {error}
                            </p>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(error);
                                setCopied(true);
                                setTimeout(() => setCopied(false), 2000);
                              }}
                              className="shrink-0 p-1 rounded hover:bg-destructive/10"
                              aria-label="Copy error"
                            >
                              {copied ? (
                                <Check className="size-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="size-3.5 text-destructive" />
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      <Button
                        onClick={handlePay}
                        disabled={paying || !wallet}
                        className="w-full"
                        size="lg"
                      >
                        {paying ? (
                          <Loader2 className="size-5 animate-spin" />
                        ) : (
                          <CheckCircle className="size-5" />
                        )}
                        {paying ? "Processing..." : `Pay ${data.total} ${data.token}`}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Footer */}
        <p className="text-xs text-muted-foreground text-center pt-2">
          Zero gas fees &middot; powered by ZapPay
        </p>
      </div>
    </div>
  );
}
