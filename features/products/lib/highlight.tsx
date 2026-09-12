import type { ReactNode } from "react";
import { escapeRegex } from "@/lib/slug";
import { searchTokens } from "@/features/products/lib/constants";

/**
 * Bolds the parts of `text` the query actually matched.
 *
 * Tokenised through the same `searchTokens` the filter uses, so what is
 * emphasised is exactly what caused the row to appear — highlighting on the
 * raw typed string instead would leave "wallets" bolding nothing in "Wallet".
 *
 * Rendered as `<mark>` for the semantics, but deliberately without the
 * browser's yellow ground: on a Quiet Luxury palette a highlighter stripe
 * reads as a defect. Weight alone carries it.
 */
export function highlightMatch(text: string, query: string): ReactNode {
  const tokens = searchTokens(query).filter(Boolean);
  if (!tokens.length) return text;

  // One alternation rather than a pass per token, so overlapping tokens can't
  // nest a <mark> inside another one. Longest first: with "flame" and "fl"
  // both present, the alternation would otherwise stop at the shorter one and
  // leave the rest of the word unbolded.
  const pattern = new RegExp(
    `(${[...tokens]
      .sort((a, b) => b.length - a.length)
      .map(escapeRegex)
      .join("|")})`,
    "ig",
  );

  // `split` on a capturing regex interleaves the captures at the odd indices.
  return text.split(pattern).map((part, index) =>
    index % 2 === 1 ? (
      <mark key={index} className="bg-transparent font-semibold text-inherit">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}
