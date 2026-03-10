import { Link } from "react-router-dom";
import {
  QrCode,
  Shield,
  TrendingUp,
  ArrowRight,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";

const features = [
  {
    icon: QrCode,
    title: "Payment Codes & QR",
    description:
      "Generate payment links and QR codes instantly. Fixed or custom amounts.",
  },
  {
    icon: Shield,
    title: "Zero Gas Fees",
    description:
      "Customers pay with social login, no wallet needed. Gas is sponsored.",
  },
  {
    icon: TrendingUp,
    title: "Stake & Earn",
    description:
      "Stake idle STRK for yield directly from your dashboard.",
  },
  {
    icon: CreditCard,
    title: "Invoice System",
    description:
      "Create professional invoices and send payment links to clients.",
  },
];

export default function Landing() {
  const { authenticated, login, logout } = useAuth();

  return (
    <div className="min-h-dvh bg-background">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <img src="/zappay-icon.png" alt="" className="size-8 rounded" />
          <span className="text-xl font-bold">ZapPay</span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/explore">Explore</Link>
          </Button>
          {authenticated ? (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/wallet">Wallet</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/dashboard">
                  Dashboard
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button variant="ghost" size="sm" onClick={logout}>
                Logout
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={login}>
              Login
            </Button>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 pt-20 pb-24 max-w-6xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-muted px-4 py-1.5 text-sm text-muted-foreground mb-6">
          <img src="/zappay-icon.png" alt="" className="size-4 rounded-sm" />
          Powered by Starknet
        </div>
        <h1 className="text-5xl md:text-6xl font-bold leading-tight max-w-3xl mx-auto text-balance">
          Crypto Payments
          <br />
          <span className="text-accent">Made Simple</span>
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto text-pretty">
          Accept crypto payments in minutes. No wallet required for your
          customers. Zero gas fees. Stake idle funds for yield.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Button size="lg" className="bg-accent hover:bg-accent/90 text-white" asChild>
            <Link to="/dashboard">
              Start Accepting Payments
              <ArrowRight className="size-5" />
            </Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link to="/explore">Explore Merchants</Link>
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20 bg-muted/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-balance">
            Everything you need to get paid
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f) => (
              <Card key={f.title}>
                <CardContent className="pt-6">
                  <div className="size-10 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                    <f.icon className="size-5 text-accent" />
                  </div>
                  <h3 className="font-semibold mb-2">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {f.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-20 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12 text-balance">
          How it works
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              step: "1",
              title: "Sign up with social login",
              desc: "Google, Twitter, or email. No crypto wallet needed.",
            },
            {
              step: "2",
              title: "Create a payment code",
              desc: "Set an amount or leave it open. Get a link and QR code.",
            },
            {
              step: "3",
              title: "Share and get paid",
              desc: "Customers scan, login, and pay. Zero gas fees for everyone.",
            },
          ].map((item) => (
            <div key={item.step} className="text-center">
              <div className="size-12 rounded-full bg-accent text-white text-xl font-bold flex items-center justify-center mx-auto mb-4">
                {item.step}
              </div>
              <h3 className="font-semibold mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <img src="/zappay-icon.png" alt="" className="size-4 rounded-sm" />
            <span>ZapPay</span>
          </div>
          <span>Built with Starkzap SDK on Starknet</span>
        </div>
      </footer>
    </div>
  );
}
