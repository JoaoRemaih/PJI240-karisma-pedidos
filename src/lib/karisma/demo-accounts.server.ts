import type { Role } from "./types";

export type DemoAccount = {
  email: string;
  password: string;
  name: string;
  role: Role;
  label: string;
};

/** Contas só no servidor — não vão para o site público. */
export const DEMO_PASSWORD = "Karisma1";

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    email: "admin@karisma.local",
    password: DEMO_PASSWORD,
    name: "Administração",
    role: "admin",
    label: "Admin",
  },
  {
    email: "atendimento@karisma.local",
    password: DEMO_PASSWORD,
    name: "Atendimento",
    role: "atendimento",
    label: "Atendimento",
  },
  {
    email: "producao@karisma.local",
    password: DEMO_PASSWORD,
    name: "Produção",
    role: "producao",
    label: "Produção",
  },
];
