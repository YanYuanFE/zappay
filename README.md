<p align="center">
  <img src="public/zappay-logo.png" alt="ZapPay" width="360" />
</p>

<h1 align="center">ZapPay</h1>

<p align="center"><strong>Stripe for Starknet</strong> — Accept crypto payments with zero gas fees, no wallet required.</p>

ZapPay lets merchants create payment links, QR codes, and invoices on Starknet. Customers pay with social login (Google, email, etc.) — no browser extension needed. Gas fees are fully sponsored via AVNU Paymaster.

Built for the [StarkZap Developer Challenge](https://github.com/starkzap/awesome-starkzap).

## Features

- **Payment Codes & QR** — Generate shareable payment links with fixed or custom amounts
- **Invoice System** — Create professional invoices with line items and due dates, share via link
- **Zero Gas Fees** — All transactions are gas-sponsored through AVNU Paymaster
- **Social Login** — Privy-powered auth: Google, email, phone — auto-creates an embedded Starknet wallet
- **Merchant Dashboard** — Overview with balance, transactions, revenue chart, and staking rewards
- **Stake & Earn** — Stake idle STRK to 15+ validators (Karnot, Braavos, AVNU, etc.) directly from the dashboard
- **User Wallet** — Send/receive STRK, scan QR to pay, explore merchants
- **Merchant Storefront** — Public `/shop/:slug` page for each merchant

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite + TailwindCSS v4 + shadcn/ui |
| Backend | Hono (Node.js) |
| Database | PostgreSQL + Prisma v7 |
| Auth | Privy (social login + embedded Solana → Starknet wallet) |
| Blockchain | Starknet (via `starknet.js` + StarkZap SDK) |
| Gas Sponsorship | AVNU Paymaster |
| Deployment | Docker + Dokploy |

## Project Structure

```
starkpay/
├── src/                    # React frontend
│   ├── pages/
│   │   ├── Landing.tsx         # Home page
│   │   ├── dashboard/          # Merchant dashboard
│   │   │   ├── Overview.tsx        # Balance, txns, staking rewards
│   │   │   ├── PaymentCodes.tsx    # Create/manage payment codes
│   │   │   ├── Invoices.tsx        # Invoice list
│   │   │   ├── InvoiceEditor.tsx   # Create new invoice
│   │   │   ├── Staking.tsx         # Stake/unstake/claim STRK
│   │   │   └── Settings.tsx        # Merchant profile
│   │   ├── wallet/             # User wallet
│   │   │   ├── Wallet.tsx          # Balance, send, receive
│   │   │   ├── Explore.tsx         # Browse merchants
│   │   │   └── Scan.tsx            # QR scanner
│   │   ├── pay/PayPage.tsx     # Public payment page
│   │   ├── invoice/InvoicePage.tsx  # Public invoice page
│   │   └── shop/ShopPage.tsx   # Public merchant store
│   ├── providers/
│   │   └── StarknetWalletContext.tsx  # Wallet state + Privy signer
│   ├── hooks/                  # useAuth, useBalance, useMerchant
│   └── lib/                    # API client, StarkZap SDK init
├── server/                 # Hono backend
│   ├── src/
│   │   ├── index.ts            # Server entry
│   │   ├── routes/
│   │   │   ├── api.ts              # Merchant/payment CRUD
│   │   │   ├── wallet.ts           # Privy wallet create/sign
│   │   │   └── paymaster.ts        # AVNU paymaster proxy
│   │   ├── middleware/auth.ts  # Privy token verification
│   │   └── db.ts              # Prisma client
│   └── prisma/
│       └── schema.prisma       # 5 tables: UserWallet, Merchant, PaymentCode, Invoice, Transaction
├── docker-compose.yml      # Dokploy deployment
├── Dockerfile              # Frontend (multi-stage → nginx)
├── nginx.conf              # Nginx: SPA + /api proxy
└── server/Dockerfile       # Backend (multi-stage → node)
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm
- PostgreSQL database

### 1. Clone & Install

```bash
git clone <repo-url>
cd starkpay

# Frontend
pnpm install

# Backend
cd server
npm install
npx prisma generate
npx prisma db push
cd ..
```

### 2. Environment Variables

**Frontend** — `.env.local`:
```env
VITE_PRIVY_APP_ID=your_privy_app_id
VITE_PAYMENT_ROUTER_ADDRESS=0x038fa3b18c...
```

**Backend** — `server/.env`:
```env
DB_URL=postgresql://user:pass@host:5432/dbname
PRIVY_APP_ID=your_privy_app_id
PRIVY_APP_SECRET=your_privy_app_secret
AVNU_API_KEY=your_avnu_api_key
AVNU_PAYMASTER_URL=https://starknet.paymaster.avnu.fi
PORT=3000
```

### 3. Run Development

```bash
# Terminal 1: Backend
cd server
npm run dev

# Terminal 2: Frontend (Vite proxies /api → localhost:3000)
pnpm dev
```

Open http://localhost:5173

## Deployment (Dokploy)

```bash
docker compose build
docker compose up
```

Or via Dokploy dashboard:

1. Create app → Docker Compose → set path `./docker-compose.yml`
2. Add environment variables in Dokploy's Environment tab
3. Assign domain to `web` service (port 80)
4. Deploy

## How It Works

1. **Merchant signs up** via social login → Privy creates an embedded Starknet wallet
2. **Creates payment codes** with fixed or custom amounts → shareable link + QR
3. **Customer opens link** → signs in with Google/email → pays in STRK (zero gas)
4. **Transaction recorded** in DB + on-chain → merchant sees it in dashboard
5. **Merchant stakes** idle STRK for yield through StarkZap validators

## License

MIT
