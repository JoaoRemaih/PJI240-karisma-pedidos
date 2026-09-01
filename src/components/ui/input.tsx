import { type InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "flex min-h-11 w-full rounded-sm border border-line bg-paper px-3 py-2 text-sm text-ink",
        "placeholder:text-muted",
        "focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-navy",
        "disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
