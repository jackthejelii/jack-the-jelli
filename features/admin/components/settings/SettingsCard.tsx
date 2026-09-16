import { Button } from "@/components/ui/button";

/**
 * The chrome every settings tab shares: a heading, a sentence saying what the
 * fields underneath actually affect, the fields, and one save row.
 *
 * The description is not decoration. These values reach customer-facing pages
 * — a delivery fee becomes money, a maintenance switch closes the shop — and
 * the operator is entitled to know what a field touches before they touch it.
 *
 * The save row is a prop rather than a sibling so the border it sits on stays
 * part of the same box; each tab's `<form>` wraps the whole card.
 */
export function SettingsCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <section className="border-border border">
      <header className="border-border border-b px-6 py-5">
        <h2 className="font-heading text-foreground text-xl tracking-wide">
          {title}
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">{description}</p>
      </header>

      <div className="flex flex-col gap-8 px-6 py-8">{children}</div>

      {footer}
    </section>
  );
}

/**
 * `isDirty` drives nothing but the hint beside the button. Disabling save on a
 * pristine form would strand an operator who edited a field, changed it back,
 * and now cannot re-submit to reassure themselves.
 */
export function SettingsSaveBar({
  pending,
  isDirty,
  label = "Save changes",
}: {
  pending: boolean;
  isDirty: boolean;
  label?: string;
}) {
  return (
    <div className="border-border bg-surface-container-low flex items-center justify-end gap-4 border-t px-6 py-4">
      {isDirty && (
        <span className="text-muted-foreground text-xs tracking-widest uppercase">
          Unsaved changes
        </span>
      )}
      <Button
        type="submit"
        disabled={pending}
        className="rounded-none px-8 py-5 text-[11px] font-semibold tracking-[0.18em] uppercase"
      >
        {pending ? "Saving…" : label}
      </Button>
    </div>
  );
}
