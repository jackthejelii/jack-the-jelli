import Link from "next/link";

import Logo from "@/components/layout/Logo";
import { cn } from "@/lib/utils";

/**
 * The single screen behind every `not-found.tsx` and `error.tsx` in the app.
 *
 * It carries no `"use client"` directive on purpose: it holds no state and
 * touches no server-only API, so the Server Component boundaries (`not-found`)
 * and the Client Component ones (`error`) can both import it without Next
 * shipping two copies of the markup.
 *
 * Note for whoever enables dark mode: `--on-surface-variant` is never
 * redefined in the `.dark` block of `app/globals.css`, so the body copy here
 * would render #444748 on #1a1a1a. That gap is app-wide, not specific to this
 * component, but this is where it will be most visible.
 */

/**
 * The storefront's bordered uppercase control, shared by links and buttons so
 * the class string exists once. Kept as a plain string rather than a wrapper
 * component so Server Components can spread it onto a `<Link>` and Client
 * Components onto a `<button onClick>` without any client/server friction.
 */
export const messageScreenActionClass =
  "border-foreground text-foreground hover:bg-foreground hover:text-background focus-visible:outline-foreground inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-none border bg-transparent px-10 py-4 text-[12px] font-semibold tracking-widest uppercase transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-4";

interface MessageScreenProps {
  /** Small uppercase label above the title — "404", "Error". */
  eyebrow?: string;
  title: string;
  description?: React.ReactNode;
  /** One or more controls using `messageScreenActionClass`. */
  actions?: React.ReactNode;
  /**
   * `admin` swaps the serif editorial scale for the sidebar's
   * `font-heading tracking-widest` voice used across `app/admin/**`.
   */
  variant?: "editorial" | "admin";
  /**
   * Adds the centred brand mark and fills the viewport. For the root
   * boundaries, which render inside `app/layout.tsx` with no nav or footer.
   */
  standalone?: boolean;
  /**
   * Announce the screen when it replaces content client-side. Error boundaries
   * only — a 404 is page content, not an interruption.
   */
  live?: "alert";
  className?: string;
}

export default function MessageScreen({
  eyebrow,
  title,
  description,
  actions,
  variant = "editorial",
  standalone = false,
  live,
  className,
}: MessageScreenProps) {
  const isAdmin = variant === "admin";

  const content = (
    <div
      role={live}
      className={cn(
        "text-center",
        standalone
          ? "mx-auto max-w-xl"
          : isAdmin
            ? // The admin layout already supplies its own page padding.
              "mx-auto max-w-2xl py-24"
            : "mx-auto max-w-360 px-5 py-40 md:px-16",
        className,
      )}
    >
      {eyebrow ? (
        <p className="text-on-surface-variant text-[12px] font-semibold tracking-widest uppercase">
          {eyebrow}
        </p>
      ) : null}

      <h1
        className={cn(
          "text-foreground",
          eyebrow && "mt-4",
          isAdmin
            ? "font-heading text-3xl tracking-widest"
            : "font-serif text-[40px] leading-[1.2] md:text-[56px] md:leading-[1.1]",
        )}
      >
        {title}
      </h1>

      {description ? (
        <p className="text-on-surface-variant mx-auto mt-4 max-w-xl text-[16px] leading-[1.6]">
          {description}
        </p>
      ) : null}

      {actions ? (
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          {actions}
        </div>
      ) : null}
    </div>
  );

  if (!standalone) return content;

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-12 px-6 py-24">
      {/* `alt=""` because the link is already labelled below. */}
      <Link href="/" className="flex flex-col items-center">
        <div className="h-10 w-auto">
          <Logo alt="" />
        </div>
        <span className="sr-only">Jack The Jelli: return home</span>
      </Link>
      {content}
    </div>
  );
}
