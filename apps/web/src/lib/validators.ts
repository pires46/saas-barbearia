import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

export const registerTenantSchema = z.object({
  name: z.string().min(2, "Nome muito curto"),
  slug: z.string().min(3).regex(/^[a-z0-9-]+$/, "Slug inválido"),
  email: z.string().email(),
  phone: z.string().optional(),
  planId: z.string().min(1),
  adminName: z.string().optional(),
  adminPassword: z.string().min(6),
  consentLgpd: z.literal(true, { errorMap: () => ({ message: "Aceite os termos e privacidade" }) }),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(6),
});

export const publicBookingSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(10),
  email: z.string().email().optional().or(z.literal("")),
  serviceId: z.string().min(1),
  employeeId: z.string().min(1),
  date: z.string().min(1),
  time: z.string().min(1),
  consentLgpd: z.literal(true, { errorMap: () => ({ message: "Aceite a política de privacidade" }) }),
});

export const reviewSchema = z.object({
  appointmentId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});

export const checkinSchema = z.object({
  qrCode: z.string().min(1),
});

export function parseBody<T>(schema: z.ZodSchema<T>, body: unknown):
  | { success: true; data: T }
  | { success: false; error: string } {
  const result = schema.safeParse(body);
  if (!result.success) {
    const msg = result.error.errors.map((e) => e.message).join(", ");
    return { success: false, error: msg };
  }
  return { success: true, data: result.data };
}
