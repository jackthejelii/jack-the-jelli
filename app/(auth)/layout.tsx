import Link from "next/link";
import Logo from "@/components/layout/Logo";

/**
 * Minimal chrome for register/login — just the mark and a way back to the
 * shop, not the full storefront NavBar (cart, search, category nav aren't
 * relevant mid-auth-flow). Mirrors how /admin opts out of (storefront)'s
 * layout via route group rather than a pathname check.
 *
 * On desktop this splits into a two-part screen: a branded panel on the
 * left, the form on the right. Below `lg` there's no room for that, so it
 * collapses back to the original single centered column with the mark up
 * top.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex-1 lg:grid lg:h-dvh lg:grid-cols-2">
      <div className="border-border bg-background relative hidden overflow-hidden lg:flex lg:flex-col lg:items-center lg:justify-center lg:border-r">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.04)_100%)]"
        />
        <div className="relative z-10 flex flex-col items-center gap-6 px-12 text-center">
          <Link href="/" className="h-16 w-auto">
            <Logo priority />
          </Link>
          <div>
            <h1 className="font-serif text-5xl tracking-tight xl:text-6xl">
              Jack The Jelli
            </h1>
            <p className="text-muted-foreground mt-4 text-xs tracking-[0.3em] uppercase">
              They’re Jelly of the Gear
            </p>
          </div>
        </div>
      </div>

      <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-12 px-6 py-16 lg:h-dvh lg:overflow-y-auto">
        <Link
          href="/"
          className="flex flex-col items-center gap-3 text-center lg:hidden"
        >
          <div className="h-10 w-auto">
            <Logo alt="" />
          </div>
          <div>
            <span className="font-serif text-xl tracking-tight">
              Jack The Jelli
            </span>
            <p className="text-muted-foreground mt-1 text-[10px] tracking-[0.25em] uppercase">
              They’re Jelly of the Gear
            </p>
          </div>
        </Link>
        {children}
      </div>
    </div>
  );
}
