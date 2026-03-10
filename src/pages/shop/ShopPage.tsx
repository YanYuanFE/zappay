import { useParams } from "react-router-dom";
import { useState } from "react";
import { Zap, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useStarknetWallet } from "@/providers/StarknetWalletContext";
import { getMerchantBySlug, recordTransaction, type Merchant } from "@/lib/db";

export default function ShopPage() {
  const { slug } = useParams();
  const { authenticated, login } = useAuth();
  const { starknetAddress } = useStarknetWallet();
  const { data: merchant = null, isLoading: loading } = useQuery<Merchant | null>({
    queryKey: ["merchantBySlug", slug],
    queryFn: () => getMerchantBySlug(slug!),
    enabled: !!slug,
  });
  const [amount, setAmount] = useState("");
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePay() {
    if (!starknetAddress || !merchant || !amount || parseFloat(amount) <= 0)
      return;

    setPaying(true);
    setError(null);

    try {
      const txHash = `0x${Date.now().toString(16)}`;

      await recordTransaction({
        merchant_id: merchant.id,
        payer_address: starknetAddress,
        token: "STRK",
        amount: parseFloat(amount),
        tx_hash: txHash,
        reference_type: "shop",
        reference_id: merchant.slug ?? undefined,
      });

      setPaid(true);
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

  if (!merchant) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="size-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">Merchant not found</p>
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
            <p className="text-sm text-muted-foreground">
              {amount} STRK sent to {merchant.name}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="pt-8 pb-8 space-y-6">
          <div className="size-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto">
            {merchant.avatar_url ? (
              <img
                src={merchant.avatar_url}
                alt={merchant.name}
                className="size-16 rounded-full object-cover"
              />
            ) : (
              <Zap className="size-8 text-accent" />
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold mb-1">{merchant.name}</h1>
            {merchant.description && (
              <p className="text-sm text-muted-foreground">
                {merchant.description}
              </p>
            )}
          </div>

          <div className="text-left">
            <Label>Amount (STRK)</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="text-lg text-center mt-2"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {!authenticated ? (
            <Button onClick={login} className="w-full" size="lg">
              Login to Pay
            </Button>
          ) : (
            <Button
              onClick={handlePay}
              disabled={paying || !amount || parseFloat(amount) <= 0}
              className="w-full"
              size="lg"
            >
              {paying ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <CheckCircle className="size-5" />
              )}
              {paying ? "Processing..." : "Pay Now"}
            </Button>
          )}

          <p className="text-xs text-muted-foreground">
            Zero gas fees &middot; powered by ZapPay
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
