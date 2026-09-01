export const ROLES = ["admin", "atendimento", "producao"] as const;
export type Role = (typeof ROLES)[number];

export const ORDER_STATUSES = [
  "recebido",
  "em_producao",
  "pronto",
  "retirado",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export { PIECES, SIZES, COLORS } from "./catalog";

export type Staff = {
  id: number;
  userId: string | null;
  email: string;
  name: string;
  role: Role;
  active: boolean;
};

export type Customer = {
  id: number;
  name: string;
  phone: string;
  email: string;
  document: string;
  cep: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  notes: string;
  createdBy: string;
  createdAt: string;
};

export type Material = {
  id: number;
  name: string;
  unit: string;
  quantity: number;
  minQuantity: number;
  qtyPerPiece: number;
  active: boolean;
  belowMin: boolean;
};

export type OrderItem = {
  id: number;
  piece: string;
  size: string;
  color: string;
  materialId: number;
  materialName: string;
  materialUnit: string;
  quantity: number;
  personalization: string;
  printName: string;
  technique: string;
  printPlace: string;
  artworkName: string;
  hasArtwork: boolean;
};

export type Order = {
  id: number;
  customerId: number;
  customerName: string;
  customerPhone: string;
  piece: string;
  size: string;
  color: string;
  materialId: number;
  materialName: string;
  materialUnit: string;
  quantity: number;
  personalization: string;
  printName: string;
  technique: string;
  printPlace: string;
  dueDate: string;
  notes: string;
  status: OrderStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  stockDeducted: boolean;
  overdue: boolean;
  pickupName: string;
  paymentMethod: string;
  pickupAt: string;
  receiptName: string;
  hasReceipt: boolean;
  artworkName: string;
  hasArtwork: boolean;
  items: OrderItem[];
};

export type OrderEvent = {
  id: number;
  orderId: number;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  userId: string;
  note: string;
  createdAt: string;
};

export type StockMovement = {
  id: number;
  materialId: number;
  materialName: string;
  orderId: number | null;
  delta: number;
  reason: string;
  userId: string;
  createdAt: string;
};

export type CepAddress = {
  cep: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
};

export type DashboardStats = {
  received: number;
  inProduction: number;
  ready: number;
  pickedUp: number;
  overdue: number;
  lowStock: number;
  ordersThisMonth: number;
  piecesThisMonth: number;
  schoolQueuePieces: number;
  schoolQueueOrders: number;
  committedRisks: number;
};

export type ReportData = {
  byStatus: { status: OrderStatus; count: number; pieces: number }[];
  byPiece: { piece: string; count: number; pieces: number }[];
  byMaterial: { name: string; pieces: number }[];
  stock: { name: string; quantity: number; minQuantity: number; unit: string }[];
  monthly: { month: string; orders: number; pieces: number }[];
  monthlySchool: { month: string; school: number; other: number }[];
};

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Administração",
  atendimento: "Atendimento",
  producao: "Produção",
};

export const STATUS_LABEL: Record<OrderStatus, string> = {
  recebido: "Recebido",
  em_producao: "Em produção",
  pronto: "Pronto",
  retirado: "Retirado",
};
