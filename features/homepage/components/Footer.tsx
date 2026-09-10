import Link from "next/link";
import Logo from "@/components/layout/Logo";
import Reveal from "@/components/layout/Reveal";
import InstagramIcon from "@/components/layout/InstagramIcon";
import { LEGAL_LINKS } from "@/components/layout/nav-links";
import { LEGAL_INFO } from "@/features/legal/lib/legal-info";

const footerLinkClassName =
  "text-on-surface-variant hover:text-foreground text-[14px] leading-relaxed transition-colors";

/**
 * Navigation moved to the nav bar, where it is reachable from every page
 * without scrolling. What is left here is the footnote material: the one place
 * to follow the brand, and the two documents nobody reads until they need to.
 */
export default function Footer() {
  return (
    <footer className="border-t border-[rgba(138,121,104,0.2)]">
      {/* Takes over the container's classes rather than wrapping it, so the
          footer keeps the same DOM it had. The whole block arrives as one
          piece: it is a sign-off, not a sequence. */}
      <Reveal className="mx-auto max-w-360 px-5 pt-10 pb-4 md:px-16 md:pt-16 md:pb-8">
        {/* Centered: logo */}
        <div className="flex justify-center">
          <Link href="/" className="w-30 transition-opacity hover:opacity-80">
            <Logo priority />
          </Link>
        </div>

        {/* Centered: tagline */}
        <p className="text-on-surface-variant mt-4 text-center text-[14px] leading-relaxed tracking-wider">
          Handmade leather goods, and the second looks that follow.
        </p>

        {/* Centered: one row for everything that is not the brand itself.
            The negative margin cancels the padding, so the link's layout box
            is exactly the icon's 20px while the tap target stays 36px. Without
            it the icon would sit noticeably further from its neighbours than
            the text links sit from each other. */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          <a
            href={`https://instagram.com/${LEGAL_INFO.instagram}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Jack The Jelli on Instagram, @${LEGAL_INFO.instagram}`}
            className="text-on-surface-variant hover:text-foreground focus-visible:outline-foreground ease-editorial -m-2 p-2 transition-colors duration-(--motion-quick) focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <InstagramIcon className="size-5" />
          </a>

          {LEGAL_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className={footerLinkClassName}
            >
              {link.label}
            </Link>
          ))}
          <span className="text-on-surface-variant text-[10px] font-semibold tracking-[0.25em] uppercase">
            © 2026 JACK THE JELLI
          </span>
        </div>
      </Reveal>
    </footer>
  );
}
