import { Hono } from "hono";
import { prisma } from "../db.js";
import { verifyToken } from "../middleware/auth.js";

const api = new Hono();

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function err(message: string, status = 400) {
  return json({ error: message }, status);
}

async function getWalletAddress(userId: string): Promise<string | null> {
  const row = await prisma.userWallet.findUnique({
    where: { privy_user_id: userId },
    select: { address: true },
  });
  return row?.address ?? null;
}

api.post("/", async (c) => {
  const body = await c.req.json();
  const { action, ...params } = body;

  // ─── Public routes ───
  switch (action) {
    case "getMerchantBySlug": {
      const data = await prisma.merchant.findUnique({
        where: { slug: params.slug },
      });
      return json({ data });
    }

    case "getPaymentCode": {
      const data = await prisma.paymentCode.findUnique({
        where: { id: params.id },
        include: { merchant: true },
      });
      // Remap: frontend expects { ...code, merchants: merchant }
      if (data) {
        const { merchant, ...code } = data;
        return json({ data: { ...code, merchants: merchant } });
      }
      return json({ data: null });
    }

    case "getInvoice": {
      const data = await prisma.invoice.findUnique({
        where: { id: params.id },
        include: { merchant: true },
      });
      if (data) {
        const { merchant, ...invoice } = data;
        return json({ data: { ...invoice, merchants: merchant } });
      }
      return json({ data: null });
    }

    case "listMerchants": {
      const data = await prisma.merchant.findMany({
        where: { slug: { not: null } },
        orderBy: { created_at: "desc" },
      });
      return json({ data });
    }
  }

  // ─── Authenticated routes ───
  const userId = await verifyToken(c.req.header("authorization"));
  if (!userId) return err("Unauthorized", 401);

  const walletAddress = await getWalletAddress(userId);
  if (!walletAddress) return err("Wallet not found", 404);

  switch (action) {
    // ── Merchant ──
    case "getMerchantByWallet": {
      const data = await prisma.merchant.findUnique({
        where: { wallet_address: walletAddress },
      });
      return json({ data });
    }

    case "upsertMerchant": {
      const data = await prisma.merchant.upsert({
        where: { wallet_address: walletAddress },
        update: {
          name: params.merchant.name,
          slug: params.merchant.slug,
          description: params.merchant.description ?? "",
        },
        create: {
          wallet_address: walletAddress,
          name: params.merchant.name,
          slug: params.merchant.slug,
          description: params.merchant.description ?? "",
        },
      });
      return json({ data });
    }

    // ── Payment Codes ──
    case "listPaymentCodes": {
      const merchant = await prisma.merchant.findUnique({
        where: { wallet_address: walletAddress },
        select: { id: true },
      });
      if (!merchant) return err("Merchant not found", 404);

      const data = await prisma.paymentCode.findMany({
        where: { merchant_id: merchant.id },
        orderBy: { created_at: "desc" },
      });
      return json({ data });
    }

    case "createPaymentCode": {
      const merchant = await prisma.merchant.findUnique({
        where: { wallet_address: walletAddress },
        select: { id: true },
      });
      if (!merchant || merchant.id !== params.merchant_id) {
        return err("Forbidden", 403);
      }

      const data = await prisma.paymentCode.create({
        data: {
          merchant_id: params.merchant_id,
          label: params.label,
          amount: params.amount,
          token: params.token || "STRK",
        },
      });
      return json({ data });
    }

    case "deletePaymentCode": {
      const code = await prisma.paymentCode.findUnique({
        where: { id: params.id },
        select: { merchant_id: true },
      });
      if (!code) return err("Not found", 404);

      const merchant = await prisma.merchant.findUnique({
        where: { wallet_address: walletAddress, id: code.merchant_id },
        select: { id: true },
      });
      if (!merchant) return err("Forbidden", 403);

      await prisma.paymentCode.delete({ where: { id: params.id } });
      return json({ success: true });
    }

    // ── Invoices ──
    case "listInvoices": {
      const merchant = await prisma.merchant.findUnique({
        where: { wallet_address: walletAddress },
        select: { id: true },
      });
      if (!merchant) return err("Merchant not found", 404);

      const data = await prisma.invoice.findMany({
        where: { merchant_id: merchant.id },
        orderBy: { created_at: "desc" },
      });
      return json({ data });
    }

    case "createInvoice": {
      const merchant = await prisma.merchant.findUnique({
        where: { wallet_address: walletAddress },
        select: { id: true },
      });
      if (!merchant || merchant.id !== params.merchant_id) {
        return err("Forbidden", 403);
      }

      const data = await prisma.invoice.create({
        data: {
          merchant_id: params.merchant_id,
          client_name: params.client_name,
          client_email: params.client_email,
          items: params.items,
          total: params.total,
          due_date: params.due_date || null,
          status: "sent",
        },
      });
      return json({ data });
    }

    case "markInvoicePaid": {
      await prisma.invoice.update({
        where: { id: params.id },
        data: { status: "paid", tx_hash: params.tx_hash },
      });
      return json({ success: true });
    }

    // ── Transactions ──
    case "recordTransaction": {
      const data = await prisma.transaction.create({
        data: {
          merchant_id: params.merchant_id,
          payer_address: params.payer_address,
          token: params.token,
          amount: params.amount,
          tx_hash: params.tx_hash,
          reference_type: params.reference_type,
          reference_id: params.reference_id || null,
        },
      });
      return json({ data });
    }

    case "listTransactions": {
      const merchant = await prisma.merchant.findUnique({
        where: { wallet_address: walletAddress },
        select: { id: true },
      });
      if (!merchant) return err("Merchant not found", 404);

      const data = await prisma.transaction.findMany({
        where: { merchant_id: merchant.id },
        orderBy: { created_at: "desc" },
        take: params.limit || 20,
      });
      return json({ data });
    }

    case "listTransactionsByPayer": {
      const data = await prisma.transaction.findMany({
        where: { payer_address: walletAddress },
        include: { merchant: true },
        orderBy: { created_at: "desc" },
        take: params.limit || 20,
      });
      // Remap: frontend expects { ...tx, merchants: merchant }
      const mapped = data.map(({ merchant, ...tx }) => ({
        ...tx,
        merchants: merchant,
      }));
      return json({ data: mapped });
    }

    default:
      return err(`Unknown action: ${action}`, 400);
  }
});

export default api;
