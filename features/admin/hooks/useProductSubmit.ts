"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import type { ZodType } from "zod";
import type { VariantEditorHandle } from "@/features/admin/components/VariantEditor";
import {
  type AdminFormState,
  toFieldErrors,
} from "@/features/admin/lib/form-state";
import {
  discardUploads,
  validateProductDraft,
} from "@/features/admin/lib/product-actions";
import { readProductFormData } from "@/features/admin/lib/product-schema";

interface UseProductSubmitOptions {
  /**
   * The colour editor, which owns one media uploader per colourway and commits
   * them all as a unit — see VariantEditor. Photographs belong to a colour, so
   * there is no longer a single product-level uploader to hold here.
   */
  variantsRef: React.RefObject<VariantEditorHandle | null>;
  /** The dispatch returned by useActionState. */
  formAction: (formData: FormData) => void;
  /** The state returned by useActionState, watched to close out the toast. */
  state: AdminFormState;
  /**
   * The same zod schema the Server Action uses (D5), run client-side first so
   * an invalid form never reaches Cloudinary.
   */
  schema: ZodType;
  /** Runs immediately before dispatch — used to disarm the unsaved-changes guard. */
  onBeforeDispatch?: () => void;
}

/**
 * Submit pipeline shared by the create and edit product forms.
 *
 * Images are uploaded to Cloudinary on submit rather than on drop, so
 * abandoning a form leaves nothing behind. The remaining hazard is a submit
 * that uploads and *then* gets rejected, which would strand the new images.
 * Two defences:
 *
 *  1. Everything that can be checked without the images — the shared schema,
 *     plus a duplicate SKU or missing category — is checked first, client-side
 *     then server-side, before a single byte is uploaded.
 *  2. If the save still fails, the images this submit created are deleted and
 *     their tiles returned to "staged", so a retry re-uploads them rather than
 *     saving dead URLs.
 */
export function useProductSubmit({
  variantsRef,
  formAction,
  state,
  schema,
  onBeforeDispatch,
}: UseProductSubmitOptions) {
  const [isUploading, setIsUploading] = useState(false);
  const [clientErrors, setClientErrors] = useState<
    Record<string, string> | undefined
  >(undefined);
  const toastIdRef = useRef<string | number | undefined>(undefined);
  // Public ids created by the in-flight submit, pending confirmation.
  const inFlightUploadsRef = useRef<string[]>([]);

  const rollbackUploads = useCallback(() => {
    const publicIds = inFlightUploadsRef.current;
    inFlightUploadsRef.current = [];
    if (publicIds.length === 0) return;

    variantsRef.current?.restage(publicIds);
    void discardUploads(publicIds);
  }, [variantsRef]);

  // The action only returns when it failed — success redirects — so a new state
  // object while a toast is live means the save was rejected.
  useEffect(() => {
    if (toastIdRef.current === undefined) return;
    toast.error(state.message ?? "Could not save this product.", {
      id: toastIdRef.current,
      description: "The images from this attempt were discarded.",
    });
    toastIdRef.current = undefined;
    rollbackUploads();
  }, [state, rollbackUploads]);

  // A successful save unmounts this form mid-redirect; the uploads are the
  // saved product's now, so drop them from the rollback list first.
  useEffect(
    () => () => {
      inFlightUploadsRef.current = [];
      if (toastIdRef.current !== undefined) toast.dismiss(toastIdRef.current);
    },
    [],
  );

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (isUploading) return;

      const form = event.currentTarget;
      const submitter = (event.nativeEvent as SubmitEvent)
        .submitter as HTMLButtonElement | null;
      const intent = submitter?.value === "publish" ? "publish" : "draft";

      const formData = new FormData(form);
      // preventDefault means the submitter's name/value isn't collected for us.
      formData.set("intent", intent);

      // Validate BEFORE uploading. The action would reject the same input, but
      // only after commit() had already pushed the images to Cloudinary —
      // orphaning them. Same schema as the server, so the rules can't drift (D5).
      const parsed = schema.safeParse(readProductFormData(formData));
      if (!parsed.success) {
        setClientErrors(toFieldErrors(parsed.error));
        toast.error("Please correct the highlighted fields.");
        return;
      }

      setIsUploading(true);
      const toastId = toast.loading("Checking…");
      toastIdRef.current = toastId;

      // Then the checks only the database can answer — a taken SKU, a deleted
      // category — still before anything is uploaded.
      let preflight: AdminFormState;
      try {
        preflight = await validateProductDraft(formData);
      } catch (error) {
        setIsUploading(false);
        toastIdRef.current = undefined;
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not save this product.",
          { id: toastId },
        );
        return;
      }
      if (!preflight.ok) {
        setIsUploading(false);
        setClientErrors(preflight.errors);
        toastIdRef.current = undefined;
        toast.error(preflight.message ?? "Could not save this product.", {
          id: toastId,
        });
        return;
      }
      setClientErrors(undefined);

      const editor = variantsRef.current;
      const pending = editor?.pendingCount() ?? 0;
      if (pending > 0) {
        toast.loading(`Uploading image 1 of ${pending}…`, { id: toastId });
      }

      try {
        if (editor) {
          const { variants, uploadedPublicIds } = await editor.commit(
            (uploaded, total) => {
              if (uploaded < total) {
                toast.loading(`Uploading image ${uploaded + 1} of ${total}…`, {
                  id: toastId,
                });
              }
            },
          );
          inFlightUploadsRef.current = uploadedPublicIds;
          // Overwrites the editor's own hidden input, which carries only the
          // photographs that were already on Cloudinary.
          formData.set("variants", JSON.stringify(variants));
        }
      } catch (error) {
        // Whatever landed before the failure still needs cleaning up.
        inFlightUploadsRef.current =
          (error as { uploadedPublicIds?: string[] }).uploadedPublicIds ?? [];
        rollbackUploads();

        setIsUploading(false);
        toastIdRef.current = undefined;
        toast.error(
          error instanceof Error ? error.message : "Image upload failed",
          { id: toastId, description: "Nothing was saved. Try again." },
        );
        return;
      }

      toast.loading(intent === "publish" ? "Publishing…" : "Saving draft…", {
        id: toastId,
      });
      onBeforeDispatch?.();
      // Batched with the dispatch below, so the buttons never flicker back to
      // enabled between the upload finishing and the action starting.
      setIsUploading(false);
      startTransition(() => formAction(formData));
    },
    [
      formAction,
      isUploading,
      onBeforeDispatch,
      rollbackUploads,
      schema,
      variantsRef,
    ],
  );

  // Client errors win until the next submit clears them; after that the server
  // is authoritative (duplicate SKU, and anything else only Mongo can know).
  return { handleSubmit, isUploading, errors: clientErrors ?? state.errors };
}
