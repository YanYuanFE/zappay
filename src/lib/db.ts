const API_PREFIX = "/api";

// Types
export interface Merchant {
  id: string;
  wallet_address: string;
  name: string;
  slug: string | null;
  avatar_url: string | null;
  description: string;
  created_at: string;
}

export interface PaymentCode {
  id: string;
  merchant_id: string;
  label: string;
  amount: number | null;
  token: string;
  is_active: boolean;
  created_at: string;
}

export interface Invoice {
  id: string;
  merchant_id: string;
  client_name: string;
  client_email: string;
  items: { name: string; qty: number; price: number }[];
  total: number;
  token: string;
  status: "draft" | "sent" | "paid";
  tx_hash: string | null;
  due_date: string | null;
  created_at: string;
}

export interface Transaction {
  id: string;
  merchant_id: string;
  payer_address: string;
  token: string;
  amount: number;
  tx_hash: string;
  reference_type: string;
  reference_id: string | null;
  created_at: string;
}

// ─── API helper ───

let _getAccessToken: (() => Promise<string | null>) | null = null;

/** Called once from StarknetWalletProvider to inject Privy's getAccessToken */
export function setAuthTokenProvider(fn: () => Promise<string | null>) {
  _getAccessToken = fn;
}

async function api<T>(action: string, params: Record<string, unknown> = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (_getAccessToken) {
    const token = await _getAccessToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const res = await fetch(`${API_PREFIX}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ action, ...params }),
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.error || `API error ${res.status}`);
  }

  return json;
}

// ─── Public operations ───

export async function getMerchantBySlug(slug: string) {
  const { data } = await api<{ data: Merchant | null }>("getMerchantBySlug", { slug });
  return data;
}

export async function getPaymentCode(id: string) {
  const { data } = await api<{ data: (PaymentCode & { merchants: Merchant }) | null }>(
    "getPaymentCode",
    { id },
  );
  return data;
}

export async function getInvoice(id: string) {
  const { data } = await api<{ data: (Invoice & { merchants: Merchant }) | null }>(
    "getInvoice",
    { id },
  );
  return data;
}

export async function listMerchants() {
  const { data } = await api<{ data: Merchant[] }>("listMerchants");
  return data;
}

// ─── Authenticated operations ───

export async function getMerchantByWallet(_walletAddress: string) {
  // walletAddress is resolved server-side from the Privy token
  const { data } = await api<{ data: Merchant | null }>("getMerchantByWallet");
  return data;
}

export async function upsertMerchant(merchant: {
  wallet_address: string;
  name: string;
  slug: string;
  description?: string;
}) {
  const { data } = await api<{ data: Merchant }>("upsertMerchant", { merchant });
  return data;
}

export async function listPaymentCodes(_merchantId: string) {
  // Server resolves merchant from token
  const { data } = await api<{ data: PaymentCode[] }>("listPaymentCodes");
  return data;
}

export async function createPaymentCode(code: {
  merchant_id: string;
  label: string;
  amount: number | null;
  token?: string;
}) {
  const { data } = await api<{ data: PaymentCode }>("createPaymentCode", code);
  return data;
}

export async function deletePaymentCode(id: string) {
  await api("deletePaymentCode", { id });
}

export async function listInvoices(_merchantId: string) {
  const { data } = await api<{ data: Invoice[] }>("listInvoices");
  return data;
}

export async function createInvoice(invoice: {
  merchant_id: string;
  client_name: string;
  client_email: string;
  items: { name: string; qty: number; price: number }[];
  total: number;
  due_date?: string;
}) {
  const { data } = await api<{ data: Invoice }>("createInvoice", invoice);
  return data;
}

export async function markInvoicePaid(id: string, txHash: string) {
  await api("markInvoicePaid", { id, tx_hash: txHash });
}

export async function recordTransaction(tx: {
  merchant_id: string;
  payer_address: string;
  token: string;
  amount: number;
  tx_hash: string;
  reference_type: string;
  reference_id?: string;
}) {
  const { data } = await api<{ data: Transaction }>("recordTransaction", tx);
  return data;
}

export async function listTransactions(_merchantId: string, limit = 20) {
  const { data } = await api<{ data: Transaction[] }>("listTransactions", { limit });
  return data;
}

export async function listTransactionsByPayer(_payerAddress: string, limit = 20) {
  const { data } = await api<{ data: (Transaction & { merchants: Merchant })[] }>(
    "listTransactionsByPayer",
    { limit },
  );
  return data;
}
