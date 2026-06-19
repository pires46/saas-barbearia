export const SERVICE_CATEGORIES = {
  HAIRCUT: "Corte Masculino",
  BEARD: "Barba",
  HAIRCUT_BEARD: "Corte + Barba",
  EYEBROW: "Sobrancelha",
  PIGMENTATION: "Pigmentação",
  HYDRATION: "Hidratação",
  OTHER: "Outros",
} as const;

export const PRODUCT_CATEGORIES = {
  POMADE: "Pomada",
  SHAMPOO: "Shampoo",
  GEL: "Gel",
  RAZOR: "Navalhas",
  BLADE: "Lâminas",
  OTHER: "Outros",
} as const;

export const APPOINTMENT_STATUS = {
  SCHEDULED: "Agendado",
  CONFIRMED: "Confirmado",
  IN_PROGRESS: "Em atendimento",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
  NO_SHOW: "Não compareceu",
} as const;

export const PAYMENT_METHODS = {
  PIX: "Pix",
  CASH: "Dinheiro",
  DEBIT: "Débito",
  CREDIT: "Crédito",
  BOLETO: "Boleto",
} as const;

export const DAYS_OF_WEEK = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
] as const;

export const EXPENSE_CATEGORIES = [
  "Aluguel",
  "Água",
  "Energia",
  "Internet",
  "Salários",
  "Fornecedores",
  "Outros",
] as const;

export const INCOME_CATEGORIES = ["Serviços", "Venda de produtos", "Outros"] as const;
