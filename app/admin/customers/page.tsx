import Image from "next/image";
import { BadgeCheck, MailWarning } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import CustomerFilters from "@/features/admin/components/CustomerFilters";
import CustomerRoleSelect from "@/features/admin/components/CustomerRoleSelect";
import DeleteCustomerDialog from "@/features/admin/components/DeleteCustomerDialog";
import ProductPagination from "@/features/admin/components/ProductPagination";
import { getCustomers } from "@/features/admin/lib/customers";
import { USER_ROLES, type UserRole } from "@/features/admin/lib/roles";
import { formatBdPhone, normalizeBdPhone } from "@/features/orders/lib/phone";
import { formatPrice } from "@/features/products/lib/format";
import { requireAdmin } from "@/lib/auth-guard";

const TABLE_HEADERS = [
  "Customer",
  "Contact",
  "Orders",
  "Lifetime Value",
  "Joined",
  "Role",
  "Actions",
] as const;

interface AdminCustomersProps {
  searchParams: Promise<{ q?: string; role?: string; page?: string }>;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Two letters off the name, or one off the email when there's no name. */
function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const letters =
    parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts.at(-1)![0];
  return letters.toUpperCase();
}

export default async function AdminCustomersPage({
  searchParams,
}: AdminCustomersProps) {
  // The layout already guards this route; called again here for the signed-in
  // admin's own id, which decides whose role select is locked.
  const admin = await requireAdmin("/admin/customers");
  const params = await searchParams;

  // Anything unrecognised is dropped rather than passed to Mongo.
  const role = USER_ROLES.find(
    (value): value is UserRole => value === params.role,
  );
  const parsedPage = Number.parseInt(params.page ?? "1", 10);

  const { customers, total, page, totalPages, counts } = await getCustomers({
    q: params.q,
    role,
    page: Number.isFinite(parsedPage) ? parsedPage : 1,
  });

  const filtered = Boolean(params.q || role);

  return (
    <div className="flex flex-col gap-12">
      <header className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex flex-col gap-2">
          <h1 className="font-heading text-3xl tracking-widest">
            Customer Register
          </h1>
          <p className="text-muted-foreground text-xs tracking-wide">
            Registered accounts only — guest orders live on the order manager
            until their buyer signs up.
          </p>
        </div>
      </header>

      <CustomerFilters counts={counts} />

      <div className="border-border bg-card flex-1 overflow-x-auto border transition-shadow duration-500 hover:shadow-[0px_12px_32px_rgba(26,26,26,0.04)]">
        <Table className="min-w-4xl">
          <TableHeader>
            <TableRow>
              {TABLE_HEADERS.map((header) => (
                <TableHead key={header}>{header.toUpperCase()}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody className="text-base">
            {customers.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={TABLE_HEADERS.length}
                  className="text-muted-foreground py-16 text-center text-sm"
                >
                  {filtered
                    ? "No customers match these filters."
                    : "No accounts yet. They'll appear here as people sign up."}
                </TableCell>
              </TableRow>
            )}

            {customers.map((customer) => {
              const isSelf = customer.id === String(admin._id);
              // Stored as the customer typed it, so it only formats when it's
              // recognisably a BD mobile.
              const canonicalPhone = customer.phone
                ? normalizeBdPhone(customer.phone)
                : null;

              return (
                <TableRow
                  key={customer.id}
                  className={
                    // Admins are the rows that carry real power — worth
                    // spotting at a glance on a page that can grant it.
                    customer.role === "admin"
                      ? "bg-accent/40"
                      : "hover:bg-muted"
                  }
                >
                  <TableCell className="py-8">
                    <div className="flex items-center gap-4">
                      <div className="bg-accent text-muted-foreground relative flex size-12 shrink-0 items-center justify-center overflow-hidden text-xs font-semibold tracking-widest">
                        {customer.image ? (
                          <Image
                            src={customer.image}
                            alt=""
                            fill
                            sizes="3rem"
                            className="object-cover"
                          />
                        ) : (
                          initials(customer.name)
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-heading text-foreground text-base">
                          {customer.name}
                        </div>
                        <div className="text-muted-foreground mt-1 flex items-center gap-1.5 text-xs">
                          <span className="truncate">{customer.email}</span>
                          {customer.emailVerified ? (
                            <BadgeCheck
                              className="size-3.5 shrink-0"
                              aria-label="Email verified"
                            />
                          ) : (
                            <MailWarning
                              className="text-destructive size-3.5 shrink-0"
                              aria-label="Email not verified"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="py-8">
                    {customer.phone ? (
                      <span className="text-foreground text-xs font-semibold tracking-widest">
                        {canonicalPhone
                          ? formatBdPhone(canonicalPhone)
                          : customer.phone}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/60 text-sm">
                        —
                      </span>
                    )}
                  </TableCell>

                  <TableCell className="py-8">
                    <div className="text-foreground text-sm">
                      {customer.orderCount}
                    </div>
                    {customer.lastOrderAt && (
                      <div className="text-muted-foreground mt-1 text-xs">
                        Last {formatDate(customer.lastOrderAt)}
                      </div>
                    )}
                  </TableCell>

                  <TableCell className="text-foreground py-8 tracking-wide">
                    {formatPrice(customer.lifetimeValue)}
                  </TableCell>

                  <TableCell className="py-8">
                    <span className="text-muted-foreground text-xs">
                      {customer.joinedAt ? formatDate(customer.joinedAt) : "—"}
                    </span>
                  </TableCell>

                  <TableCell className="py-8">
                    <CustomerRoleSelect
                      userId={customer.id}
                      name={customer.name}
                      role={customer.role}
                      isSelf={isSelf}
                    />
                  </TableCell>

                  <TableCell className="py-8">
                    <DeleteCustomerDialog
                      userId={customer.id}
                      name={customer.name}
                      email={customer.email}
                      orderCount={customer.orderCount}
                      isSelf={isSelf}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <ProductPagination
        page={page}
        totalPages={totalPages}
        total={total}
        params={{ q: params.q, role: params.role }}
        label="Customer pages"
      />
    </div>
  );
}
