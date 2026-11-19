"use client";

import { useEffect } from "react";
import { syncWishlist } from "@/app/(site)/actions";
import { useHydrated, useWishlist } from "./store";

/** Cliente connectée : fusionne une fois ses favoris du navigateur avec ceux de son compte. */
export function WishlistSync({ signedIn }: { signedIn: boolean }) {
  const hydrated = useHydrated();
  useEffect(() => {
    if (!signedIn || !hydrated) return;
    const { ids, setFromAccount } = useWishlist.getState();
    syncWishlist(ids)
      .then((merged) => merged && setFromAccount(merged))
      .catch(() => {});
  }, [signedIn, hydrated]);
  return null;
}
