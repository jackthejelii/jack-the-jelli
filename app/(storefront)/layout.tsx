import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import NavBar from "@/components/layout/NavBar";
import PageFade from "@/components/layout/PageFade";
import MessageScreen, {
  messageScreenActionClass,
} from "@/components/layout/MessageScreen";
import Footer from "@/features/homepage/components/Footer";
import { isAdmin } from "@/lib/auth-guard";
import { getSettings } from "@/lib/settings";

/**
 * While the shop is closed, tell crawlers not to keep the notice.
 *
 * A layout's metadata is merged into every page beneath it, and a page that
 * declares its own `robots` still wins — `/checkout` does, and already says
 * noindex, so nothing is lost there. This is a best effort, not a guarantee:
 * see the note on the status code in MaintenanceGate below.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { maintenanceMode } = await getSettings();
  return maintenanceMode ? { robots: { index: false, follow: false } } : {};
}

/**
 * The storefront, closed.
 *
 * Two things about how this is arranged are deliberate and easy to undo by
 * accident.
 *
 * **The settings read does not make the storefront dynamic.** `getSettings()`
 * is a `"use cache"` function, and a cached read stays prerenderable — so when
 * maintenance is off, which is all but a few hours of the shop's life, this
 * component resolves during the prerender and every storefront page keeps the
 * static shell it had before the gate existed.
 *
 * **The session read happens only inside the maintenance branch.** Letting the
 * shop's own people through requires knowing who is asking, and that is a
 * request-time read that cannot be prerendered. Asking it unconditionally —
 * one `isAdmin()` at the top of this function — would have cost every visitor
 * the static shell in order to serve a bypass that matters on the rare day the
 * switch is on. So the cheap cached question is asked first, and the expensive
 * dynamic one only when the answer makes it relevant.
 *
 * The security property is the same one `app/admin/layout.tsx` documents:
 * `children` is passed in as a prop but *rendered* here, after the await, and
 * React does not render an element merely because it was constructed. Nothing
 * beneath this runs while the gate is deciding. What it protects is different
 * though — this is a courtesy, not a boundary. `placeOrder` and `lookupOrder`
 * refuse on their own, because they are public HTTP endpoints that a stale tab
 * can still reach without this layout ever running.
 */
async function MaintenanceGate({ children }: { children: React.ReactNode }) {
  const { maintenanceMode, maintenanceMessage } = await getSettings();
  if (!maintenanceMode) return <>{children}</>;

  return (
    <Suspense fallback={null}>
      <MaintenanceNotice message={maintenanceMessage}>
        {children}
      </MaintenanceNotice>
    </Suspense>
  );
}

async function MaintenanceNotice({
  children,
  message,
}: {
  children: React.ReactNode;
  message: string;
}) {
  // Admins see the real shop, so the person who closed it can check their work
  // before reopening. Everyone else gets the notice.
  if (await isAdmin()) return <>{children}</>;

  return (
    <MessageScreen
      standalone
      eyebrow="Back soon"
      title="We're closed for a moment"
      description={message}
      actions={
        <Link href="/track" className={messageScreenActionClass}>
          Track An Order
        </Link>
      }
    />
  );
}

/**
 * Chrome shared by every storefront route. It lives here rather than inside
 * each page for two reasons: the nav survives client navigations instead of
 * remounting, and it stays on screen while `loading.tsx` or `error.tsx` is in
 * control — a page-level NavBar disappears the moment either takes over.
 *
 * The route group keeps `/admin` out without changing any URL.
 */
export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // The gate wraps the chrome as well as the page. A notice with a working
    // nav bar and a cart button over it would be inviting the visitor to do
    // the one thing the shop has just said it cannot do.
    <MaintenanceGate>
      <NavBar />
      {/* Inside <main>, not around it: the fade wrapper remounts on every route
          change, and the landmark itself has to stay put. */}
      <main className="flex-1">
        {/* PageFade keys on usePathname, and for a dynamic segment the pathname
            is not known until the request arrives — so under Cache Components
            it cannot sit in the prerendered shell. The boundary is here rather
            than inside PageFade so the <main> landmark and the footer below it
            still ship in the static shell. Each route's own loading.tsx
            provides the real fallback; null is what shows in the gap before
            one takes over. */}
        <Suspense fallback={null}>
          <PageFade>{children}</PageFade>
        </Suspense>
      </main>
      <Footer />
    </MaintenanceGate>
  );
}
