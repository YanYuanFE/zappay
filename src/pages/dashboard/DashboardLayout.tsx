import { NavLink, Link, Outlet, Navigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  QrCode,
  FileText,
  TrendingUp,
  Settings,
  LogOut,
  Wallet,
  Copy,
  Check,
  ChevronDown,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useStarknetWallet } from "@/providers/StarknetWalletContext";
import { useState } from "react";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Overview", end: true },
  { to: "/dashboard/payment-codes", icon: QrCode, label: "Payment Codes" },
  { to: "/dashboard/invoices", icon: FileText, label: "Invoices" },
  { to: "/dashboard/staking", icon: TrendingUp, label: "Earn" },
  { to: "/dashboard/settings", icon: Settings, label: "Settings" },
];

function getPageTitle(pathname: string) {
  const match = navItems.find((item) =>
    item.end ? pathname === item.to : pathname.startsWith(item.to),
  );
  return match?.label ?? "Dashboard";
}

export default function DashboardLayout() {
  const { ready, authenticated, logout } = useAuth();
  const { starknetAddress } = useStarknetWallet();
  const location = useLocation();
  const [copied, setCopied] = useState(false);

  if (!ready) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!authenticated) {
    return <Navigate to="/" replace />;
  }

  const shortAddress = starknetAddress
    ? `${starknetAddress.slice(0, 6)}...${starknetAddress.slice(-4)}`
    : "Connecting...";

  const pageTitle = getPageTitle(location.pathname);

  function handleCopyAddress() {
    if (!starknetAddress) return;
    navigator.clipboard.writeText(starknetAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <Link to="/" className="flex items-center gap-2 px-2 py-2">
            <img src="/zappay-icon.png" alt="" className="size-7 rounded" />
            <span className="text-lg font-bold">ZapPay</span>
          </Link>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.to} end={item.end}>
                        <item.icon />
                        <span>{item.label}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center justify-between border-b px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink asChild>
                    <NavLink to="/dashboard">Dashboard</NavLink>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                {pageTitle !== "Overview" && (
                  <>
                    <BreadcrumbSeparator className="hidden md:block" />
                    <BreadcrumbItem>
                      <BreadcrumbPage>{pageTitle}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </>
                )}
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <Wallet className="size-4" />
                <span className="font-mono text-xs">{shortAddress}</span>
                <ChevronDown className="size-3.5 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <p className="text-xs text-muted-foreground">Wallet Address</p>
                <p className="font-mono text-xs mt-0.5 truncate">
                  {starknetAddress ?? "—"}
                </p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleCopyAddress}>
                {copied ? (
                  <Check className="size-4 text-emerald-500" />
                ) : (
                  <Copy className="size-4" />
                )}
                {copied ? "Copied!" : "Copy Address"}
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <NavLink to="/wallet">
                  <Wallet className="size-4" />
                  My Wallet
                </NavLink>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={logout}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="size-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
