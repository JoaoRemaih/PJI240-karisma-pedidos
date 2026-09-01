import { type TextareaHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-24 w-full rounded-sm border border-line bg-paper px-3 py-2 text-sm text-ink",
      "placeholder:text-muted",
      "focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-navy",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
