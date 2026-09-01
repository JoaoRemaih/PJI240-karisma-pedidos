# Karisma Pedidos

Sistema web interno da loja **Karisma Uniformes** (Novo Horizonte/SP) para o 2º Projeto Integrador (PJI240) — Univesp, polo Novo Horizonte.

O site público apresenta a loja. **Só a equipe entra**: atendimento lança pedido, produção muda status, administração cuida de estoque, equipe e relatórios. Cliente final não cria conta e não lança pedido.

## O que o sistema faz

1. Atendimento cadastra o cliente e lança o pedido no padrão da loja — peça, tamanho, cor, tecido e estampa do catálogo (combinação inválida não passa).
2. Produção vê a fila: **recebido → em produção → pronto → retirado**.
3. Ao ir para *em produção*, o estoque do material baixa. Se ficar abaixo do mínimo, aparece alerta. Pedidos **recebidos** ainda não baixam — mas o tecido já conta como comprometido. Uniforme escolar soma os pedidos pequenos e avisa na temporada (volta às aulas, inverno, reposição).
4. Administração acompanha estoque, equipe e relatórios.

## Perfis

| Perfil | Pode |
| --- | --- |
| Atendimento | Clientes, novo pedido, lista, marcar retirada |
| Produção | Fila e mudança de status (baixa de estoque) |
| Administração | Tudo o anterior + estoque, relatórios e equipe |

O **primeiro acesso** vira administração. Os demais e-mails são liberados em Equipe.

## Segurança

- Login só da loja. Depois do primeiro acesso, e-mail solto **não entra** — precisa estar cadastrado em Equipe.
- Cada perfil é barrado no servidor, não só no menu. Atendimento não muda estoque; produção não cadastra cliente nem vê telefone.
- Senha com no mínimo 8 caracteres, letra e número. O último administrador não pode ser desativado.
- Pedido e estoque usam trava no banco: duas pessoas não baixam o mesmo metro duas vezes.
- Consulta de CEP autenticada no cadastro; a rota pública tem limite por minuto.

## Requisitos do PJI cobertos

| Requisito | Onde está |
| --- | --- |
| Framework web | React 19 + TanStack Start |
| Banco de dados | PostgreSQL (Neon em nuvem; PGLite no desenvolvimento) |
| Script web (JavaScript) | TypeScript compilado para JS no navegador |
| Nuvem | Deploy automático (Vercel) |
| Uso de API | ViaCEP (`/api/cep/:cep` e consulta no cadastro de cliente) |
| Acessibilidade | `lang=pt-BR`, skip link, rótulos, foco visível, contraste, `aria-live` |
| Controle de versão | Git |
| Testes | `npm test` — transições, estoque, CEP, perfis, catálogo, demanda escolar, acesso |
| Análise de dados | Tela Relatórios (status, peças, sazonalidade escolar × demais) |
| Segurança | Login da equipe, convite, perfis no servidor, trava de estoque |

## Como rodar

```bash
npm install
npm run dev
```

Abra o endereço que o terminal mostrar. A home é a vitrine da loja. O login da equipe fica em `/login` (ponto discreto no rodapé). Use um dos acessos de teste (senha **Karisma1**):

| Perfil | E-mail |
| --- | --- |
| Administração | admin@karisma.local |
| Atendimento | atendimento@karisma.local |
| Produção | producao@karisma.local |

```bash
npm test          # testes automatizados
npm run typecheck # tipos
npm run build     # build de produção
```

## API ViaCEP

`GET /api/cep/14960000` devolve o endereço de Novo Horizonte (com limite de consultas). No cadastro de cliente, sair do campo CEP dispara a consulta autenticada.

## Publicar o site

O ambiente de desenvolvimento usa um banco local que zera ao recomeçar. **Não deixe a loja rodando só nisso.**

O caminho natural deste projeto:

1. **Site:** Vercel (já é o destino do build).
2. **Banco:** Neon (Postgres). Pedidos, estoque, equipe e **comprovantes de pagamento** ficam no banco — não em arquivo solto no preview.
3. No deploy, a plataforma injeta `DATABASE_URL` e o login de verdade.

### Onde ficam os comprovantes

Hoje o comprovante da retirada é gravado **junto do pedido no Postgres** (foto/PDF até 800 KB). Quando você publicar no Neon, esses arquivos vão com a loja.

Se a loja crescer e os arquivos pesarem:

- [Cloudflare R2](https://www.cloudflare.com/developer-platform/r2/) ou [Amazon S3](https://aws.amazon.com/s3/) para as fotos
- O pedido no Neon guarda só o link do arquivo

Para o PJI e o dia a dia da Karisma, Neon + comprovante no banco basta.

### Como ir ao ar

1. Conta no [Vercel](https://vercel.com) e no [Neon](https://neon.tech).
2. Suba o código (GitHub) e conecte o projeto na Vercel.
3. Cole a `DATABASE_URL` do Neon nas variáveis de ambiente.
4. As migrations (`migrations/*.sql`) sobem no `npm run build`.

Depois disso a base cresce no Neon (plano gratuito já segura o piloto da loja; se precisar de mais, o plano pago do Neon escala).
