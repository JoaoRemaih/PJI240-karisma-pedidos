import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { dbSource, type Sql } from "@/lib/db";
import { DEMO_ACCOUNTS } from "./demo-accounts.server";

let seeded = false;

export async function seedDemoAccounts(sql: Sql): Promise<void> {
  if (dbSource !== "pglite") return;
  if (seeded) return;
  const already = await sql<{ n: number }>`
    select count(*)::int as n from staff
    where email in (
      'admin@karisma.local',
      'atendimento@karisma.local',
      'producao@karisma.local'
    )
  `;
  if ((already[0]?.n ?? 0) >= DEMO_ACCOUNTS.length) {
    seeded = true;
    return;
  }
  for (const account of DEMO_ACCOUNTS) {
    const email = account.email.toLowerCase();
    const users = await sql<{ id: string }>`
      select id from "user" where lower(email) = ${email} limit 1
    `;
    let userId = users[0]?.id;
    if (!userId) {
      userId = randomUUID();
      await sql`
        insert into "user" (id, name, email, "emailVerified", "createdAt", "updatedAt")
        values (${userId}, ${account.name}, ${email}, true, now(), now())
      `;
    }
    const acc = await sql<{ id: string }>`
      select id from account
      where "userId" = ${userId} and "providerId" = 'credential'
      limit 1
    `;
    if (!acc[0]) {
      const hash = await hashPassword(account.password);
      await sql`
        insert into account (
          id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt"
        ) values (
          ${randomUUID()}, ${userId}, 'credential', ${userId}, ${hash}, now(), now()
        )
      `;
    }
    const staff = await sql<{ id: number }>`
      select id from staff where lower(email) = ${email} limit 1
    `;
    if (staff[0]) {
      await sql`
        update staff
        set user_id = coalesce(user_id, ${userId}),
            name = ${account.name},
            role = ${account.role},
            active = true
        where id = ${staff[0].id}
      `;
    } else {
      await sql`
        insert into staff (user_id, email, name, role, active)
        values (${userId}, ${email}, ${account.name}, ${account.role}, true)
      `;
    }
  }
  seeded = true;
}
