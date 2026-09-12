"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  createCategory,
  deleteCategory,
  updateCategory,
} from "@/features/admin/lib/category-actions";
import {
  type CategoryActionState,
  type CategoryOption,
  emptyCategoryActionState,
} from "@/features/admin/lib/category-schema";
import { boxedInputClassName } from "@/features/admin/lib/product-form";

interface CategoryManagerDialogProps {
  categories: CategoryOption[];
  /** Fired with the new row so the Select can jump straight to it. */
  onCategoryCreated?: (category: CategoryOption) => void;
  onCategoryDeleted?: (id: string) => void;
}

/**
 * Add / rename / delete categories without leaving the product form.
 *
 * Deliberately form-free: this renders inside the product <form>, and although
 * Radix portals the content out of that DOM subtree, React still propagates
 * events through the *React* tree — a nested form's submit would fire the
 * product form's onSubmit. The actions are dispatched directly instead.
 */
export default function CategoryManagerDialog({
  categories,
  onCategoryCreated,
  onCategoryDeleted,
}: CategoryManagerDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [state, setState] = useState<CategoryActionState>(
    emptyCategoryActionState,
  );
  // One transition for the whole dialog; `busyId` says which row is mid-flight.
  const [isPending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  const resetFeedback = () => setState(emptyCategoryActionState);

  const handleAdd = () => {
    const name = newName.trim();
    if (!name || isPending) return;

    setBusyId("new");
    startTransition(async () => {
      const body = new FormData();
      body.append("name", name);
      const result = await createCategory(emptyCategoryActionState, body);
      setState(result);
      setBusyId(null);

      if (result.ok && result.category) {
        setNewName("");
        onCategoryCreated?.(result.category);
      }
    });
  };

  const handleRename = (id: string) => {
    const name = editingName.trim();
    if (!name || isPending) return;

    setBusyId(id);
    startTransition(async () => {
      const body = new FormData();
      body.append("id", id);
      body.append("name", name);
      const result = await updateCategory(emptyCategoryActionState, body);
      setState(result);
      setBusyId(null);
      if (result.ok) setEditingId(null);
    });
  };

  const handleDelete = (id: string) => {
    if (isPending) return;

    setBusyId(id);
    startTransition(async () => {
      const body = new FormData();
      body.append("id", id);
      const result = await deleteCategory(emptyCategoryActionState, body);
      setState(result);
      setBusyId(null);
      setConfirmingId(null);
      if (result.ok) onCategoryDeleted?.(id);
    });
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) {
          setNewName("");
          setEditingId(null);
          setConfirmingId(null);
          resetFeedback();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Add or manage categories"
          className="border-border hover:border-foreground size-12 shrink-0 rounded-none"
        >
          <Plus className="size-4" />
        </Button>
      </DialogTrigger>

      {/* Typing in here must not bubble up and arm the product form's
          unsaved-changes guard. */}
      <DialogContent
        className="rounded-none sm:max-w-md"
        onChange={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle className="tracking-widest uppercase">
            Categories
          </DialogTitle>
          <DialogDescription>
            Every product belongs to a category. Add, rename, or remove them
            here — the selector updates immediately.
          </DialogDescription>
        </DialogHeader>

        {/* Add */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Input
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                resetFeedback();
              }}
              onKeyDown={(e) => {
                // No form here, so Enter has to be wired by hand.
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAdd();
                }
              }}
              placeholder="e.g. Bifold Wallet"
              aria-label="New category name"
              aria-invalid={Boolean(state.errors?.name)}
              className={`${boxedInputClassName} h-11 flex-1`}
            />
            <Button
              type="button"
              onClick={handleAdd}
              disabled={isPending || newName.trim().length === 0}
              className="h-11 shrink-0 rounded-none px-6 text-xs tracking-widest uppercase"
            >
              {isPending && busyId === "new" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Add"
              )}
            </Button>
          </div>
          {state.errors?.name && (
            <p role="alert" className="text-destructive text-sm">
              {state.errors.name}
            </p>
          )}
          {state.message && !state.errors?.name && (
            <p
              role="status"
              className={
                state.ok
                  ? "text-muted-foreground text-sm"
                  : "text-destructive text-sm"
              }
            >
              {state.message}
            </p>
          )}
        </div>

        {/* Existing */}
        <ul
          data-lenis-prevent
          className="border-border max-h-64 divide-y overflow-y-auto border"
        >
          {categories.length === 0 && (
            <li className="text-muted-foreground px-4 py-6 text-center text-sm">
              No categories yet.
            </li>
          )}

          {categories.map((category) => {
            const isBusy = isPending && busyId === category.id;

            if (editingId === category.id) {
              return (
                <li key={category.id} className="flex items-center gap-2 p-2">
                  <Input
                    autoFocus
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleRename(category.id);
                      }
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    aria-label={`Rename ${category.name}`}
                    className={`${boxedInputClassName} h-10 flex-1`}
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label="Save name"
                    disabled={isBusy || editingName.trim().length === 0}
                    onClick={() => handleRename(category.id)}
                    className="rounded-none"
                  >
                    {isBusy ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Check className="size-4" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label="Cancel rename"
                    onClick={() => setEditingId(null)}
                    className="rounded-none"
                  >
                    <X className="size-4" />
                  </Button>
                </li>
              );
            }

            return (
              <li
                key={category.id}
                className="flex items-center justify-between gap-2 px-4 py-2"
              >
                <span className="truncate text-sm">{category.name}</span>
                <div className="flex shrink-0 items-center gap-1">
                  {confirmingId === category.id ? (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={isBusy}
                        onClick={() => handleDelete(category.id)}
                        className="rounded-none text-xs tracking-widest uppercase"
                      >
                        {isBusy ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          "Confirm"
                        )}
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label="Cancel delete"
                        onClick={() => setConfirmingId(null)}
                        className="rounded-none"
                      >
                        <X className="size-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label={`Rename ${category.name}`}
                        onClick={() => {
                          resetFeedback();
                          setConfirmingId(null);
                          setEditingId(category.id);
                          setEditingName(category.name);
                        }}
                        className="text-muted-foreground hover:text-foreground rounded-none"
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label={`Delete ${category.name}`}
                        onClick={() => {
                          resetFeedback();
                          setConfirmingId(category.id);
                        }}
                        className="text-muted-foreground hover:text-destructive rounded-none"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        <DialogFooter>
          <DialogClose asChild>
            <Button
              type="button"
              variant="outline"
              className="rounded-none text-xs tracking-widest uppercase"
            >
              Done
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
