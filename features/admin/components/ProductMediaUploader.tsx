"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { CloudUpload, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

const ACCEPTED_TYPES = "image/jpeg,image/png";

/** staged = chosen locally, not yet sent anywhere. */
type AssetStatus = "staged" | "uploading" | "uploaded" | "error";

export interface ProductImageValue {
  url: string;
  publicId: string;
}

interface MediaAsset {
  id: string;
  name: string;
  previewUrl: string;
  status: AssetStatus;
  /** Cloudinary secure_url, once the upload lands. */
  url?: string;
  publicId?: string;
  error?: string;
}

interface SignedUpload {
  signature: string;
  timestamp: number;
  folder: string;
  apiKey: string;
  cloudName: string;
}

export interface CommitResult {
  /** The complete image list in display order. */
  images: ProductImageValue[];
  /** Only the ids created by this call — what a rollback may delete. */
  uploadedPublicIds: string[];
}

export interface ProductMediaUploaderHandle {
  /**
   * Uploads every staged file, then resolves with the complete image list in
   * display order. Rejects on the first failure — the caller aborts the save.
   */
  commit(
    onProgress?: (uploaded: number, total: number) => void,
  ): Promise<CommitResult>;
  /** Files chosen but not yet on Cloudinary. */
  pendingCount(): number;
  /**
   * Return the named assets to `staged` after their Cloudinary copies were
   * deleted, so a retry re-uploads them instead of saving dead URLs.
   */
  restage(publicIds: string[]): void;
}

interface ProductMediaUploaderProps {
  onChange?: () => void;
  /** Already-uploaded images, when editing an existing product. */
  initialImages?: ProductImageValue[];
  /**
   * Name for the hidden input carrying the already-uploaded list. `null`
   * renders none — which is what VariantEditor needs, since one uploader per
   * colourway would otherwise post a dozen inputs all called "images".
   */
  hiddenInputName?: string | null;
  /**
   * Tightens the dropzone and the thumbnail grid for use inside a colourway
   * card, where this is one control among several rather than the section.
   */
  compact?: boolean;
  ref?: React.Ref<ProductMediaUploaderHandle>;
}

/**
 * Files go browser -> Cloudinary directly (D1): Server Actions cap request
 * bodies at 1 MB, so high-resolution photos can never pass through the action.
 *
 * Uploads are *deferred* until the form is actually saved. Uploading on drop
 * meant abandoning a half-filled form left orphaned assets in Cloudinary
 * forever; now nothing leaves the browser until Save as Draft / Publish.
 */
async function uploadToCloudinary(file: File) {
  const signResponse = await fetch("/api/cloudinary/sign", { method: "POST" });
  if (!signResponse.ok) {
    throw new Error(
      signResponse.status === 401
        ? "Not authorised to upload"
        : "Could not authorise the upload",
    );
  }

  const { signature, timestamp, folder, apiKey, cloudName } =
    (await signResponse.json()) as SignedUpload;

  // These must match the signed params exactly, or Cloudinary rejects it.
  const body = new FormData();
  body.append("file", file);
  body.append("api_key", apiKey);
  body.append("timestamp", String(timestamp));
  body.append("signature", signature);
  body.append("folder", folder);

  const uploadResponse = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: "POST", body },
  );

  if (!uploadResponse.ok) {
    throw new Error("Cloudinary rejected the upload");
  }

  const result = (await uploadResponse.json()) as {
    secure_url?: string;
    public_id?: string;
  };

  if (!result.secure_url || !result.public_id) {
    throw new Error("Cloudinary returned an unexpected response");
  }

  return { url: result.secure_url, publicId: result.public_id };
}

export default function ProductMediaUploader({
  onChange,
  initialImages,
  hiddenInputName = "images",
  compact = false,
  ref,
}: ProductMediaUploaderProps) {
  // Existing images start life as finished uploads. Their "preview" is the
  // Cloudinary URL itself, so there's no object URL to revoke for them.
  const [assets, setAssets] = useState<MediaAsset[]>(() =>
    (initialImages ?? []).map((image) => ({
      id: image.publicId,
      name: image.publicId.split("/").pop() ?? image.publicId,
      previewUrl: image.url,
      status: "uploaded" as const,
      url: image.url,
      publicId: image.publicId,
    })),
  );
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // The staged File objects, held until commit().
  const filesRef = useRef<Map<string, File>>(new Map());

  // commit() runs from an event handler and needs the current list without
  // closing over a stale render.
  const assetsRef = useRef(assets);
  useEffect(() => {
    assetsRef.current = assets;
  }, [assets]);

  // Preview URLs are browser resources, not render state — revoke them on unmount.
  const objectUrlsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const urls = objectUrlsRef.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const patchAsset = useCallback((id: string, patch: Partial<MediaAsset>) => {
    setAssets((current) =>
      current.map((asset) =>
        asset.id === id ? { ...asset, ...patch } : asset,
      ),
    );
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      pendingCount: () =>
        assetsRef.current.filter((asset) => asset.status !== "uploaded").length,

      restage: (publicIds) => {
        const targets = new Set(publicIds);
        setAssets((current) =>
          current.map((asset) =>
            asset.publicId && targets.has(asset.publicId)
              ? {
                  ...asset,
                  status: "staged" as const,
                  url: undefined,
                  publicId: undefined,
                }
              : asset,
          ),
        );
      },

      commit: async (onProgress) => {
        const current = assetsRef.current;
        const total = current.filter(
          (asset) => asset.status !== "uploaded",
        ).length;
        let uploaded = 0;
        onProgress?.(0, total);

        const resolved = new Map<string, ProductImageValue>();
        const uploadedPublicIds: string[] = [];

        // Sequential, so ordering is stable and a failure stops the rest from
        // uploading needlessly.
        for (const asset of current) {
          if (asset.status === "uploaded" && asset.url && asset.publicId) {
            resolved.set(asset.id, {
              url: asset.url,
              publicId: asset.publicId,
            });
            continue;
          }

          const file = filesRef.current.get(asset.id);
          if (!file) continue;

          patchAsset(asset.id, { status: "uploading", error: undefined });
          try {
            const result = await uploadToCloudinary(file);
            patchAsset(asset.id, { status: "uploaded", ...result });
            resolved.set(asset.id, result);
            uploadedPublicIds.push(result.publicId);
            uploaded += 1;
            onProgress?.(uploaded, total);
          } catch (error) {
            const message =
              error instanceof Error ? error.message : "Upload failed";
            patchAsset(asset.id, { status: "error", error: message });
            // Whatever landed before this failure is still the caller's to
            // clean up.
            throw Object.assign(new Error(`${asset.name} — ${message}`), {
              uploadedPublicIds,
            });
          }
        }

        return {
          images: current
            .map((asset) => resolved.get(asset.id))
            .filter((image): image is ProductImageValue => Boolean(image)),
          uploadedPublicIds,
        };
      },
    }),
    [patchAsset],
  );

  const addFiles = (files: FileList | null) => {
    const images = Array.from(files ?? []).filter((file) =>
      file.type.startsWith("image/"),
    );
    if (images.length === 0) return;

    const added = images.map((file) => {
      const previewUrl = URL.createObjectURL(file);
      objectUrlsRef.current.add(previewUrl);
      const id = crypto.randomUUID();
      filesRef.current.set(id, file);
      return {
        id,
        name: file.name,
        previewUrl,
        status: "staged" as const,
      };
    });

    setAssets((current) => [...current, ...added]);
    onChange?.();
  };

  const removeAsset = (id: string) => {
    const removed = assets.find((asset) => asset.id === id);
    // Only blob previews need revoking — existing images preview via their
    // Cloudinary URL.
    if (removed && objectUrlsRef.current.has(removed.previewUrl)) {
      URL.revokeObjectURL(removed.previewUrl);
      objectUrlsRef.current.delete(removed.previewUrl);
    }
    filesRef.current.delete(id);
    setAssets((current) => current.filter((asset) => asset.id !== id));
    onChange?.();
  };

  const openPicker = () => inputRef.current?.click();

  // Only images that already exist on Cloudinary. The form overwrites this
  // with commit()'s result on submit; it matters solely as a no-JS fallback,
  // where it keeps an edit from wiping the saved gallery.
  const persisted = assets
    .filter((asset) => asset.status === "uploaded")
    .map((asset) => ({ url: asset.url!, publicId: asset.publicId! }));

  return (
    <div className={cn("flex flex-col", compact ? "gap-4" : "gap-6")}>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        multiple
        hidden
        onChange={(e) => {
          addFiles(e.target.files);
          // Allow re-picking the same file after a removal.
          e.target.value = "";
        }}
      />

      {hiddenInputName !== null && (
        <input
          type="hidden"
          name={hiddenInputName}
          value={JSON.stringify(persisted)}
        />
      )}

      {/* Dropzone */}
      <button
        type="button"
        onClick={openPicker}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        className={cn(
          "group bg-muted/50 border-border hover:border-foreground flex w-full flex-col items-center justify-center border border-dashed transition-colors duration-300",
          compact ? "py-8" : "aspect-21/9",
          isDragging && "border-foreground bg-muted",
        )}
      >
        <CloudUpload
          className={cn(
            "text-muted-foreground group-hover:text-foreground transition-colors",
            isDragging && "text-foreground",
            compact ? "mb-2 size-6" : "mb-4 size-10",
          )}
        />
        <span className="text-muted-foreground group-hover:text-foreground text-xs font-semibold tracking-widest uppercase transition-colors">
          {compact ? "Photographs for this colour" : "Upload New Assets"}
        </span>
        <span className="text-muted-foreground/80 mt-2 text-[13px]">
          Drag and drop high-resolution JPG or PNG
        </span>
      </button>

      {/* Thumbnails */}
      <div
        className={cn(
          "grid gap-4",
          compact
            ? "grid-cols-3 sm:grid-cols-5"
            : "grid-cols-2 sm:grid-cols-4 sm:gap-6",
        )}
      >
        {assets.map((asset, index) => (
          <div
            key={asset.id}
            className={cn(
              "group bg-accent border-border relative aspect-square overflow-hidden border",
              asset.status === "error" && "border-destructive",
            )}
          >
            <Image
              src={asset.previewUrl}
              alt={asset.name}
              fill
              sizes="(min-width: 640px) 12rem, 50vw"
              unoptimized
              className={cn(
                "object-cover transition-transform duration-700 group-hover:scale-105",
                asset.status === "uploading" && "opacity-50",
              )}
            />

            {index === 0 && (
              <span className="absolute top-2 left-2 bg-black/50 px-2 py-0.5 text-[10px] font-semibold tracking-widest text-white uppercase">
                Primary
              </span>
            )}

            {asset.status === "staged" && (
              <span className="bg-background/80 text-muted-foreground absolute inset-x-0 bottom-0 px-2 py-1 text-center text-[10px] font-semibold tracking-widest uppercase">
                Not saved yet
              </span>
            )}

            {asset.status === "uploading" && (
              <span className="bg-background/80 text-muted-foreground absolute inset-x-0 bottom-0 px-2 py-1 text-center text-[10px] font-semibold tracking-widest uppercase">
                Uploading…
              </span>
            )}

            {asset.status === "error" && (
              <span
                title={asset.error}
                className="bg-destructive absolute inset-x-0 bottom-0 px-2 py-1 text-center text-[10px] font-semibold tracking-widest text-white uppercase"
              >
                Failed
              </span>
            )}

            <div className="bg-primary/20 absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
              <button
                type="button"
                onClick={() => removeAsset(asset.id)}
                aria-label={`Remove ${asset.name}`}
                className="bg-background text-foreground hover:bg-foreground hover:text-background p-2 transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>
        ))}

        {/* Placeholder tiles keep the grid rhythm before anything is added */}
        {Array.from({ length: Math.max(0, 3 - assets.length) }).map((_, i) => (
          <div
            key={`placeholder-${i}`}
            className="bg-surface-container-highest border-border aspect-square border"
          />
        ))}

        <button
          type="button"
          onClick={openPicker}
          aria-label="Add more images"
          className="border-border text-muted-foreground hover:border-foreground hover:text-foreground flex aspect-square items-center justify-center border border-dashed transition-colors"
        >
          <Plus className="size-5" />
        </button>
      </div>
    </div>
  );
}
