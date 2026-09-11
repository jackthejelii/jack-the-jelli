/**
 * Turns a stored product photograph into a link-preview card.
 *
 * **This is a delivery-time URL transform, not an upload-time one.** The bytes
 * in Cloudinary are untouched and stay untouched — CLAUDE.md's rule is that
 * nothing in this codebase rewrites a product photograph, and nothing here
 * does. What this produces is a second, derived URL that only Facebook,
 * WhatsApp, Messenger and X ever request. The storefront keeps rendering the
 * original.
 *
 * `c_pad` rather than `c_fill` for the same reason `ProductCard` uses
 * `object-contain`: a 1:1 product shot forced into 1.91:1 by cropping loses the
 * top and bottom of the object. Padding it onto white matches the photography
 * spec (seamless white background) instead of fighting it, so the pad is
 * invisible and the whole wallet survives into the card.
 *
 * - `c_pad,b_white,w_1200,h_630` — Facebook's preferred card ratio.
 * - `f_jpg` — forced, not `f_auto`. Scrapers are not browsers: several send no
 *   `Accept` header worth reading and simply fail on AVIF or WebP, which shows
 *   up as a link with no image at all.
 * - `q_auto` — WhatsApp silently drops preview images over a few hundred KB,
 *   and an unoptimised 1200x630 JPEG of a leather grain clears that easily.
 */
const SOCIAL_CARD_TRANSFORM = "c_pad,b_white,w_1200,h_630,f_jpg,q_auto";

/** Where a transform is inserted in a Cloudinary delivery URL. */
const UPLOAD_SEGMENT = "/image/upload/";

export const SOCIAL_CARD_WIDTH = 1200;
export const SOCIAL_CARD_HEIGHT = 630;

/**
 * Returns `undefined` for anything that isn't a Cloudinary delivery URL —
 * including the local placeholder — so the caller falls through to the
 * site-wide card in `app/layout.tsx` rather than sharing a broken image.
 */
export function toSocialCardUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;

  const at = url.indexOf(UPLOAD_SEGMENT);
  if (at === -1) return undefined;

  const cut = at + UPLOAD_SEGMENT.length;
  return `${url.slice(0, cut)}${SOCIAL_CARD_TRANSFORM}/${url.slice(cut)}`;
}
