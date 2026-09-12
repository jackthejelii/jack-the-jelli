"use client";

import AppLink from "@/components/layout/AppLink";
import React from "react";
import { usePathname } from "next/navigation";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Menu,
  LayoutDashboard,
  Package,
  Truck,
  Users,
  Settings,
} from "lucide-react";
import Logo from "@/components/layout/Logo";

const navItems = [
  { label: "Sales Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Products Control", href: "/admin/products", icon: Package },
  { label: "Logistics", href: "/admin/logistics", icon: Truck },
  { label: "Customers", href: "/admin/customers", icon: Users },
  { label: "Settings", href: "/admin/settings", icon: Settings },
] as const;

// Shared nav items renderer — used by both desktop sidebar and mobile drawer
function NavItems() {
  const pathname = usePathname();

  // Determine which nav item is active for the current pathname
  let activeHref: string | null = null;
  if (pathname) {
    // 1. Exact match first
    const exact = navItems.find((i) => i.href === pathname);
    if (exact) activeHref = exact.href;
    // 2. Longest prefix match (e.g. /admin/orders/... → /admin)
    else {
      let longest = "";
      for (const i of navItems) {
        if (
          pathname.startsWith(i.href + "/") &&
          i.href.length > longest.length
        ) {
          longest = i.href;
        }
      }
      // /admin/products/* → Products Control
      if (pathname.startsWith("/admin/products")) {
        activeHref = "/admin/products";
      }
      if (longest) activeHref = longest;
    }
  }

  return (
    <div
      data-lenis-prevent
      className="flex flex-1 flex-col gap-2 overflow-y-auto px-2"
    >
      {navItems.map((item) => {
        const isActive = activeHref === item.href;
        return (
          <AppLink
            key={item.href}
            href={item.href}
            className={`group flex items-center gap-4 py-3 pl-4 transition-all duration-300 ${
              isActive
                ? "text-primary border-primary translate-x-1 border-l-2 font-semibold"
                : "text-on-surface-variant hover:bg-surface-container-highest"
            }`}
          >
            {React.createElement(item.icon, { className: "size-4" })}
            <span className="text-[12px] leading-none font-(--font-inter) tracking-widest uppercase">
              {item.label}
            </span>
          </AppLink>
        );
      })}
    </div>
  );
}

// Shared "View Storefront" link — used by both desktop sidebar and mobile drawer
function ViewStorefrontButton() {
  return (
    <div className="px-4 pb-8">
      <Button
        asChild
        variant="outline"
        className="border-primary text-primary hover:bg-primary hover:text-primary-foreground w-full justify-center rounded-none border px-4 py-5 text-[11px] font-(--font-inter) tracking-[0.18em] uppercase transition-colors"
      >
        <AppLink href="/">View Storefront</AppLink>
      </Button>
    </div>
  );
}

export default function AdminSidebar() {
  return (
    <>
      {/* ── Mobile hamburger trigger ─────────────────────────── */}
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            className="bg-background border-outline-variant/20 hover:bg-surface-container fixed top-4 left-4 z-50 size-10 rounded-none border p-0 md:hidden"
          >
            <Menu className="text-on-surface-variant size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent
          side="left"
          className="border-outline-variant/20 w-60 rounded-none border-r p-0"
        >
          {/* Mobile drawer header */}
          <div className="mx-auto mt-12 w-32">
            <Logo />
          </div>

          {/* Mobile nav items */}
          <NavItems />

          <ViewStorefrontButton />
        </SheetContent>
      </Sheet>

      {/* ── Desktop sidebar (hidden on mobile) ───────────────── */}
      <nav className="bg-surface-container-low border-outline-variant/20 fixed top-0 left-0 z-40 hidden h-screen w-64 flex-col gap-8 border-r py-2 md:flex">
        <div className="mx-auto mt-12 w-32">
          <Logo priority />
        </div>

        <NavItems />

        <ViewStorefrontButton />
      </nav>
    </>
  );
}
