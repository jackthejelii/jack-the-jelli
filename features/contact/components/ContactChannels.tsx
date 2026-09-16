import { ArrowRight } from "lucide-react";
import { sectionHeadingClassName } from "@/features/checkout/lib/checkout-form";
import { getSettings } from "@/lib/settings";
import { formatBdPhone } from "@/features/orders/lib/phone";

interface Channel {
  label: string;
  /** The address itself, shown at full size. It is the content, not a caption. */
  value: string;
  detail: string;
  href: string;
  external: boolean;
}

/**
 * Two channels, not four. WhatsApp is gone from the product entirely, and the
 * email address came out because the form directly above it does the same job
 * without making anyone leave the page and open a mail client.
 *
 * What is left is the pair the form cannot replace: a number for someone who
 * wants to speak to a person now, and the account they probably arrived from.
 *
 * Rendered as a ruled index rather than cards. Same information, but a card
 * would frame each channel as an offer to consider; a ruled row reads as a
 * directory entry, which is what someone looking for a phone number wants.
 *
 * A function of the shop's settings rather than a module constant: both the
 * number and the handle are editable from /admin/settings, and a constant
 * built at module load would be whichever values the server booted with.
 */
function channels(contactPhone: string, instagram: string): Channel[] {
  return [
    {
      label: "Phone",
      value: formatBdPhone(contactPhone),
      detail: "Speak to someone directly",
      href: `tel:${contactPhone}`,
      external: false,
    },
    {
      label: "Instagram",
      value: `@${instagram}`,
      detail: "Send us a DM",
      href: `https://instagram.com/${instagram}`,
      external: true,
    },
  ];
}

export default async function ContactChannels() {
  const { contactPhone, instagram } = await getSettings();
  const CHANNELS = channels(contactPhone, instagram);

  return (
    <nav aria-labelledby="channels-heading">
      <h2 id="channels-heading" className={sectionHeadingClassName}>
        Rather talk to us
      </h2>

      {/* Deliberately not wrapped in Reveal: a link that depends on an
          IntersectionObserver having run is a link that can fail to appear,
          which is the same reason the homepage keeps its CTAs outside it. */}
      <ul className="border-outline-variant/20 mt-6 grid grid-cols-1 border-t sm:grid-cols-2">
        {CHANNELS.map((channel) => (
          <li
            key={channel.label}
            className="border-outline-variant/20 border-b sm:[&:nth-child(odd)]:border-r"
          >
            <a
              href={channel.href}
              {...(channel.external
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
              className="hover:bg-muted focus-visible:outline-foreground ease-editorial group flex h-full min-h-32 flex-col justify-between gap-4 p-6 transition-colors duration-(--motion-quick) focus-visible:outline-2 focus-visible:-outline-offset-2 md:p-8"
            >
              <span className="text-on-surface-variant text-[12px] font-semibold tracking-[0.1em] uppercase">
                {channel.label}
              </span>

              <span className="flex items-end justify-between gap-4">
                <span className="flex flex-col gap-1">
                  <span className="text-foreground font-serif text-[18px] leading-tight break-all">
                    {channel.value}
                  </span>
                  <span className="text-on-surface-variant text-[14px] leading-relaxed">
                    {channel.detail}
                  </span>
                </span>
                <ArrowRight
                  aria-hidden="true"
                  className="text-on-surface-variant ease-editorial size-4 shrink-0 translate-y-[-2px] transition-transform duration-(--motion-quick) group-hover:translate-x-1"
                />
              </span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
