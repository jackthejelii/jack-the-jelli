/**
 * Renders one structured-data block.
 *
 * `dangerouslySetInnerHTML` is not a shortcut here — it is the only way to emit
 * a `<script>` body React will leave alone. Rendering the JSON as a child would
 * have React HTML-escape it, and `&quot;` inside a script block is not JSON any
 * parser accepts. The `<` replacement is the matching precaution: a product
 * description containing `</script>` would otherwise close the tag early and
 * put the rest of the JSON into the document as markup.
 *
 * Deliberately not `next/script`: a JSON-LD block is data, not behaviour. It
 * must be in the prerendered HTML for a crawler that runs no JavaScript, which
 * is the one guarantee a deferred script strategy cannot make.
 */
export default function JsonLd({ schema }: { schema: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
      }}
    />
  );
}
