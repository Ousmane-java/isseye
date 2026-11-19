"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { CartLineInput } from "@/lib/cart-types";
import { useCart } from "./store";

export function RestoreCart({ lines }: { lines: CartLineInput[] }) {
  const replace = useCart((s) => s.replace);
  const router = useRouter();
  useEffect(() => {
    replace(lines);
    router.replace("/panier");
  }, [lines, replace, router]);
  return (
    <div className="page-top grid min-h-[50vh] place-items-center">
      <Loader2 className="size-6 animate-spin text-or" />
    </div>
  );
}
