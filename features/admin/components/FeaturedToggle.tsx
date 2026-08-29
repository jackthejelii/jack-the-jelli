/**
 * The featured flag as a form field, shared by the create and edit forms so
 * the wording and the field name can't drift between them. FeaturedRowToggle
 * is the same flag reached from the inventory table — that one is for curating
 * the strip by comparing products, this one is for setting it on a piece you
 * are already writing.
 *
 * A native checkbox, matching OrderStatusControls: it submits with the form
 * without a hidden mirror input, and it needs no client state, so both forms
 * can keep posting plain FormData.
 *
 * Note that an unchecked box sends nothing at all — `featured` is absent from
 * FormData rather than "off", which is why the zod field treats missing as
 * false instead of as a failure.
 */
export default function FeaturedToggle({
  defaultChecked = false,
  onDirty,
}: {
  defaultChecked?: boolean;
  /** Called on toggle so the unsaved-changes guard arms. */
  onDirty?: () => void;
}) {
  return (
    <label className="border-border flex cursor-pointer items-start gap-3 border p-4">
      <input
        type="checkbox"
        name="featured"
        defaultChecked={defaultChecked}
        onChange={onDirty}
        className="accent-foreground mt-0.5 size-4 shrink-0 rounded-none"
      />
      <span>
        <span className="text-foreground block text-sm">
          Feature this piece on the homepage
        </span>
        <span className="text-muted-foreground mt-1 block text-xs">
          Featured pieces appear in the selection strip on the front page. Only
          published products show there — a draft or archived piece keeps the
          flag but stays hidden until it is published again.
        </span>
      </span>
    </label>
  );
}
