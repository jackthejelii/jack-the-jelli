import { Suspense } from "react";
import AppLink from "@/components/layout/AppLink";
import Logo from "@/components/layout/Logo";
import UserMenu from "@/components/layout/UserMenu";
import CartButton from "@/features/cart/components/CartButton";
import CartSessionSync from "@/features/cart/components/CartSessionSync";
import CartSheet from "@/features/cart/components/CartSheet";

/**
 * A server component: the blurred background is unconditional now, so nothing
 * here needs scroll position or any other browser state. Every interactive
 * piece below (UserMenu, CartButton, CartSheet, CartSessionSync) carries its
 * own "use client", and they coordinate through the module-level cart store
 * rather than a shared context, so each can be its own client root.
 */
export default function NavBar() {
  return (
    <nav className="border-border scrollbar-lock-safe bg-background/60 fixed inset-x-0 top-0 z-50 h-24 border-b backdrop-blur-md">
      <div className="relative mx-auto flex h-full max-w-360 items-center justify-center px-5 md:px-16">
        <AppLink
          href="/"
          aria-label="Jack The Jelli — Home"
          className="block h-10 transition-opacity hover:opacity-80 md:h-12"
        >
          {/* The link already carries the brand name. */}
          <Logo priority alt="" />
        </AppLink>

        <div className="absolute right-5 flex items-center gap-4 md:right-16 md:gap-6">
          <UserMenu />
          {/* The cart lives in a localStorage-backed store, so it is browser
              state by definition and can never be part of a prerendered shell.
              Under Cache Components that has to be said out loud: without this
              boundary the whole nav — and with it every page that renders it —
              is held back from prerendering. The fallback reserves the
              button's exact footprint so the bar doesn't reflow when the real
              count arrives. */}
          <Suspense fallback={<div className="size-6" aria-hidden />}>
            <CartButton />
          </Suspense>
        </div>
      </div>

      {/* Mounted here rather than per page so the sheet's open state and its
          revalidation survive client navigations. Closed, it renders nothing,
          so it needs no placeholder. */}
      <Suspense fallback={null}>
        <CartSheet />
      </Suspense>

      {/* Renders nothing. Here for the same reason: the cart has to be checked
          against the live session on every route, not just the ones that
          happen to show it. */}
      <Suspense fallback={null}>
        <CartSessionSync />
      </Suspense>
    </nav>
  );
}
