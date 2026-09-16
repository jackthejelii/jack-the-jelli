"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Switch as SwitchPrimitive } from "radix-ui";

function Switch({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: "sm" | "default";
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        // Customised away from the shadcn default, deliberately.
        //
        // The stock "off" track is `bg-input`, and in this palette --input is
        // #f3f1ed against a #faf9f6 page: 1.03:1, with a transparent border and
        // a thumb the exact colour of the page. Measured, not guessed. The
        // result was a control nobody could find — which for the switch that
        // closes the storefront is the worst possible place to hide one.
        //
        // So the off state now carries a real filled track AND a real border,
        // and the whole control is bigger. The on state was always fine
        // (#1a1a1a); it gains a matching border so the outline does not jump
        // between states.
        //
        // The border alpha is 70% rather than a rounder number because that is
        // where it clears WCAG 1.4.11's 3:1 floor for a non-text control: over
        // the page colour, #444748 composites to 2.78:1 at 55% and 3.98:1 at
        // 70%. The filled track alone only reaches 1.62:1, so the border is
        // what actually carries the contrast requirement here.
        "peer group/switch focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-checked:bg-primary data-checked:border-primary data-unchecked:bg-outline-variant data-unchecked:border-on-surface-variant/70 dark:data-unchecked:bg-input/80 relative inline-flex shrink-0 cursor-pointer items-center rounded-full border transition-all outline-none group-has-[:focus-visible]/field-label:ring-0 after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:ring-3 aria-invalid:ring-3 data-disabled:cursor-not-allowed data-disabled:opacity-50 data-[size=default]:h-6 data-[size=default]:w-11 data-[size=sm]:h-[14px] data-[size=sm]:w-[24px]",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="bg-background dark:data-checked:bg-primary-foreground dark:data-unchecked:bg-foreground pointer-events-none block rounded-full ring-0 transition-transform group-data-[size=default]/switch:size-5 group-data-[size=sm]/switch:size-3 group-data-[size=default]/switch:data-checked:translate-x-[calc(100%+2px)] group-data-[size=sm]/switch:data-checked:translate-x-[calc(100%-2px)] group-data-[size=default]/switch:data-unchecked:translate-x-0 group-data-[size=sm]/switch:data-unchecked:translate-x-0"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
