"use client";

import { useActionState, useEffect } from "react";
import { Loader2, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { emptyFormState } from "@/features/admin/lib/form-state";
import { setProductFeatured } from "@/features/admin/lib/product-actions";
import { cn } from "@/lib/utils";

/**
 * The Featured cell on the inventory table — one click to put a piece in the
 * homepage selection or take it out, without opening the product.
 *
 * The same flag as the checkbox on the product forms (FeaturedToggle), reached
 * from the list instead: curating a strip is a decision made by comparing
 * products against each other, which is the one thing the edit page can't show
 * you.
 *
 * A real `<form action>` rather than a hand-rolled dispatch, so react-dom
 * supplies the transition that makes `pending` true — see the note in
 * CustomerRoleSelect about what happens without one. No confirmation step: it
 * is a single click to undo, and it changes nothing about the product itself.
 */
export default function FeaturedRowToggle({
  productId,
  productName,
  featured,
}: {
  productId: string;
  /** For the aria-label, so the control names *which* product it features. */
  productName: string;
  featured: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    setProductFeatured,
    emptyFormState,
  );

  const next = !featured;
  // Derived, not stored: while the action is in flight the star shows what was
  // submitted, and the moment it settles the revalidated prop is the only
  // source of truth again — so a refusal puts the star back with no effect and
  // no second piece of state to keep in step.
  const shown = pending ? next : featured;

  useEffect(() => {
    if (!state.message) return;
    if (state.ok) toast.success(state.message);
    else toast.error(state.message);
  }, [state]);

  return (
    <form action={formAction} className="flex justify-center">
      <input type="hidden" name="id" value={productId} />
      <input type="hidden" name="featured" value={next ? "true" : "false"} />
      <Button
        type="submit"
        variant="ghost"
        size="icon"
        disabled={pending}
        aria-pressed={shown}
        aria-label={
          shown
            ? `Remove ${productName} from the homepage selection`
            : `Feature ${productName} on the homepage`
        }
        className={cn(
          "rounded-none",
          shown
            ? "text-foreground hover:text-muted-foreground"
            : "text-muted-foreground/40 hover:text-foreground",
        )}
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Star className={cn("size-4", shown && "fill-current")} />
        )}
      </Button>
    </form>
  );
}
