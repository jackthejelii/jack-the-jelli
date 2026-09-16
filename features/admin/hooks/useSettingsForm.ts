"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { useDirtyGuard } from "@/features/admin/hooks/useDirtyGuard";
import {
  emptyFormState,
  type AdminFormState,
} from "@/features/admin/lib/form-state";

/**
 * The wiring every settings tab needs, in one place.
 *
 * Each tab is its own `<form>` with its own action, so each needs its own
 * `useActionState`, its own toast and its own unsaved-changes guard. The four
 * of them differ in their fields, not in any of that — so the plumbing lives
 * here and the form components stay a list of inputs.
 *
 * The dirty flag is cleared on a successful save rather than on submit: an
 * action that comes back with field errors has changed nothing, and warning
 * the operator on their way out is still correct.
 */
export function useSettingsForm(
  action: (
    state: AdminFormState,
    formData: FormData,
  ) => Promise<AdminFormState>,
) {
  const [state, formAction, pending] = useActionState(action, emptyFormState);
  const { isDirty, markDirty, clearDirty } = useDirtyGuard();

  useEffect(() => {
    if (!state.message) return;
    if (state.ok) {
      toast.success(state.message);
      clearDirty();
      return;
    }
    toast.error(state.message);
  }, [state, clearDirty]);

  return { state, formAction, pending, isDirty, markDirty };
}
