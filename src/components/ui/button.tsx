import { type ButtonHTMLAttributes, forwardRef } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm font-semibold transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy min-h-11 px-4 text-sm",
  {
    variants: {
      variant: {
        lime: "bg-lime text-ink uppercase tracking-wide hover:bg-lime-hover",
        navy: "bg-navy text-paper hover:bg-navy-dark",
        outline:
          "border-2 border-navy bg-transparent text-navy hover:bg-navy hover:text-paper",
        ghost: "text-navy hover:bg-navy/10",
        danger: "bg-danger text-paper hover:opacity-90",
      },
      size: {
        default: "min-h-11",
        sm: "min-h-9 px-3 text-xs",
        lg: "min-h-12 px-6",
      },
    },
    defaultVariants: { variant: "lime", size: "default" },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
