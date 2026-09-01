import { type SelectHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "flex min-h-11 w-full rounded-sm border border-line bg-paper px-3 text-sm text-ink",
      "focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-navy",
      className,
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";
