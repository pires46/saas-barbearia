const ASAAS_API_KEY = process.env.ASAAS_API_KEY || "";
const ASAAS_BASE =
  process.env.ASAAS_SANDBOX === "true"
    ? "https://sandbox.asaas.com/api/v3"
    : "https://api.asaas.com/api/v3";

export function isAsaasConfigured() {
  return Boolean(ASAAS_API_KEY);
}

async function asaasFetch(path: string, options: RequestInit = {}) {
  if (!ASAAS_API_KEY) throw new Error("Asaas não configurado");

  const res = await fetch(`${ASAAS_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      access_token: ASAAS_API_KEY,
      ...(options.headers as Record<string, string>),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.errors?.[0]?.description || data.message || `Asaas error ${res.status}`);
  }
  return data;
}

export async function createAsaasCustomer(data: {
  name: string;
  email: string;
  cpfCnpj?: string;
  phone?: string;
  externalReference?: string;
}) {
  return asaasFetch("/customers", {
    method: "POST",
    body: JSON.stringify({
      name: data.name,
      email: data.email,
      cpfCnpj: data.cpfCnpj?.replace(/\D/g, "") || undefined,
      phone: data.phone?.replace(/\D/g, "") || undefined,
      externalReference: data.externalReference,
    }),
  });
}

export async function createAsaasPayment(data: {
  customerId: string;
  value: number;
  dueDate: string;
  description: string;
  externalReference?: string;
}) {
  return asaasFetch("/payments", {
    method: "POST",
    body: JSON.stringify({
      customer: data.customerId,
      billingType: "UNDEFINED",
      value: data.value,
      dueDate: data.dueDate,
      description: data.description,
      externalReference: data.externalReference,
    }),
  });
}

export async function createAsaasSubscription(data: {
  customerId: string;
  value: number;
  nextDueDate: string;
  cycle: "MONTHLY";
  description: string;
  externalReference?: string;
}) {
  return asaasFetch("/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      customer: data.customerId,
      billingType: "UNDEFINED",
      value: data.value,
      nextDueDate: data.nextDueDate,
      cycle: data.cycle,
      description: data.description,
      externalReference: data.externalReference,
    }),
  });
}

export function getPaymentCheckoutUrl(invoiceUrl?: string) {
  return invoiceUrl || null;
}
