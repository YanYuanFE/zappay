import { useParams } from "react-router-dom";
import { useState } from "react";
import { Zap, CheckCircle, Loader2, AlertCircle, Copy, Check, Wallet } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useStarknetWallet } from "@/providers/StarknetWalletContext";
import { useBalance } from "@/hooks/useBalance";
import { getPaymentCode, recordTransaction, type PaymentCode, type Merchant } from "@/lib/db";
import { CONTRACTS } from "@/lib/starkzap";
import { uint256, CallData } from "starknet";

type PaymentData = PaymentCode & { merchants: Merchant };

// STRK token address (same on mainnet and sepolia)
const STRK_ADDRESS =
  "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";

export default function PayPage() {
  const { id } = useParams();
  const { authenticated, login } = useAuth();
  const { wallet, starknetAddress } = useStarknetWallet();
  const { strk: balance, refetch: refetchBalance } = useBalance(starknetAddress);
  const [customAmount, setCustomAmount] = useState("");
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data = null, isLoading: loading } = useQuery<PaymentData | null>({
    queryKey: ["paymentCode", id],
    queryFn: () => getPaymentCode(id!),
    enabled: !!id,
  });

  const payAmount = data?.amount ?? (customAmount ? parseFloat(customAmount) : 0);

  async function handlePay() {
    if (!wallet || !starknetAddress || !data || payAmount <= 0) return;

    setPaying(true);
    setError(null);

    try {
      // Ensure account is deployed before executing
      await wallet.ensureReady();

      // Convert amount to u256 (STRK has 18 decimals)
      const amountRaw = BigInt(Math.round(payAmount * 1e18));
      const amountU256 = uint256.bnToUint256(amountRaw);

      // Convert UUID to felt252 (hex number)
      const refHex = "0x" + data.id.replace(/-/g, "");

      // Build multicall: approve + pay
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
      setTxHash(hash);

      // Record in DB
      await recordTransaction({
        merchant_id: data.merchant_id,
        payer_address: starknetAddress,
        token: data.token,
        amount: payAmount,
        tx_hash: hash,
        reference_type: "payment_code",
        reference_id: data.id,
      });

      setPaid(true);
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
          <p className="text-muted-foreground">Payment code not found</p>
        </div>
      </div>
    );
  }

  if (paid) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <div className="size-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="size-8 text-emerald-500" />
            </div>
            <h1 className="text-xl font-bold mb-2">Payment Successful!</h1>
            <p className="text-sm text-muted-foreground mb-1">
              {payAmount} {data.token} sent to {data.merchants.name}
            </p>
            {txHash && (
              <a
                href={`https://voyager.online/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-accent hover:underline"
              >
                View on Voyager
              </a>
            )}
            <p className="mt-6 text-xs text-muted-foreground">
              Powered by ZapPay on Starknet
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="pt-8 pb-8">
          <div className="size-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
            <Zap className="size-8 text-accent" />
          </div>

          <h1 className="text-xl font-bold mb-1">{data.merchants.name}</h1>
          <p className="text-sm text-muted-foreground mb-6">
            {data.label || "Payment"}
          </p>

          {data.amount ? (
            <div className="mb-8">
              <p className="text-4xl font-bold tabular-nums">
                {data.amount} {data.token}
              </p>
            </div>
          ) : (
            <div className="mb-8 text-left">
              <Label>Amount ({data.token})</Label>
              <Input
                type="number"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="0.00"
                className="text-lg text-center mt-2"
              />
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-left">
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

          {!authenticated ? (
            <Button onClick={login} className="w-full" size="lg">
              Login to Pay
            </Button>
          ) : (
            <div className="space-y-3">
              {starknetAddress && (
                <div className="rounded-lg border p-3 text-left space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Wallet className="size-3.5" />
                    <span className="font-mono">
                      {starknetAddress.slice(0, 6)}...{starknetAddress.slice(-4)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Balance</span>
                    <span className="font-medium tabular-nums">
                      {balance ?? "—"} STRK
                    </span>
                  </div>
                </div>
              )}
              <Button
                onClick={handlePay}
                disabled={paying || payAmount <= 0 || !wallet}
                className="w-full"
                size="lg"
              >
                {paying ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <CheckCircle className="size-5" />
                )}
                {paying ? "Processing..." : "Confirm Payment"}
              </Button>
            </div>
          )}

          <p className="mt-6 text-xs text-muted-foreground">
            Zero gas fees &middot; powered by ZapPay
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
