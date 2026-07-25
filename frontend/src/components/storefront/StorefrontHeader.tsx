"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { PackageSearch, ShoppingBag, Store } from "lucide-react";

import { ensureCart } from "@/store/cartSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

export function StorefrontHeader() {
  const dispatch = useAppDispatch();
  const pathname = usePathname();
  const cart = useAppSelector((state) => state.cart.cart);
  const itemCount = cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  useEffect(() => {
    void dispatch(ensureCart());
  }, [dispatch]);

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--card-border)] bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/shop" className="flex items-center gap-2.5">
          <span className="brand-mark">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo.jpeg" alt="Classic Way logo" />
          </span>
          <span className="text-lg font-bold tracking-tight text-[var(--foreground)]">
            Classic Way
          </span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          <StoreNavLink href="/shop" active={pathname === "/shop"} icon={<Store size={16} />} label="Shop" />
          <StoreNavLink
            href="/shop/track"
            active={pathname.startsWith("/shop/track")}
            icon={<PackageSearch size={16} />}
            label="Track"
          />
          <Link
            href="/shop/cart"
            className={`relative flex items-center gap-1.5 border px-3 py-2 text-sm font-semibold transition ${
              pathname === "/shop/cart"
                ? "border-[var(--theme-green)] bg-[var(--theme-green-soft)] text-[var(--theme-green)]"
                : "border-[var(--card-border)] text-[var(--foreground)] hover:border-[var(--theme-green)] hover:text-[var(--theme-green)]"
            }`}
          >
            <ShoppingBag size={16} />
            <span className="hidden sm:inline">Cart</span>
            {itemCount > 0 && (
              <span className="grid size-5 place-items-center rounded-full bg-[var(--theme-green)] text-[11px] font-bold text-white">
                {itemCount}
              </span>
            )}
          </Link>
        </nav>
      </div>
    </header>
  );
}

function StoreNavLink({
  href,
  active,
  icon,
  label,
}: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-1.5 border px-3 py-2 text-sm font-semibold transition ${
        active
          ? "border-[var(--theme-green)] bg-[var(--theme-green-soft)] text-[var(--theme-green)]"
          : "border-transparent text-[var(--foreground)] hover:border-[var(--card-border)]"
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}
