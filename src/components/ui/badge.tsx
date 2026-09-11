import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase",
  {
    variants: {
      tone: {
        slate: "border-slate-200 bg-slate-100 text-slate-600",
        blue: "border-sky-200 bg-sky-50 text-sky-700",
        teal: "border-teal-200 bg-teal-50 text-teal-700",
        amber: "border-amber-200 bg-amber-50 text-amber-700",
        orange: "border-orange-200 bg-orange-50 text-orange-700",
        rose: "border-rose-200 bg-rose-50 text-rose-700",
        green: "border-emerald-200 bg-emerald-50 text-emerald-700",
        violet: "border-violet-200 bg-violet-50 text-violet-700",
      },
    },
    defaultVariants: { tone: "slate" },
  },
);

export function Badge({
  className,
  tone,
  ...props
}: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
