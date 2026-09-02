# Karisma Pedidos

Sistema web da loja Karisma Uniformes (Novo Horizonte/SP) para o PJI240 da Univesp.

O site público mostra a loja. O login é só da equipe: atendimento lança pedido, produção atualiza status e a administração cuida de estoque, catálogo e relatórios. Cliente final não cria conta.

## Como rodar

```bash
npm install
npm run dev
```

Login em `/login` (link discreto no rodapé).

## Publicar

1. Código no GitHub
2. Banco Postgres no [Neon](https://neon.tech)
3. Site na [Vercel](https://vercel.com) com as variáveis:
   - `DATABASE_URL`
   - `BETTER_AUTH_SECRET`
   - `BETTER_AUTH_URL` (URL do site)
   - `VITE_AUTH_ENABLED=true`

No ar, o primeiro acesso em `/login` cria o administrador. Os demais e-mails são liberados em Equipe.
