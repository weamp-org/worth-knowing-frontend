"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      // Sonner ships its own HSL palette for these but leaves them off by
      // default. Ours are `color-mix`ed from the theme tokens instead, so a
      // toast is derived from the same oklch values as everything else and
      // follows the dark class without a second set of values.
      richColors
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",

          // `success` leans on `primary` rather than inventing a green: the
          // theme has no success token, and a new one used only by toasts
          // would be a color nothing else on the page agrees with.
          "--success-bg": "color-mix(in oklch, var(--primary) 12%, var(--popover))",
          "--success-text":
            "color-mix(in oklch, var(--primary) 80%, var(--popover-foreground))",
          "--success-border":
            "color-mix(in oklch, var(--primary) 30%, var(--border))",

          // `info` is a neutral accent rather than a color of its own, so it
          // stays legible and does not compete with the success tint.
          "--info-bg": "color-mix(in oklch, var(--muted) 60%, var(--popover))",
          "--info-text": "var(--popover-foreground)",
          "--info-border": "var(--border)",

          "--warning-bg": "color-mix(in oklch, #d97706 14%, var(--popover))",
          "--warning-text":
            "color-mix(in oklch, #d97706 85%, var(--popover-foreground))",
          "--warning-border": "color-mix(in oklch, #d97706 32%, var(--border))",

          // `error` is the one that gets the theme's own destructive token,
          // since that is exactly what it is for.
          "--error-bg": "color-mix(in oklch, var(--destructive) 12%, var(--popover))",
          "--error-text":
            "color-mix(in oklch, var(--destructive) 85%, var(--popover-foreground))",
          "--error-border": "color-mix(in oklch, var(--destructive) 32%, var(--border))",

          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      // The registry ships `classNames: { toast: "cn-toast" }` here, but
      // nothing in this project defines `cn-toast`, so it was a class that
      // silently did nothing. Left off rather than carried along.
      {...props}
    />
  )
}

export { Toaster }
