import { Suspense } from "react";
import AdminSidebar from "@/features/admin/components/AdminSidebar";
import PageFade from "@/components/layout/PageFade";
import { requireAdmin } from "@/lib/auth-guard";

/**
 * The role gate, unchanged in substance and moved into its own component only
 * so it can sit behind a Suspense boundary — requireAdmin() reads headers(),
 * which under Cache Components would otherwise stop this whole layout, and
 * every page beneath it, from prerendering a shell.
 *
 * The security property is intact and worth stating, because it is the kind of
 * thing a later refactor breaks by accident: `children` is passed in as a prop
 * but *rendered* here, after the await. React does not render an element
 * because it was constructed, so no admin page runs until requireAdmin() has
 * returned — and when it doesn't return, it redirects, which throws, so
 * nothing downstream renders at all.
 *
 * This is still only the gate on *rendering*. Per §3.4 every admin Server
 * Action and route handler calls requireAdmin() as its own first statement,
 * because those are reachable by direct POST without ever touching this
 * layout. Nothing here changes that requirement.
 */
async function AdminGate({ children }: { children: React.ReactNode }) {
  // proxy.ts only redirects logged-out visitors (cookie presence, §3.4) — the
  // role check that turns away a logged-in customer has to happen here.
  await requireAdmin("/admin");
  return <>{children}</>;
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-background text-foreground min-h-screen">
      {/* The sidebar highlights the current route with usePathname, so it is
          request-time state. It is fixed-position and `main` reserves its
          width with md:pl-64 regardless, so nothing moves while it resolves. */}
      <Suspense fallback={null}>
        <AdminSidebar />
      </Suspense>

      <main className="w-full flex-1 md:pl-64">
        <div className="mx-auto flex min-h-screen w-full max-w-360 flex-col px-5 py-8 pt-20 md:px-16 md:py-16 md:pt-16">
          {/* One boundary covers both request-time reads below it: PageFade's
              pathname and the gate's session lookup. The real fallback comes
              from each route's loading.tsx inside it. */}
          <Suspense fallback={null}>
            {/* The wrapper has to carry the column's flex context, or the
                `flex-1` tables on /admin/products and /admin/customers lose the
                parent they were sizing against. */}
            <PageFade className="flex flex-1 flex-col">
              <AdminGate>{children}</AdminGate>
            </PageFade>
          </Suspense>
        </div>
      </main>
    </div>
  );
}
