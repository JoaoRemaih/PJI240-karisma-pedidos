import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import {
  Briefcase,
  Check,
  Clock,
  GraduationCap,
  Shirt,
  Sparkles,
  Trophy,
} from "lucide-react";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <div className="bg-paper">
      <SiteHeader />
      <main id="conteudo">
        <Hero />
        <ClientsStrip />
        <ServiceBlock
          id="empresas"
          title="Uniformes Corporativos"
          subtitle="Reforce a imagem profissional da sua equipe com uniformes que unem conforto, durabilidade e design alinhado à sua marca."
          heading="Soluções para seu negócio"
          items={[
            {
              icon: Briefcase,
              title: "Uniformes administrativos",
              text: "Camisas sociais e calças que transmitem seriedade e profissionalismo.",
            },
            {
              icon: Shirt,
              title: "Uniformes operacionais",
              text: "Peças resistentes para produção, logística, limpeza e manutenção.",
            },
            {
              icon: Sparkles,
              title: "Serviços e varejo",
              text: "Recepção, vendas e atendimento com a identidade visual da empresa.",
            },
          ]}
          images={[
            ["/uniforms/uni_01.jpg", "Uniforme corporativo polo"],
            ["/uniforms/uni_02.jpg", "Uniforme corporativo operacional"],
            ["/uniforms/uni_03.jpg", "Equipe uniformizada"],
            ["/uniforms/uni_04.jpg", "Detalhe de uniforme corporativo"],
          ]}
          cta="Falar sobre empresas"
          reverse={false}
        />
        <ServiceBlock
          id="escolas"
          title="Uniformes Escolares"
          subtitle="Segurança, conforto e padronização para alunos de todas as idades, com tecidos de alta durabilidade para o dia a dia."
          heading="Linha completa para instituições de ensino"
          items={[
            {
              icon: GraduationCap,
              title: "Ensino infantil ao médio",
              text: "Camisetas, calças, bermudas e agasalhos resistentes à rotina escolar.",
            },
            {
              icon: Shirt,
              title: "Uniformes de professores",
              text: "Jalecos e peças que identificam e valorizam o corpo docente.",
            },
            {
              icon: Trophy,
              title: "Equipes esportivas escolares",
              text: "Kits para futsal, vôlei, basquete e outras modalidades.",
            },
          ]}
          images={[
            ["/uniforms/esc_01.png", "Uniforme escolar"],
            ["/uniforms/esc_02.png", "Agasalho escolar"],
            ["/uniforms/esc_03.png", "Camiseta escolar"],
            ["/uniforms/escolar.png", "Linha escolar Karisma"],
          ]}
          cta="Falar sobre escolas"
          reverse
          altBg
        />
        <ServiceBlock
          id="eventos"
          title="Eventos e Esportivo"
          subtitle="Destaque sua equipe ou evento com uniformes personalizados e tecidos tecnológicos."
          heading="Performance e visibilidade"
          items={[
            {
              icon: Sparkles,
              title: "Uniformes para eventos",
              text: "Camisetas, coletes e abadás para feiras, congressos e ações promocionais.",
            },
            {
              icon: Trophy,
              title: "Uniformes esportivos",
              text: "Dry-fit, proteção UV e design exclusivo para times e atletas.",
            },
            {
              icon: Shirt,
              title: "Sublimação total",
              text: "Estampas sem limite de cores, com alta definição e durabilidade.",
            },
          ]}
          images={[
            ["/uniforms/ev_01.jpg", "Uniforme esportivo"],
            ["/uniforms/ev_02.jpg", "Camisa de time"],
            ["/uniforms/ev_03.jpg", "Kit evento"],
            ["/uniforms/ev_04.jpg", "Sublimação"],
          ]}
          cta="Falar sobre eventos"
          reverse={false}
        />
        <Why />
        <Contact />
      </main>
      <SiteFooter />
    </div>
  );
}

function Hero() {
  return (
    <section id="hero" className="relative min-h-[100svh] overflow-hidden">
      <img
        src="/brand/hero.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-navy/85 via-navy/55 to-navy/25" />
      <div className="relative mx-auto flex min-h-[100svh] max-w-[1100px] flex-col justify-center gap-10 px-5 py-24 lg:flex-row lg:items-center lg:gap-12">
        <div className="max-w-xl text-paper">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-lime">
            Novo Horizonte · SP
          </p>
          <h1 className="font-display text-4xl font-bold leading-tight text-paper sm:text-5xl">
            Uniformes que vestem a identidade da sua marca
          </h1>
          <p className="mt-4 text-lg text-paper/90">
            Qualidade, personalização e pontualidade na confecção de uniformes
            para empresas, escolas, eventos e equipes esportivas.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#contato">
              <Button variant="lime" size="lg">
                Solicite um orçamento
              </Button>
            </a>
            <a href="#empresas">
              <Button
                variant="outline"
                size="lg"
                className="border-paper text-paper hover:bg-paper hover:text-navy"
              >
                Ver linhas
              </Button>
            </a>
          </div>
        </div>
        <div className="w-full max-w-md rounded-md bg-paper p-6 shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
          <QuoteCard />
        </div>
      </div>
    </section>
  );
}

function QuoteCard() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const text = [
      "Olá, gostaria de um orçamento.",
      `Nome: ${name.trim()}`,
      `Telefone: ${phone.trim()}`,
      email.trim() ? `E-mail: ${email.trim()}` : null,
      message.trim() ? `Pedido: ${message.trim()}` : null,
    ]
      .filter(Boolean)
      .join("\n");
    window.open(
      `https://wa.me/5517992021743?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <h2 className="font-display text-xl text-navy">Vamos começar seu projeto?</h2>
      <p className="text-sm text-muted">
        Preencha para receber um contato. Nossa equipe retorna com o orçamento.
      </p>
      <div>
        <Label htmlFor="quote-name">Nome</Label>
        <Input
          id="quote-name"
          name="name"
          autoComplete="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="quote-phone">Telefone</Label>
        <Input
          id="quote-phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="quote-email">E-mail</Label>
        <Input
          id="quote-email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="quote-message">O que você precisa?</Label>
        <textarea
          id="quote-message"
          name="message"
          rows={3}
          className="flex w-full rounded-sm border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-navy"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>
      <Button type="submit" className="w-full" size="lg">
        Solicitar orçamento
      </Button>
    </form>
  );
}

function ClientsStrip() {
  return (
    <section aria-label="Clientes" className="border-b border-line bg-mist py-8">
      <div className="mx-auto max-w-[1100px] px-5">
        <img
          src="/brand/clientes.png"
          alt="Marcas atendidas pela Karisma Uniformes"
          className="mx-auto max-h-16 w-full max-w-3xl object-contain opacity-80"
        />
      </div>
    </section>
  );
}

function ServiceBlock({
  id,
  title,
  subtitle,
  heading,
  items,
  images,
  cta,
  reverse,
  altBg,
}: {
  id: string;
  title: string;
  subtitle: string;
  heading: string;
  items: { icon: typeof Shirt; title: string; text: string }[];
  images: [string, string][];
  cta: string;
  reverse: boolean;
  altBg?: boolean;
}) {
  return (
    <section id={id} className={altBg ? "bg-mist py-16" : "bg-paper py-16"}>
      <div className="mx-auto max-w-[1100px] px-5">
        <h2 className="text-center font-display text-3xl sm:text-4xl">{title}</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-muted">{subtitle}</p>
        <div
          className={`mt-10 grid items-start gap-10 lg:grid-cols-2 ${reverse ? "lg:[&>*:first-child]:order-2" : ""}`}
        >
          <div>
            <h3 className="mb-5 font-display text-xl">{heading}</h3>
            <ul className="space-y-5">
              {items.map((item) => (
                <li key={item.title} className="flex gap-3">
                  <item.icon className="mt-0.5 size-6 shrink-0 text-lime-ink" aria-hidden />
                  <div>
                    <p className="font-display font-semibold text-navy">{item.title}</p>
                    <p className="text-sm text-muted">{item.text}</p>
                  </div>
                </li>
              ))}
            </ul>
            <a href="#contato" className="mt-8 inline-block">
              <Button variant="outline">{cta}</Button>
            </a>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {images.map(([src, alt]) => (
              <img
                key={src}
                src={src}
                alt={alt}
                className="h-40 w-full rounded-md object-cover sm:h-48"
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Why() {
  const items = [
    {
      icon: Check,
      title: "Qualidade superior",
      text: "Melhores tecidos e costura para uniformes duráveis e confortáveis.",
    },
    {
      icon: Sparkles,
      title: "Personalização completa",
      text: "Projetos que traduzem a identidade visual da sua marca.",
    },
    {
      icon: Clock,
      title: "Pontualidade na entrega",
      text: "Compromisso com o prazo combinado — do pedido à retirada.",
    },
  ];
  return (
    <section className="bg-mist py-16">
      <div className="mx-auto max-w-[1100px] px-5">
        <h2 className="text-center font-display text-3xl">Por que escolher a Karisma?</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.title}
              className="rounded-lg border border-line bg-paper p-6 text-center"
            >
              <item.icon className="mx-auto size-8 text-lime-ink" aria-hidden />
              <h3 className="mt-3 font-display text-lg">{item.title}</h3>
              <p className="mt-2 text-sm text-muted">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Contact() {
  return (
    <section id="contato" className="bg-paper py-16">
      <div className="mx-auto max-w-[1100px] px-5 text-center">
        <h2 className="font-display text-3xl">Vamos começar seu projeto?</h2>
        <p className="mx-auto mt-3 max-w-xl text-muted">
          Fale conosco pelo WhatsApp ou visite a loja em Novo Horizonte.
          Atendemos empresas, escolas e equipes esportivas.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <a
            href="https://wa.me/5517992021743"
            target="_blank"
            rel="noreferrer"
          >
            <Button variant="lime" size="lg">
              WhatsApp (17) 99202-1743
            </Button>
          </a>
        </div>
        <address className="mt-8 not-italic text-sm text-muted">
          Av. Cel. Junqueira, 400 — Novo Horizonte, SP, 14960-000
          <br />
          contato@karismauniformes.com.br
        </address>
      </div>
    </section>
  );
}
