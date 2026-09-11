import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn, initials } from "@/lib/utils";

export function Avatar({
  name,
  src,
  className,
}: {
  name: string;
  src?: string | null;
  className?: string;
}) {
  return (
    <AvatarPrimitive.Root
      className={cn(
        "inline-flex h-8 w-8 shrink-0 overflow-hidden rounded-full border border-white/10 bg-teal-700 text-white",
        className,
      )}
    >
      <AvatarPrimitive.Image src={src ?? undefined} alt={name} className="h-full w-full object-cover" />
      <AvatarPrimitive.Fallback className="flex h-full w-full items-center justify-center text-[11px] font-semibold">
        {initials(name)}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}
