import Link from "next/link";
import Logo from "@/components/layout/Logo";

const supportLinks = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
];

export default function Footer() {
  return (
    <footer className="border-t border-[rgba(138,121,104,0.2)]">
      <div className="mx-auto max-w-360 px-5 pt-10 pb-4 md:px-16 md:pt-16 md:pb-8">
        {/* Centered: logo */}
        <div className="flex justify-center">
          <Link href="#" className="w-30 transition-opacity hover:opacity-80">
            <Logo priority />
          </Link>
        </div>

        {/* Centered: tagline */}
        <p className="text-on-surface-variant mt-4 text-center text-[14px] leading-relaxed tracking-wider">
          Handmade leather goods, and the second looks that follow.
        </p>

        {/* Centered: support links + copyright */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {supportLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-on-surface-variant hover:text-foreground text-[14px] leading-relaxed transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <span className="text-on-surface-variant text-[10px] font-semibold tracking-[0.25em] uppercase">
            © 2026 JACK THE JELLI
          </span>
        </div>
      </div>
    </footer>
  );
}
