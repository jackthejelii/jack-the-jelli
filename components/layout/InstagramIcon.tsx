/**
 * Authored rather than imported: lucide-react dropped every brand mark at v1,
 * so there is no `Instagram` export to use. Drawn to lucide's own spec (24px
 * box, 2px stroke, round caps and joins, `currentColor`) so it sits at the
 * same weight as `ArrowRight` and the rest of the icons already on the site.
 *
 * The rounded corners are the brand's, not the design system's. Everything
 * here is square by decision, but a recognisable mark drawn square stops being
 * the mark.
 */
export default function InstagramIcon({
  className,
  ...props
}: React.ComponentProps<"svg">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}
