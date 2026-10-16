"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

type Variant = "primary" | "ghost" | "soft";
type Size = "md" | "sm";

/**
 * Kelas varian ditulis sebagai literal utuh — Tailwind tidak bisa melihat
 * kelas yang dirakit dari template string (`btn-${variant}`) dan akan
 * mem-purge-nya.
 */
const VARIANT_CLASS: Record<Variant, string> = {
  primary: "btn-primary",
  ghost: "btn-ghost",
  soft: "btn-soft",
};

const SIZE_CLASS: Record<Size, string> = {
  md: "",
  sm: "btn-sm",
};

/**
 * Tombol dasar. Keadaan yang ditangani: default, hover, focus-visible,
 * active, disabled, dan sibuk (lewat label + prop `disabled`).
 */
export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  type = "button",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}) {
  return (
    <button
      type={type}
      className={cn("btn", VARIANT_CLASS[variant], SIZE_CLASS[size], className)}
      {...rest}
    >
      {children}
    </button>
  );
}
