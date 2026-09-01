import { cn } from "@/lib/utils";

export function Logo({
  className,
  dark = false,
}: {
  className?: string;
  dark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <img
        src="/brand/logo.png"
        alt="Karisma Uniformes"
        className={cn("h-8 w-auto max-w-[9rem] sm:h-10", dark && "brightness-0 invert")}
        width={180}
        height={40}
      />
    </span>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-baseline gap-2", className)}>
      <span className="font-display text-3xl font-bold leading-none text-lime">
        K
      </span>
      <span className="font-display text-xl font-bold tracking-wide text-navy">
        KARISMA
        <span className="ml-2 text-sm font-semibold tracking-widest text-navy/70">
          PEDIDOS
        </span>
      </span>
    </span>
  );
}
