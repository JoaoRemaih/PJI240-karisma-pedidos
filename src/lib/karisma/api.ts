import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql, type Sql } from "@/lib/db";
import type { AppPage } from "./roles";
import { canAccessAny } from "./roles";
import {
  canSeeStockDetails,
  deactivationError,
  decideActivation,
  redactOrderForRole,
} from "./access";
import { todayISO } from "./format";
import {
  canTransition,
  shouldDeductStock,
  shouldRestock,
} from "./status";
import { fetchCepAddress, isValidCep } from "./cep";
import { validateOrderSpec } from "./catalog";
import {
  buildOutlook,
  calendarMonth,
  type DemandLine,
} from "./demand";
import {
  activateEmailSchema,
  cepSchema,
  customerSchema,
  customerUpdateSchema,
  inviteSchema,
  materialCreateSchema,
  materialUpdateSchema,
  orderSchema,
  orderIdSchema,
  catalogPieceSchema,
  catalogPrintSchema,
  staffActiveSchema,
  statusChangeSchema,
  orderArtworkSchema,
} from "./schemas";
import type {
  Customer,
  DashboardStats,
  Material,
  Order,
  OrderEvent,
  OrderItem,
  OrderStatus,
  ReportData,
  Role,
  Staff,
} from "./types";
import { groupStockNeeds, totalPieces } from "./order-items";

export class ForbiddenError extends Error {
  readonly status = 403;
  constructor(message = "Acesso restrito à equipe da loja.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

type AuthUserRow = { id: string; email: string | null; name: string | null };
type StaffRow = {
  id: number;
  user_id: string | null;
  email: string;
  name: string;
  role: Role;
  active: boolean;
};

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function iso(v: unknown): string {
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "string") return v;
  return "";
}

function day(v: unknown): string {
  if (typeof v === "string") return v.slice(0, 10);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return "";
}

function mapStaff(row: StaffRow): Staff {
  return {
    id: num(row.id),
    userId: row.user_id,
    email: row.email,
    name: row.name,
    role: row.role,
    active: Boolean(row.active),
  };
}

async function authUser(sql: Sql, userId: string): Promise<AuthUserRow> {
  const rows = await sql<AuthUserRow>`
    select id, email, name from "user" where id = ${userId}
  `;
  const user = rows[0];
  if (!user) {
    return { id: userId, email: null, name: "Equipe" };
  }
  return user;
}

async function ensureStaff(
  sql: Sql,
  userId: string,
): Promise<{ status: "ok" | "pending"; staff: Staff | null }> {
  const byUser = await sql<StaffRow>`
    select id, user_id, email, name, role, active from staff where user_id = ${userId} limit 1
  `;
  if (byUser[0]) {
    if (!byUser[0].active) return { status: "pending", staff: null };
    return { status: "ok", staff: mapStaff(byUser[0]) };
  }

  const user = await authUser(sql, userId);
  const email = (user.email ?? "").trim().toLowerCase();

  if (email) {
    const byEmail = await sql<StaffRow>`
      select id, user_id, email, name, role, active from staff
      where lower(email) = ${email} limit 1
    `;
    if (byEmail[0] && byEmail[0].active) {
      await sql`
        update staff set user_id = ${userId} where id = ${byEmail[0].id} and user_id is null
      `;
      return {
        status: "ok",
        staff: mapStaff({ ...byEmail[0], user_id: userId }),
      };
    }
  }

  const count = await sql<{ n: number }>`select count(*)::int as n from staff`;
  if ((count[0]?.n ?? 0) === 0) {
    const name = (user.name ?? "").trim() || "Administração";
    const staffEmail = email || `admin-${userId.slice(0, 8)}@karisma.local`;
    const inserted = await sql<StaffRow>`
      insert into staff (user_id, email, name, role, active)
      select ${userId}, ${staffEmail}, ${name}, 'admin', true
      where not exists (select 1 from staff)
      returning id, user_id, email, name, role, active
    `;
    if (inserted[0]) return { status: "ok", staff: mapStaff(inserted[0]) };
  }

  return { status: "pending", staff: null };
}

async function requireStaff(
  sql: Sql,
  userId: string,
  page?: AppPage | AppPage[],
): Promise<Staff> {
  const result = await ensureStaff(sql, userId);
  if (result.status !== "ok" || !result.staff) {
    throw new ForbiddenError(
      "Seu acesso ainda não foi liberado. Peça à administração para cadastrar seu e-mail em Equipe.",
    );
  }
  if (page) {
    const pages = Array.isArray(page) ? page : [page];
    if (!canAccessAny(result.staff.role, pages)) {
      throw new ForbiddenError("Seu perfil não acessa esta área.");
    }
  }
  return result.staff;
}

type OrderRow = {
  id: number;
  customer_id: number;
  customer_name: string;
  customer_phone: string;
  piece: string;
  size: string;
  color: string;
  material_id: number;
  material_name: string;
  material_unit: string;
  quantity: number;
  personalization: string;
  print_name: string;
  technique: string;
  print_place: string;
  due_date: string;
  notes: string;
  status: OrderStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
  stock_deducted: boolean;
  pickup_name: string;
  payment_method: string;
  pickup_at: string | null;
  receipt_name: string;
  has_receipt: boolean;
  artwork_name: string;
};

type ItemRow = {
  id: number;
  order_id: number;
  piece: string;
  size: string;
  color: string;
  material_id: number;
  material_name: string;
  material_unit: string;
  quantity: number;
  personalization: string;
  print_name: string;
  technique: string;
  print_place: string;
  artwork_name: string;
  has_artwork: boolean;
};

function mapItem(row: ItemRow): OrderItem {
  return {
    id: num(row.id),
    piece: row.piece,
    size: row.size,
    color: row.color,
    materialId: num(row.material_id),
    materialName: row.material_name,
    materialUnit: row.material_unit,
    quantity: num(row.quantity),
    personalization: row.personalization ?? "",
    printName: row.print_name ?? "",
    technique: row.technique ?? "",
    printPlace: row.print_place ?? "",
    artworkName: row.artwork_name ?? "",
    hasArtwork: Boolean(row.has_artwork),
  };
}

function syntheticItem(row: OrderRow): OrderItem {
  return {
    id: 0,
    piece: row.piece,
    size: row.size,
    color: row.color,
    materialId: num(row.material_id),
    materialName: row.material_name,
    materialUnit: row.material_unit,
    quantity: num(row.quantity),
    personalization: row.personalization ?? "",
    printName: row.print_name ?? "",
    technique: row.technique ?? "",
    printPlace: row.print_place ?? "",
    artworkName: row.artwork_name ?? "",
    hasArtwork: Boolean(row.artwork_name),
  };
}

function mapOrder(row: OrderRow, items: OrderItem[] = []): Order {
  const dueDate = day(row.due_date);
  const today = todayISO();
  const open = row.status !== "retirado";
  const list = items.length ? items : [syntheticItem(row)];
  const first = list[0]!;
  return {
    id: num(row.id),
    customerId: num(row.customer_id),
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    piece: first.piece,
    size: first.size,
    color: first.color,
    materialId: first.materialId,
    materialName: first.materialName,
    materialUnit: first.materialUnit,
    quantity: totalPieces(list),
    personalization: first.personalization,
    printName: first.printName,
    technique: first.technique,
    printPlace: first.printPlace,
    dueDate,
    notes: row.notes ?? "",
    status: row.status,
    createdBy: row.created_by,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    stockDeducted: Boolean(row.stock_deducted),
    overdue: open && dueDate < today,
    pickupName: row.pickup_name ?? "",
    paymentMethod: row.payment_method ?? "",
    pickupAt: row.pickup_at ? iso(row.pickup_at) : "",
    receiptName: row.receipt_name ?? "",
    hasReceipt: Boolean(row.receipt_name),
    artworkName: list.find((i) => i.hasArtwork)?.artworkName ?? first.artworkName,
    hasArtwork: list.some((i) => i.hasArtwork),
    items: list,
  };
}

const ORDER_SELECT = `
  select o.id, o.customer_id, c.name as customer_name, c.phone as customer_phone,
         o.piece, o.size, o.color, o.material_id, m.name as material_name, m.unit as material_unit,
         o.quantity, o.personalization, o.print_name, o.technique, o.print_place,
         o.due_date, o.notes, o.status,
         o.created_by, o.created_at, o.updated_at, o.stock_deducted,
         o.pickup_name, o.payment_method, o.pickup_at, o.receipt_name,
         (coalesce(o.receipt_name, '') <> '') as has_receipt,
         o.artwork_name
  from orders o
  join customers c on c.id = o.customer_id
  join materials m on m.id = o.material_id
`;

const ITEM_SELECT = `
  select i.id, i.order_id, i.piece, i.size, i.color, i.material_id,
         m.name as material_name, m.unit as material_unit,
         i.quantity, i.personalization, i.print_name, i.technique, i.print_place,
         i.artwork_name,
         (coalesce(i.artwork_name, '') <> '') as has_artwork
  from order_items i
  join materials m on m.id = i.material_id
`;

async function loadItemsByOrder(
  sql: Sql,
  orderIds: number[],
): Promise<Map<number, OrderItem[]>> {
  const map = new Map<number, OrderItem[]>();
  if (orderIds.length === 0) return map;
  const placeholders = orderIds.map((_, i) => `$${i + 1}`).join(", ");
  const rows = await sql.query<ItemRow>(
    `${ITEM_SELECT} where i.order_id in (${placeholders}) order by i.order_id, i.sort_order, i.id`,
    orderIds,
  );
  for (const row of rows) {
    const id = num(row.order_id);
    const list = map.get(id) ?? [];
    list.push(mapItem(row));
    map.set(id, list);
  }
  return map;
}

async function mapOrders(sql: Sql, rows: OrderRow[]): Promise<Order[]> {
  const items = await loadItemsByOrder(
    sql,
    rows.map((r) => num(r.id)),
  );
  return rows.map((row) => mapOrder(row, items.get(num(row.id)) ?? []));
}

function mapCustomer(row: Record<string, unknown>): Customer {
  return {
    id: num(row.id),
    name: String(row.name ?? ""),
    phone: String(row.phone ?? ""),
    email: String(row.email ?? ""),
    document: String(row.document ?? ""),
    cep: String(row.cep ?? ""),
    street: String(row.street ?? ""),
    number: String(row.number ?? ""),
    neighborhood: String(row.neighborhood ?? ""),
    city: String(row.city ?? ""),
    state: String(row.state ?? ""),
    notes: String(row.notes ?? ""),
    createdBy: String(row.created_by ?? ""),
    createdAt: iso(row.created_at),
  };
}

function mapMaterial(row: Record<string, unknown>): Material {
  const quantity = num(row.quantity);
  const minQuantity = num(row.min_quantity);
  return {
    id: num(row.id),
    name: String(row.name ?? ""),
    unit: String(row.unit ?? ""),
    quantity,
    minQuantity,
    qtyPerPiece: num(row.qty_per_piece),
    active: Boolean(row.active),
    belowMin: quantity < minQuantity,
  };
}

export const getAuthGate = createServerFn({ method: "GET" }).handler(
  async () => {
    const sql = await getSql();
    const rows = await sql<{ n: number }>`select count(*)::int as n from staff`;
    return { hasStaff: num(rows[0]?.n) > 0 };
  },
);

export const canActivateAccess = createServerFn({ method: "POST" })
  .validator((input: unknown) => activateEmailSchema.parse(input))
  .handler(async ({ data }) => {
    const sql = await getSql();
    const email = data.email.trim().toLowerCase();
    const count = await sql<{ n: number }>`select count(*)::int as n from staff`;
    const match = await sql<{ active: boolean }>`
      select active from staff where lower(email) = ${email} limit 1
    `;
    return decideActivation({
      staffCount: num(count[0]?.n),
      match: match[0] ? { active: Boolean(match[0].active) } : null,
    });
  });

export const getMe = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    return ensureStaff(sql, context.userId);
  });

export const lookupCep = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => cepSchema.parse(input))
  .handler(async ({ context, data: cep }) => {
    const sql = await getSql();
    await requireStaff(sql, context.userId, "clientes");
    if (!isValidCep(cep)) {
      throw new Error("CEP inválido. Use 8 dígitos.");
    }
    const addr = await fetchCepAddress(cep);
    if (!addr) throw new Error("CEP não encontrado.");
    return addr;
  });

export const listCustomers = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await requireStaff(sql, context.userId, "clientes");
    const rows = await sql<Record<string, unknown>>`
      select * from customers order by name asc
    `;
    return rows.map(mapCustomer);
  });

export const createCustomer = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => customerSchema.parse(input))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await requireStaff(sql, context.userId, "clientes");
    const rows = await sql<Record<string, unknown>>`
      insert into customers (
        name, phone, email, document, cep, street, number,
        neighborhood, city, state, notes, created_by
      ) values (
        ${data.name}, ${data.phone}, ${data.email}, ${data.document},
        ${data.cep}, ${data.street}, ${data.number}, ${data.neighborhood},
        ${data.city}, ${data.state}, ${data.notes}, ${context.userId}
      )
      returning *
    `;
    return mapCustomer(rows[0]!);
  });

export const updateCustomer = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => customerUpdateSchema.parse(input))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await requireStaff(sql, context.userId, "clientes");
    const rows = await sql<Record<string, unknown>>`
      update customers set
        name = ${data.name},
        phone = ${data.phone},
        email = ${data.email},
        document = ${data.document},
        cep = ${data.cep},
        street = ${data.street},
        number = ${data.number},
        neighborhood = ${data.neighborhood},
        city = ${data.city},
        state = ${data.state},
        notes = ${data.notes}
      where id = ${data.id}
      returning *
    `;
    if (!rows[0]) throw new Error("Cliente não encontrado.");
    return mapCustomer(rows[0]);
  });

export const listMaterials = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await requireStaff(sql, context.userId, ["pedidos-novo", "estoque", "catalogo"]);
    const rows = await sql<Record<string, unknown>>`
      select * from materials order by active desc, name
    `;
    return rows.map(mapMaterial);
  });

export const listOrders = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const staff = await requireStaff(sql, context.userId, ["pedidos", "producao"]);
    const filter =
      staff.role === "producao"
        ? " where o.status in ('recebido','em_producao','pronto')"
        : "";
    const rows = await sql.query<OrderRow>(
      `${ORDER_SELECT}${filter} order by o.created_at desc limit 400`,
    );
    const mapped = await mapOrders(sql, rows);
    return mapped.map((o) => redactOrderForRole(o, staff.role));
  });

export const getOrder = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    const id = typeof input === "number" ? input : Number(input);
    if (!Number.isInteger(id) || id <= 0) throw new Error("Pedido inválido");
    return id;
  })
  .handler(async ({ context, data: id }) => {
    const sql = await getSql();
    const staff = await requireStaff(sql, context.userId, ["pedidos", "producao"]);
    const rows = await sql.query<OrderRow>(
      `${ORDER_SELECT} where o.id = $1`,
      [id],
    );
    if (!rows[0]) throw new Error("Pedido não encontrado.");
    if (staff.role === "producao" && rows[0].status === "retirado") {
      throw new Error("Pedido não encontrado.");
    }
    const items = await loadItemsByOrder(sql, [id]);
    const events = await sql<Record<string, unknown>>`
      select id, order_id, from_status, to_status, user_id, note, created_at
      from order_events where order_id = ${id} order by created_at asc
    `;
    const mappedEvents: OrderEvent[] = events.map((e) => ({
      id: num(e.id),
      orderId: num(e.order_id),
      fromStatus: (e.from_status as OrderStatus | null) ?? null,
      toStatus: e.to_status as OrderStatus,
      userId: String(e.user_id),
      note:
        staff.role === "producao" && String(e.note ?? "").startsWith("Retirado por")
          ? "Pedido retirado"
          : String(e.note ?? ""),
      createdAt: iso(e.created_at),
    }));
    return {
      order: redactOrderForRole(mapOrder(rows[0], items.get(id) ?? []), staff.role),
      events: mappedEvents,
    };
  });

export const createOrder = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => orderSchema.parse(input))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const staff = await requireStaff(sql, context.userId, "pedidos-novo");
    const customer = await sql<{ id: number }>`
      select id from customers where id = ${data.customerId} limit 1
    `;
    if (!customer[0]) throw new Error("Cliente não encontrado.");
    const { loadCatalog, asCatalogSet } = await import("./catalog-db.server");
    const stored = await loadCatalog(sql, true);
    const catalog = asCatalogSet(stored);

    const materialIds = [...new Set(data.items.map((i) => i.materialId))];
    const placeholders = materialIds.map((_, i) => `$${i + 1}`).join(", ");
    const matRows = await sql.query<{ id: number; name: string }>(
      `select id, name from materials where active = true and id in (${placeholders})`,
      materialIds,
    );
    const materialNameById = new Map(
      matRows.map((m) => [num(m.id), String(m.name)]),
    );

    for (const item of data.items) {
      const materialName = materialNameById.get(item.materialId) ?? "";
      if (!materialName) throw new Error("Material não encontrado.");
      const piece = catalog.pieces.find((p) => p.name === item.piece);
      if (!piece) throw new Error("Peça fora do catálogo da loja.");
      if (!piece.materials.includes(materialName)) {
        throw new Error(
          `${item.piece} não usa ${materialName}. Use: ${piece.materials.join(", ")}.`,
        );
      }
      const specErrors = validateOrderSpec(
        {
          piece: item.piece,
          size: item.size,
          color: item.color,
          materialName,
          quantity: item.quantity,
          printName: item.printName,
          technique: item.technique,
          printPlace: item.printPlace,
          personalization: item.personalization,
          dueDate: data.dueDate,
        },
        catalog,
      );
      if (specErrors.length) throw new Error(specErrors[0]);
    }

    const first = data.items[0]!;
    const firstArt = data.items.find((i) => i.artworkData) ?? first;
    const rows = await sql.query<OrderRow>(
      `insert into orders (
         customer_id, piece, size, color, material_id, quantity,
         personalization, print_name, technique, print_place,
         due_date, notes, status, created_by,
         artwork_name, artwork_mime, artwork_data
       ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'recebido',$13,$14,$15,$16)
       returning id`,
      [
        data.customerId,
        first.piece,
        first.size,
        first.color,
        first.materialId,
        totalPieces(data.items),
        first.personalization,
        first.printName,
        first.technique,
        first.printPlace,
        data.dueDate,
        data.notes,
        context.userId,
        firstArt.artworkName ?? "",
        firstArt.artworkMime ?? "",
        firstArt.artworkData ?? "",
      ],
    );
    const id = num(rows[0]?.id);

    for (let i = 0; i < data.items.length; i += 1) {
      const item = data.items[i]!;
      await sql.query(
        `insert into order_items (
           order_id, piece, size, color, material_id, quantity,
           personalization, print_name, technique, print_place,
           artwork_name, artwork_mime, artwork_data, sort_order
         ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [
          id,
          item.piece,
          item.size,
          item.color,
          item.materialId,
          item.quantity,
          item.personalization,
          item.printName,
          item.technique,
          item.printPlace,
          item.artworkName ?? "",
          item.artworkMime ?? "",
          item.artworkData ?? "",
          i,
        ],
      );
    }

    await sql`
      insert into order_events (order_id, from_status, to_status, user_id, note)
      values (${id}, null, 'recebido', ${context.userId}, 'Pedido lançado no atendimento')
    `;
    const full = await sql.query<OrderRow>(`${ORDER_SELECT} where o.id = $1`, [
      id,
    ]);
    const items = await loadItemsByOrder(sql, [id]);
    return redactOrderForRole(mapOrder(full[0]!, items.get(id) ?? []), staff.role);
  });

export const changeOrderStatus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => statusChangeSchema.parse(input))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const staff = await requireStaff(sql, context.userId);
    const rows = await sql.query<OrderRow>(`${ORDER_SELECT} where o.id = $1`, [
      data.orderId,
    ]);
    const current = rows[0];
    if (!current) throw new Error("Pedido não encontrado.");
    const from = current.status;
    const to = data.to;
    if (!canTransition(from, to, staff.role)) {
      throw new ForbiddenError("Seu perfil não pode fazer esta mudança de status.");
    }

    let warning: string | null = null;

    const itemRows = await sql.query<{
      quantity: number;
      material_id: number;
      name: string;
      unit: string;
      mat_qty: number;
      min_quantity: number;
      qty_per_piece: number;
    }>(
      `select i.quantity, i.material_id, m.name, m.unit,
              m.quantity as mat_qty, m.min_quantity, m.qty_per_piece
       from order_items i
       join materials m on m.id = i.material_id
       where i.order_id = $1`,
      [data.orderId],
    );
    const stockItems =
      itemRows.length > 0
        ? itemRows.map((r) => ({
            materialId: num(r.material_id),
            quantity: num(r.quantity),
            name: String(r.name),
            unit: String(r.unit),
            available: num(r.mat_qty),
            minQuantity: num(r.min_quantity),
            qtyPerPiece: num(r.qty_per_piece),
          }))
        : await (async () => {
            const mat = await sql<Record<string, unknown>>`
              select name, unit, quantity, min_quantity, qty_per_piece
              from materials where id = ${current.material_id} limit 1
            `;
            const row = mat[0];
            return [
              {
                materialId: num(current.material_id),
                quantity: num(current.quantity),
                name: current.material_name,
                unit: current.material_unit,
                available: num(row?.quantity),
                minQuantity: num(row?.min_quantity),
                qtyPerPiece: num(row?.qty_per_piece) || 1,
              },
            ];
          })();
    const materialsForNeed = stockItems.map((s) => ({
      id: s.materialId,
      name: s.name,
      unit: s.unit,
      quantity: s.available,
      minQuantity: s.minQuantity,
      qtyPerPiece: s.qtyPerPiece,
    }));
    const needs = groupStockNeeds(
      stockItems.map((s) => ({ materialId: s.materialId, quantity: s.quantity })),
      materialsForNeed,
    );

    if (shouldDeductStock(from, to) && !current.stock_deducted) {
      const claimed = await sql<{ id: number }>`
        update orders
        set status = ${to}, stock_deducted = true, updated_at = now()
        where id = ${data.orderId} and status = ${from} and stock_deducted = false
        returning id
      `;
      if (!claimed[0]) {
        throw new Error("Este pedido já mudou de status. Atualize a fila.");
      }
      const deducted: { materialId: number; used: number }[] = [];
      const warnings: string[] = [];
      for (const need of needs) {
        const stock = await sql<Record<string, unknown>>`
          update materials
          set quantity = quantity - ${need.used}, updated_at = now()
          where id = ${need.materialId} and quantity >= ${need.used}
          returning name, unit, quantity, min_quantity
        `;
        if (!stock[0]) {
          for (const done of deducted) {
            await sql`
              update materials
              set quantity = quantity + ${done.used}, updated_at = now()
              where id = ${done.materialId}
            `;
          }
          await sql`
            update orders
            set status = ${from}, stock_deducted = false, updated_at = now()
            where id = ${data.orderId}
          `;
          const live = stockItems.find((s) => s.materialId === need.materialId);
          throw new Error(
            `Estoque insuficiente de ${need.name}: há ${formatNum(live?.available ?? need.available)} ${need.unit}, o pedido precisa de ${formatNum(need.used)} ${need.unit}.`,
          );
        }
        deducted.push({ materialId: need.materialId, used: need.used });
        await sql`
          insert into stock_movements (material_id, order_id, delta, reason, user_id)
          values (${need.materialId}, ${data.orderId}, ${-need.used}, 'Baixa ao iniciar produção', ${context.userId})
        `;
        if (num(stock[0].quantity) < num(stock[0].min_quantity)) {
          warnings.push(
            `${stock[0].name} ficou abaixo do mínimo (${formatNum(num(stock[0].quantity))} ${stock[0].unit}; mínimo ${formatNum(num(stock[0].min_quantity))} ${stock[0].unit}).`,
          );
        }
      }
      warning = warnings.length ? warnings.join(" ") : null;
    } else if (shouldRestock(from, to) && current.stock_deducted) {
      const claimed = await sql<{ id: number }>`
        update orders
        set status = ${to}, stock_deducted = false, updated_at = now()
        where id = ${data.orderId} and status = ${from} and stock_deducted = true
        returning id
      `;
      if (!claimed[0]) {
        throw new Error("Este pedido já mudou de status. Atualize a fila.");
      }
      for (const need of needs) {
        await sql`
          update materials
          set quantity = quantity + ${need.used}, updated_at = now()
          where id = ${need.materialId}
        `;
        await sql`
          insert into stock_movements (material_id, order_id, delta, reason, user_id)
          values (${need.materialId}, ${data.orderId}, ${need.used}, 'Devolução ao voltar para recebido', ${context.userId})
        `;
      }
    } else {
      const pickupName = data.to === "retirado" ? (data.pickupName ?? "").trim() : null;
      const paymentMethod = data.to === "retirado" ? (data.paymentMethod ?? "") : null;
      const receiptName = data.to === "retirado" ? (data.receiptName ?? "") : null;
      const receiptMime = data.to === "retirado" ? (data.receiptMime ?? "") : null;
      const receiptData = data.to === "retirado" ? (data.receiptData ?? "") : null;
      const claimed = await sql<{ id: number }>`
        update orders
        set status = ${to},
            updated_at = now(),
            pickup_name = coalesce(${pickupName}, pickup_name),
            payment_method = coalesce(${paymentMethod}, payment_method),
            pickup_at = case when ${data.to} = 'retirado' then now() else pickup_at end,
            receipt_name = coalesce(${receiptName}, receipt_name),
            receipt_mime = coalesce(${receiptMime}, receipt_mime),
            receipt_data = coalesce(${receiptData}, receipt_data)
        where id = ${data.orderId} and status = ${from}
        returning id
      `;
      if (!claimed[0]) {
        throw new Error("Este pedido já mudou de status. Atualize a fila.");
      }
    }

    const eventNote =
      to === "retirado"
        ? `Retirado por ${data.pickupName?.trim() ?? ""} · ${data.paymentMethod ?? ""}`
        : "";
    await sql`
      insert into order_events (order_id, from_status, to_status, user_id, note)
      values (${data.orderId}, ${from}, ${to}, ${context.userId}, ${eventNote})
    `;

    const fresh = await sql.query<OrderRow>(`${ORDER_SELECT} where o.id = $1`, [
      data.orderId,
    ]);
    const freshItems = await loadItemsByOrder(sql, [data.orderId]);
    return {
      order: redactOrderForRole(
        mapOrder(fresh[0]!, freshItems.get(data.orderId) ?? []),
        staff.role,
      ),
      warning,
    };
  });

export const getOrderReceipt = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => orderIdSchema.parse(input))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await requireStaff(sql, context.userId, "pedidos");
    const rows = await sql<{
      receipt_name: string;
      receipt_mime: string;
      receipt_data: string;
    }>`
      select receipt_name, receipt_mime, receipt_data
      from orders
      where id = ${data.orderId}
      limit 1
    `;
    const row = rows[0];
    if (!row || !row.receipt_data) throw new Error("Comprovante não encontrado.");
    return {
      name: row.receipt_name || "comprovante",
      mime: row.receipt_mime || "application/octet-stream",
      data: row.receipt_data,
    };
  });

export const getOrderArtwork = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => orderArtworkSchema.parse(input))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await requireStaff(sql, context.userId, ["pedidos", "producao"]);
    if (data.itemId) {
      const rows = await sql<{
        artwork_name: string;
        artwork_mime: string;
        artwork_data: string;
      }>`
        select artwork_name, artwork_mime, artwork_data
        from order_items
        where id = ${data.itemId} and order_id = ${data.orderId}
        limit 1
      `;
      const row = rows[0];
      if (row?.artwork_data) {
        return {
          name: row.artwork_name || "arte",
          mime: row.artwork_mime || "image/jpeg",
          data: row.artwork_data,
        };
      }
    }
    const itemRows = await sql<{
      artwork_name: string;
      artwork_mime: string;
      artwork_data: string;
    }>`
      select artwork_name, artwork_mime, artwork_data
      from order_items
      where order_id = ${data.orderId} and length(artwork_data) > 0
      order by sort_order, id
      limit 1
    `;
    if (itemRows[0]?.artwork_data) {
      return {
        name: itemRows[0].artwork_name || "arte",
        mime: itemRows[0].artwork_mime || "image/jpeg",
        data: itemRows[0].artwork_data,
      };
    }
    const rows = await sql<{
      artwork_name: string;
      artwork_mime: string;
      artwork_data: string;
    }>`
      select artwork_name, artwork_mime, artwork_data
      from orders
      where id = ${data.orderId}
      limit 1
    `;
    const row = rows[0];
    if (!row || !row.artwork_data) throw new Error("Arte não encontrada.");
    return {
      name: row.artwork_name || "arte",
      mime: row.artwork_mime || "image/jpeg",
      data: row.artwork_data,
    };
  });

export const getCatalog = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await requireStaff(sql, context.userId, ["pedidos-novo", "catalogo", "producao"]);
    const { loadCatalog } = await import("./catalog-db.server");
    return loadCatalog(sql, true);
  });

export const getCatalogAdmin = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await requireStaff(sql, context.userId, "catalogo");
    const { loadCatalog } = await import("./catalog-db.server");
    return loadCatalog(sql, false);
  });

export const saveCatalogPiece = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => catalogPieceSchema.parse(input))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await requireStaff(sql, context.userId, "catalogo");
    const { ensureCatalog } = await import("./catalog-db.server");
    await ensureCatalog(sql);
    const colors = JSON.stringify(data.colors);
    const materials = JSON.stringify(data.materials);
    const techniques = JSON.stringify(data.techniques);
    if (data.id) {
      await sql`
        update catalog_pieces
        set name = ${data.name},
            category = ${data.category},
            image = ${data.image},
            size_set = ${data.sizeSet},
            colors = ${colors},
            materials = ${materials},
            techniques = ${techniques},
            active = ${data.active}
        where id = ${data.id}
      `;
      return { ok: true, id: data.id };
    }
    const rows = await sql<{ id: number }>`
      insert into catalog_pieces (
        name, category, image, size_set, colors, materials, techniques, active, sort_order
      ) values (
        ${data.name}, ${data.category}, ${data.image}, ${data.sizeSet},
        ${colors}, ${materials}, ${techniques}, ${data.active}, 99
      )
      returning id
    `;
    return { ok: true, id: num(rows[0]?.id) };
  });

export const saveCatalogPrint = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => catalogPrintSchema.parse(input))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await requireStaff(sql, context.userId, "catalogo");
    const { ensureCatalog, slugify } = await import("./catalog-db.server");
    await ensureCatalog(sql);
    const id = (data.id && data.id.trim()) || slugify(data.name);
    const categories = JSON.stringify(data.categories);
    const existing = await sql<{ id: string }>`
      select id from catalog_prints where id = ${id} limit 1
    `;
    if (existing[0]) {
      await sql`
        update catalog_prints
        set name = ${data.name},
            hint = ${data.hint},
            technique = ${data.technique},
            place = ${data.place},
            needs_text = ${data.needsText},
            text_label = ${data.textLabel},
            text_placeholder = ${data.textPlaceholder},
            categories = ${categories},
            active = ${data.active}
        where id = ${id}
      `;
    } else {
      await sql`
        insert into catalog_prints (
          id, name, hint, technique, place, needs_text, text_label, text_placeholder,
          categories, active, sort_order
        ) values (
          ${id}, ${data.name}, ${data.hint}, ${data.technique}, ${data.place},
          ${data.needsText}, ${data.textLabel}, ${data.textPlaceholder},
          ${categories}, ${data.active}, 99
        )
      `;
    }
    return { ok: true, id };
  });

async function loadOutlook(
  sql: Sql,
  extras?: Array<{ piece: string; size: string; quantity: number; materialName: string }>,
) {
  const mats = await sql<Record<string, unknown>>`
    select * from materials where active = true order by name
  `;
  const materials = mats.map(mapMaterial);
  const rows = await sql<{
    piece: string;
    size: string;
    quantity: number;
    stock_deducted: boolean;
    material_name: string;
  }>`
    select i.piece, i.size, i.quantity, o.stock_deducted, m.name as material_name
    from order_items i
    join orders o on o.id = i.order_id
    join materials m on m.id = i.material_id
    where o.status in ('recebido', 'em_producao', 'pronto')
  `;
  const lines: DemandLine[] = rows.map((r) => ({
    piece: String(r.piece),
    size: String(r.size),
    quantity: num(r.quantity),
    stockDeducted: Boolean(r.stock_deducted),
    materialName: String(r.material_name),
  }));
  const { loadCatalog, asCatalogSet } = await import("./catalog-db.server");
  const stored = await loadCatalog(sql, true);
  return buildOutlook({
    lines,
    materials: materials.map((m) => ({
      id: m.id,
      name: m.name,
      unit: m.unit,
      quantity: m.quantity,
      minQuantity: m.minQuantity,
      qtyPerPiece: m.qtyPerPiece,
    })),
    month: calendarMonth(),
    extras,
    pieces: asCatalogSet(stored).pieces,
  });
}

function formatNum(n: number): string {
  return Number.isInteger(n)
    ? String(n)
    : n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

export const getDashboard = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const staff = await requireStaff(sql, context.userId, "painel");
    const [counts, overdue, low, month, outlook, queueRows] = await Promise.all([
      sql<{ status: OrderStatus; n: number }>`
        select status, count(*)::int as n from orders group by status
      `,
      sql<{ n: number }>`
        select count(*)::int as n from orders
        where status <> 'retirado' and due_date < current_date
      `,
      sql<{ n: number }>`
        select count(*)::int as n from materials where active = true and quantity < min_quantity
      `,
      sql<{ n: number; pieces: number }>`
        select count(distinct o.id)::int as n, coalesce(sum(i.quantity),0)::int as pieces
        from orders o
        join order_items i on i.order_id = o.id
        where o.created_at >= date_trunc('month', current_date)
      `,
      loadOutlook(sql),
      sql.query<OrderRow>(
        `${ORDER_SELECT}
         where o.status in ('recebido','em_producao','pronto')
         order by o.due_date asc, o.created_at asc
         limit 8`,
      ),
    ]);
    const map = Object.fromEntries(counts.map((c) => [c.status, num(c.n)]));
    const stats: DashboardStats = {
      received: map.recebido ?? 0,
      inProduction: map.em_producao ?? 0,
      ready: map.pronto ?? 0,
      pickedUp: map.retirado ?? 0,
      overdue: num(overdue[0]?.n),
      lowStock: num(low[0]?.n),
      ordersThisMonth: num(month[0]?.n),
      piecesThisMonth: num(month[0]?.pieces),
      schoolQueuePieces: outlook.schoolPieces,
      schoolQueueOrders: outlook.schoolOrders,
      committedRisks: outlook.surprises.length,
    };
    const queue = await mapOrders(sql, queueRows);
    const alerts = canSeeStockDetails(staff.role)
      ? await sql<Record<string, unknown>>`
          select * from materials
          where active = true and quantity < min_quantity
          order by (quantity - min_quantity) asc
        `
      : [];
    return {
      stats,
      queue: queue.map((o) => redactOrderForRole(o, staff.role)),
      alerts: alerts.map(mapMaterial),
      outlook: canSeeStockDetails(staff.role)
        ? outlook
        : { ...outlook, materials: [], surprises: [] },
    };
  });

export const getStockOutlook = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => {
    if (!input || typeof input !== "object") return { extras: undefined as undefined };
    const raw = input as Record<string, unknown>;
    const parseOne = (value: unknown) => {
      if (!value || typeof value !== "object") return null;
      const row = value as Record<string, unknown>;
      const piece = typeof row.piece === "string" ? row.piece : "";
      const size = typeof row.size === "string" ? row.size : "";
      const materialName = typeof row.materialName === "string" ? row.materialName : "";
      const quantity = Number(row.quantity);
      if (!piece || !materialName || !Number.isInteger(quantity) || quantity < 1) {
        return null;
      }
      return { piece, size, quantity, materialName };
    };
    const extras = Array.isArray(raw.extras)
      ? raw.extras.map(parseOne).filter((x): x is NonNullable<typeof x> => Boolean(x))
      : [];
    const one = parseOne(raw);
    if (one) extras.push(one);
    return { extras: extras.length ? extras : undefined };
  })
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await requireStaff(sql, context.userId, ["pedidos-novo", "estoque"]);
    return loadOutlook(sql, data.extras);
  });

export const getReport = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await requireStaff(sql, context.userId, "relatorios");
    const [byStatus, byPiece, byMaterial, stock, monthly, monthlySchool] = await Promise.all([
      sql<{ status: OrderStatus; count: number; pieces: number }>`
        select o.status, count(distinct o.id)::int as count, coalesce(sum(i.quantity),0)::int as pieces
        from orders o
        join order_items i on i.order_id = o.id
        group by o.status
      `,
      sql<{ piece: string; count: number; pieces: number }>`
        select i.piece, count(distinct i.order_id)::int as count, coalesce(sum(i.quantity),0)::int as pieces
        from order_items i
        group by i.piece order by pieces desc limit 8
      `,
      sql<{ name: string; pieces: number }>`
        select m.name, coalesce(sum(i.quantity),0)::int as pieces
        from order_items i join materials m on m.id = i.material_id
        group by m.name order by pieces desc
      `,
      sql<Record<string, unknown>>`
        select name, quantity, min_quantity, unit from materials where active = true order by name
      `,
      sql<{ month: string; orders: number; pieces: number }>`
        select to_char(date_trunc('month', o.created_at), 'YYYY-MM') as month,
               count(distinct o.id)::int as orders,
               coalesce(sum(i.quantity),0)::int as pieces
        from orders o
        join order_items i on i.order_id = o.id
        group by 1
        order by 1 asc
      `,
      sql<{ month: string; school: number; other: number }>`
        select to_char(date_trunc('month', o.created_at), 'YYYY-MM') as month,
               coalesce(sum(case when i.piece in ('Camiseta escolar','Agasalho escolar') then i.quantity else 0 end),0)::int as school,
               coalesce(sum(case when i.piece not in ('Camiseta escolar','Agasalho escolar') then i.quantity else 0 end),0)::int as other
        from orders o
        join order_items i on i.order_id = o.id
        group by 1
        order by 1 asc
      `,
    ]);
    const data: ReportData = {
      byStatus: byStatus.map((r) => ({
        status: r.status,
        count: num(r.count),
        pieces: num(r.pieces),
      })),
      byPiece: byPiece.map((r) => ({
        piece: r.piece,
        count: num(r.count),
        pieces: num(r.pieces),
      })),
      byMaterial: byMaterial.map((r) => ({
        name: r.name,
        pieces: num(r.pieces),
      })),
      stock: stock.map((r) => ({
        name: String(r.name),
        quantity: num(r.quantity),
        minQuantity: num(r.min_quantity),
        unit: String(r.unit),
      })),
      monthly: monthly.map((r) => ({
        month: r.month,
        orders: num(r.orders),
        pieces: num(r.pieces),
      })),
      monthlySchool: monthlySchool.map((r) => ({
        month: r.month,
        school: num(r.school),
        other: num(r.other),
      })),
    };
    return data;
  });

export const listStaff = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await requireStaff(sql, context.userId, "equipe");
    const rows = await sql<StaffRow>`
      select id, user_id, email, name, role, active from staff order by name
    `;
    return rows.map(mapStaff);
  });

export const inviteStaff = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => inviteSchema.parse(input))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await requireStaff(sql, context.userId, "equipe");
    const email = data.email.trim().toLowerCase();
    const existing = await sql<{ id: number }>`
      select id from staff where lower(email) = ${email}
    `;
    if (existing[0]) throw new Error("Este e-mail já está na equipe.");
    const rows = await sql<StaffRow>`
      insert into staff (email, name, role, active)
      values (${email}, ${data.name}, ${data.role}, true)
      returning id, user_id, email, name, role, active
    `;
    return mapStaff(rows[0]!);
  });

export const setStaffActive = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => staffActiveSchema.parse(input))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const me = await requireStaff(sql, context.userId, "equipe");
    const target = await sql<StaffRow>`
      select id, user_id, email, name, role, active from staff where id = ${data.id}
    `;
    if (!target[0]) throw new Error("Pessoa não encontrada na equipe.");
    const admins = await sql<{ n: number }>`
      select count(*)::int as n from staff where role = 'admin' and active = true
    `;
    const err = deactivationError({
      actorId: me.id,
      targetId: num(target[0].id),
      targetRole: target[0].role,
      currentlyActive: Boolean(target[0].active),
      nextActive: data.active,
      activeAdminCount: num(admins[0]?.n),
    });
    if (err) throw new Error(err);
    await sql`update staff set active = ${data.active} where id = ${data.id}`;
    return { ok: true };
  });

export const createMaterial = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => materialCreateSchema.parse(input))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await requireStaff(sql, context.userId, "estoque");
    const rows = await sql<Record<string, unknown>>`
      insert into materials (name, unit, quantity, min_quantity, qty_per_piece)
      values (${data.name}, ${data.unit}, ${data.quantity}, ${data.minQuantity}, ${data.qtyPerPiece})
      returning *
    `;
    return mapMaterial(rows[0]!);
  });

export const updateMaterial = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: unknown) => materialUpdateSchema.parse(input))
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const staff = await requireStaff(sql, context.userId, "estoque");
    const current = await sql<Record<string, unknown>>`
      select * from materials where id = ${data.id}
    `;
    if (!current[0]) throw new Error("Material não encontrado.");
    const prev = num(current[0].quantity);
    const next = data.quantity;
    const delta = Math.round((next - prev) * 100) / 100;
    const updated = await sql<Record<string, unknown>>`
      update materials
      set quantity = ${data.quantity},
          min_quantity = ${data.minQuantity},
          qty_per_piece = ${data.qtyPerPiece ?? num(current[0].qty_per_piece)},
          name = ${data.name ?? String(current[0].name)},
          unit = ${data.unit ?? String(current[0].unit)},
          active = ${data.active ?? Boolean(current[0].active)},
          updated_at = now()
      where id = ${data.id} and quantity = ${prev}
      returning *
    `;
    if (!updated[0]) {
      throw new Error("O estoque mudou enquanto você editava. Atualize a tela e tente de novo.");
    }
    if (delta !== 0) {
      await sql`
        insert into stock_movements (material_id, order_id, delta, reason, user_id)
        values (${data.id}, null, ${delta}, 'Ajuste manual de estoque', ${staff.userId ?? context.userId})
      `;
    }
    return mapMaterial(updated[0]);
  });

export const listMovements = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await requireStaff(sql, context.userId, "estoque");
    const rows = await sql<Record<string, unknown>>`
      select sm.id, sm.material_id, m.name as material_name, sm.order_id,
             sm.delta, sm.reason, sm.user_id, sm.created_at
      from stock_movements sm
      join materials m on m.id = sm.material_id
      order by sm.created_at desc
      limit 40
    `;
    return rows.map((r) => ({
      id: num(r.id),
      materialId: num(r.material_id),
      materialName: String(r.material_name),
      orderId: r.order_id == null ? null : num(r.order_id),
      delta: num(r.delta),
      reason: String(r.reason),
      userId: String(r.user_id),
      createdAt: iso(r.created_at),
    }));
  });
