import { z } from "zod";
import { ORDER_STATUSES, ROLES } from "./types";
import { PIECES, SIZES, COLORS } from "./catalog";
import { PAYMENT_METHODS, RECEIPT_MAX_CHARS, pickupIssues } from "./pickup";
import {
  isSafePieceImage,
  isSafeImageDataUrl,
  isSafeReceiptDataUrl,
} from "./media";

export const customerSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome").max(160),
  phone: z.string().trim().max(40).default(""),
  email: z.string().trim().max(160).default(""),
  document: z.string().trim().max(40).default(""),
  cep: z.string().trim().max(12).default(""),
  street: z.string().trim().max(160).default(""),
  number: z.string().trim().max(20).default(""),
  neighborhood: z.string().trim().max(80).default(""),
  city: z.string().trim().max(80).default(""),
  state: z.string().trim().max(2).default(""),
  notes: z.string().trim().max(500).default(""),
});

export const customerUpdateSchema = customerSchema.extend({
  id: z.number().int().positive(),
});

export const orderItemSchema = z
  .object({
    piece: z.string().trim().min(2).max(80),
    size: z.string().trim().min(1).max(8),
    color: z.string().trim().min(2).max(40),
    materialId: z.number().int().positive("Selecione o material"),
    quantity: z.number().int().min(1).max(9999),
    printName: z.string().trim().min(2, "Escolha a estampa").max(80),
    technique: z.string().trim().min(1).max(40),
    printPlace: z.string().trim().max(40).default(""),
    personalization: z.string().trim().max(400).default(""),
    artworkName: z.string().trim().max(160).optional(),
    artworkMime: z.string().trim().max(80).optional(),
    artworkData: z.string().max(RECEIPT_MAX_CHARS).optional(),
  })
  .superRefine((value, ctx) => {
    const art = value.artworkData ?? "";
    if (!art) return;
    if (!isSafeImageDataUrl(art)) {
      ctx.addIssue({
        code: "custom",
        message: "A arte precisa ser JPG, PNG ou WebP.",
      });
    }
  });

export const orderSchema = z
  .object({
    customerId: z.number().int().positive("Selecione o cliente"),
    dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe o prazo"),
    notes: z.string().trim().max(500).default(""),
    items: z.array(orderItemSchema).min(1, "Inclua ao menos uma peça.").max(80),
  })
  .superRefine((value, ctx) => {
    const total = value.items.reduce((n, i) => n + i.quantity, 0);
    if (total > 20_000) {
      ctx.addIssue({ code: "custom", message: "Quantidade acima do limite." });
    }
    const art = value.items.reduce((n, i) => n + (i.artworkData?.length ?? 0), 0);
    if (art > RECEIPT_MAX_CHARS) {
      ctx.addIssue({
        code: "custom",
        message: "As artes juntas passam do tamanho permitido. Envie arquivos menores.",
      });
    }
  });


export const statusChangeSchema = z
  .object({
    orderId: z.number().int().positive(),
    to: z.enum(ORDER_STATUSES),
    pickupName: z.string().trim().max(80).optional(),
    paymentMethod: z.enum(PAYMENT_METHODS).optional(),
    receiptName: z.string().trim().max(160).optional(),
    receiptMime: z.string().trim().max(80).optional(),
    receiptData: z.string().max(RECEIPT_MAX_CHARS).optional(),
  })
  .superRefine((value, ctx) => {
    for (const message of pickupIssues(value)) {
      ctx.addIssue({ code: "custom", message });
    }
    const receipt = value.receiptData ?? "";
    if (receipt && !isSafeReceiptDataUrl(receipt)) {
      ctx.addIssue({
        code: "custom",
        message: "O comprovante precisa ser JPG, PNG, WebP ou PDF.",
      });
    }
  });

export const inviteSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email("E-mail inválido").max(160),
  role: z.enum(ROLES),
});

export const staffActiveSchema = z.object({
  id: z.number().int().positive(),
  active: z.boolean(),
});

export const activateEmailSchema = z.object({
  email: z.string().trim().email("E-mail inválido").max(160),
});

export const materialUpdateSchema = z.object({
  id: z.number().int().positive(),
  quantity: z.number().min(0).max(1_000_000),
  minQuantity: z.number().min(0).max(1_000_000),
  qtyPerPiece: z.number().min(0).max(1000).optional(),
  name: z.string().trim().min(2).max(80).optional(),
  unit: z.string().trim().min(1).max(8).optional(),
  active: z.boolean().optional(),
});

export const materialCreateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  unit: z.string().trim().min(1).max(8),
  quantity: z.number().min(0).max(1_000_000),
  minQuantity: z.number().min(0).max(1_000_000),
  qtyPerPiece: z.number().min(0).max(1000),
});

export const orderIdSchema = z.object({
  orderId: z.number().int().positive(),
});

export const orderArtworkSchema = z.object({
  orderId: z.number().int().positive(),
  itemId: z.number().int().positive().optional(),
});

export const cepSchema = z.string().trim().min(8).max(12);

export const catalogPieceSchema = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().trim().min(2).max(80),
  category: z.enum(["corporativo", "escolar", "operacional", "esportivo", "evento"]),
  image: z
    .string()
    .trim()
    .max(RECEIPT_MAX_CHARS)
    .refine(isSafePieceImage, "A foto precisa ser JPG, PNG ou WebP")
    .default("/uniforms/uni_01.jpg"),
  sizeSet: z.enum(["adulto", "infantil", "ambos"]),
  colors: z.array(z.string().trim().min(1).max(40)).min(1).max(20),
  materials: z.array(z.string().trim().min(1).max(80)).min(1).max(12),
  techniques: z.array(z.string().trim().min(1).max(40)).min(1).max(8),
  active: z.boolean().default(true),
});

export const catalogPrintSchema = z.object({
  id: z.string().trim().max(80).optional(),
  name: z.string().trim().min(2).max(80),
  hint: z.string().trim().max(240).default(""),
  technique: z.string().trim().min(1).max(40),
  place: z.string().trim().min(1).max(40),
  needsText: z.boolean(),
  textLabel: z.string().trim().max(80).default(""),
  textPlaceholder: z.string().trim().max(120).default(""),
  categories: z.union([
    z.literal("todas"),
    z.array(z.enum(["corporativo", "escolar", "operacional", "esportivo", "evento"])).min(1),
  ]),
  active: z.boolean().default(true),
});

export const catalog = {
  pieces: PIECES,
  sizes: SIZES,
  colors: COLORS,
};
