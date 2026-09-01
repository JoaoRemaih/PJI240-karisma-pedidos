import type { Role } from "./types";

export type AppPage =
  | "painel"
  | "clientes"
  | "pedidos"
  | "pedidos-novo"
  | "producao"
  | "estoque"
  | "relatorios"
  | "equipe"
  | "catalogo";

const PAGE_ROLES: Record<AppPage, Role[]> = {
  painel: ["admin", "atendimento", "producao"],
  clientes: ["admin", "atendimento"],
  pedidos: ["admin", "atendimento"],
  "pedidos-novo": ["admin", "atendimento"],
  producao: ["admin", "producao"],
  estoque: ["admin"],
  relatorios: ["admin"],
  equipe: ["admin"],
  catalogo: ["admin"],
};

export function canAccess(role: Role, page: AppPage): boolean {
  return PAGE_ROLES[page].includes(role);
}

export function canAccessAny(role: Role, pages: AppPage[]): boolean {
  return pages.some((page) => canAccess(role, page));
}

export function navFor(role: Role): AppPage[] {
  return (Object.keys(PAGE_ROLES) as AppPage[]).filter((page) =>
    canAccess(role, page),
  );
}

export type RoleGuide = {
  can: string[];
  cannot: string[];
};

/** O que cada perfil faz no balcão — texto da loja, não da API. */
export const ROLE_GUIDE: Record<Role, RoleGuide> = {
  admin: {
    can: [
      "Equipe, catálogo, estoque e relatórios",
      "Cadastra cliente e lança pedido",
      "Entra na fila da produção e muda qualquer status",
      "Marca retirada e vê telefone do cliente",
    ],
    cannot: ["Cliente da rua não usa este login"],
  },
  atendimento: {
    can: [
      "Cadastra cliente (nome, telefone, endereço)",
      "Lança pedido no balcão, com várias peças",
      "Vê a lista de pedidos",
      "Marca retirada: quem levou, pagamento e comprovante",
    ],
    cannot: [
      "Não entra na fila da produção",
      "Não edita estoque nem catálogo",
      "Não vê relatórios nem equipe",
    ],
  },
  producao: {
    can: [
      "Vê a fila e a ficha (peça, cor, tecido, estampa, logo)",
      "Recebido → em produção (baixa o tecido)",
      "Em produção → pronto",
      "Pode devolver para recebido se ainda não costurou",
    ],
    cannot: [
      "Não cadastra cliente e não lança pedido",
      "Não vê telefone do cliente",
      "Não marca retirada no balcão",
      "Não mexe em estoque, catálogo, relatórios ou equipe",
    ],
  },
};
