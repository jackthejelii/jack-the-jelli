"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import AppLink from "@/components/layout/AppLink";
import Logo from "@/components/layout/Logo";
import { LEGAL_LINKS, NAV_LINKS } from "@/components/layout/nav-links";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

/**
 * Everything the drawer lists, as one flat array so the whole thing renders
 * through a single map and reads as one uniform column. Built at module scope
 * because it never changes between renders.
 *
 * The legal pair only appears here, never in the desktop bar: on a phone the
 * footer that normally carries them is several screens down.
 */
const DRAWER_LINKS = [...NAV_LINKS, ...LEGAL_LINKS];

/**
 * The small-screen half of the navigation. Hidden from `md` up, where the bar
 * shows only the primary destinations inline.
 *
 * Controlled rather than uncontrolled so a back-button navigation closes it
 * too: `SheetClose` only covers the taps that happen inside it.
 */
export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [lastPathname, setLastPathname] = useState(pathname);

  // Adjusted during render rather than in an effect: React's own answer for
  // state that has to follow a changing input, and it closes the drawer in the
  // same pass that the route changes instead of a frame later. `SheetClose`
  // already covers taps on the links themselves; this is what catches a back
  // or forward navigation made while the drawer is still open.
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpen(false);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label="Open menu"
        className="text-foreground hover:text-on-surface-variant focus-visible:outline-foreground ease-editorial -m-2 cursor-pointer p-2 transition-colors duration-(--motion-quick) focus-visible:outline-2 focus-visible:outline-offset-2 md:hidden"
      >
        <Menu className="size-6" aria-hidden="true" />
      </SheetTrigger>

      {/* Same override as the cart sheet: the primitive ships `ease-in-out`,
          which is the one curve the rest of the site never uses. */}
      <SheetContent
        side="left"
        className="bg-background ease-editorial w-full gap-0 border-r p-0 duration-300"
      >
        <SheetHeader className="border-outline-variant/20 border-b px-6 py-6">
          {/* The dialog still needs a name, but it should not spend a line of
              a phone screen saying "Menu" when the brand mark says where you
              are and doubles as the way home. Radix warns without a
              description too, and there is nothing to add that the links
              below do not already say. */}
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <SheetDescription className="sr-only">
            Links to the rest of the store.
          </SheetDescription>

          <SheetClose asChild>
            <AppLink
              href="/"
              aria-label="Jack The Jelli, home"
              className="block h-9 w-fit transition-opacity hover:opacity-80"
            >
              {/* The link is already named, so the image must not be. */}
              <Logo alt="" />
            </AppLink>
          </SheetClose>
        </SheetHeader>

        <nav className="flex flex-col px-6">
          {DRAWER_LINKS.map((link) => (
            <SheetClose asChild key={link.href}>
              <AppLink
                href={link.href}
                className="border-outline-variant/20 text-foreground hover:text-on-surface-variant ease-editorial border-b py-5 font-serif text-[22px] leading-tight tracking-tight transition-colors duration-(--motion-quick)"
              >
                {link.label}
              </AppLink>
            </SheetClose>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
