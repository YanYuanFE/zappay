import { Link, Navigate } from "react-router-dom";
import { useState } from "react";
import {
  Zap,
  QrCode,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  TrendingUp,
  Loader2,
  Copy,
  Check,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { uint256, CallData } from "starknet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useBalance } from "@/hooks/useBalance";
import { useStarknetWallet } from "@/providers/StarknetWalletContext";
import { listTransactionsByPayer } from "@/lib/db";

const STRK_ADDRESS =
  "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";

export default function Wallet() {
  const { ready, authenticated } = useAuth();
  const { wallet, starknetAddress } = useStarknetWallet();
  const { strk, loading, refetch: refetchBalance } = useBalance(starknetAddress);
  const [sendOpen, setSendOpen] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [sendTo, setSendTo] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    if (!starknetAddress) return;
    navigator.clipboard.writeText(starknetAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSend() {
    if (!wallet || !sendTo || !sendAmount || parseFloat(sendAmount) <= 0) return;
    setSending(true);
    try {
      await wallet.ensureReady();
      const amountRaw = BigInt(Math.round(parseFloat(sendAmount) * 1e18));
      const amountU256 = uint256.bnToUint256(amountRaw);
      const tx = await wallet.execute([
        {
          contractAddress: STRK_ADDRESS,
          entrypoint: "transfer",
          calldata: CallData.compile({ recipient: sendTo, amount: amountU256 }),
        },
      ]);
      toast.success(`Sent ${sendAmount} STRK`, {
        description: `Tx: ${tx.hash.slice(0, 12)}...`,
        action: {
          label: "View on Voyager",
          onClick: () => window.open(`https://voyager.online/tx/${tx.hash}`, "_blank"),
        },
        duration: 10000,
      });
      setSendOpen(false);
      setSendTo("");
      setSendAmount("");
      refetchBalance();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Transfer failed");
    } finally {
      setSending(false);
    }
  }

  const { data: txns = [], isLoading: txLoading } = useQuery({
    queryKey: ["payerTransactions", starknetAddress],
    queryFn: () => listTransactionsByPayer(starknetAddress!),
    enabled: !!starknetAddress,
  });

  if (!ready) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!authenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-dvh bg-background">
      {/* Header */}
      <div className="bg-primary px-6 pt-6 pb-12">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <Zap className="size-6 text-accent" />
              <span className="text-lg font-bold text-primary-foreground">
                ZapPay
              </span>
            </div>
            <Link
              to="/dashboard"
              className="text-sm text-primary-foreground/70 hover:text-primary-foreground"
            >
              Merchant
            </Link>
          </div>

          <p className="text-sm text-primary-foreground/60 mb-1">
            Total Balance
          </p>
          {loading ? (
            <Loader2 className="size-6 animate-spin text-primary-foreground/60 mt-2" />
          ) : (
            <p className="text-3xl font-bold text-primary-foreground tabular-nums">
              {strk ?? "0.00"} STRK
            </p>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="max-w-lg mx-auto -mt-6 px-4">
        <div className="grid grid-cols-4 gap-3 mb-6">
          <button
            onClick={() => setSendOpen(true)}
            className="flex flex-col items-center gap-2 rounded-xl bg-card p-4 border hover:border-accent/30 transition-colors"
          >
            <ArrowUpRight className="size-5 text-accent" />
            <span className="text-xs font-medium">Send</span>
          </button>
          <button
            onClick={() => setReceiveOpen(true)}
            className="flex flex-col items-center gap-2 rounded-xl bg-card p-4 border hover:border-accent/30 transition-colors"
          >
            <ArrowDownLeft className="size-5 text-accent" />
            <span className="text-xs font-medium">Receive</span>
          </button>
          <Link
            to="/scan"
            className="flex flex-col items-center gap-2 rounded-xl bg-card p-4 border hover:border-accent/30 transition-colors"
          >
            <QrCode className="size-5 text-accent" />
            <span className="text-xs font-medium">Scan</span>
          </Link>
          <Link
            to="/dashboard/staking"
            className="flex flex-col items-center gap-2 rounded-xl bg-card p-4 border hover:border-accent/30 transition-colors"
          >
            <TrendingUp className="size-5 text-accent" />
            <span className="text-xs font-medium">Earn</span>
          </Link>
        </div>

        {/* Explore merchants */}
        <Link
          to="/explore"
          className="flex items-center gap-3 rounded-xl bg-card p-4 border mb-6 hover:border-accent/30 transition-colors"
        >
          <Search className="size-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Explore merchants...
          </span>
        </Link>

        {/* Transaction history */}
        <Card>
          <CardHeader className="border-b py-3">
            <CardTitle className="text-sm">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {txLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : txns.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-muted-foreground text-sm mb-3">
                  No activity yet. Pay a merchant to see your history.
                </p>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/explore">Explore Merchants</Link>
                </Button>
              </div>
            ) : (
              <div className="divide-y">
                {txns.slice(0, 15).map((tx) => (
                  <div
                    key={tx.id}
                    className="px-6 py-3 flex items-center justify-between"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {tx.merchants?.name ?? "Unknown merchant"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(tx.created_at).toLocaleString()}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-red-500 flex-shrink-0 ml-3 tabular-nums">
                      -{tx.amount} {tx.token}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Send Dialog */}
      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send STRK</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Recipient Address</Label>
              <Input
                value={sendTo}
                onChange={(e) => setSendTo(e.target.value)}
                placeholder="0x..."
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label>Amount (STRK)</Label>
              <Input
                type="number"
                value={sendAmount}
                onChange={(e) => setSendAmount(e.target.value)}
                placeholder="0.00"
              />
              {strk && (
                <p className="text-xs text-muted-foreground">
                  Balance: {strk} STRK
                </p>
              )}
            </div>
            <Button
              onClick={handleSend}
              disabled={sending || !sendTo || !sendAmount || parseFloat(sendAmount) <= 0}
              className="w-full"
            >
              {sending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ArrowUpRight className="size-4" />
              )}
              {sending ? "Sending..." : "Send"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Receive Dialog */}
      <Dialog open={receiveOpen} onOpenChange={setReceiveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Receive STRK</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4">
            {starknetAddress && (
              <>
                <div className="rounded-xl border p-4 bg-white">
                  <QRCodeSVG value={starknetAddress} size={200} />
                </div>
                <div className="w-full">
                  <p className="text-xs text-muted-foreground mb-1 text-center">
                    Your Wallet Address
                  </p>
                  <div className="flex items-center gap-2 rounded-lg border p-3">
                    <p className="font-mono text-xs break-all flex-1">
                      {starknetAddress}
                    </p>
                    <button
                      onClick={handleCopy}
                      className="shrink-0 p-1.5 rounded-md hover:bg-muted"
                    >
                      {copied ? (
                        <Check className="size-4 text-emerald-500" />
                      ) : (
                        <Copy className="size-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
