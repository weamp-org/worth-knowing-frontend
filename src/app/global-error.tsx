"use client";

/**
 * The last-resort boundary, for faults in the root layout itself.
 *
 * `error.tsx` sits *inside* the layout, so anything the layout throws — the
 * header, the theme or query providers, the auth token setter — skips it and
 * lands here. This file therefore renders its own `<html>` and `<body>`: the
 * root layout is what broke, so none of it can be reused.
 *
 * Nothing here may fail. No providers, no Clerk, no app components, no web
 * fonts, no Tailwind (the root layout's stylesheet is not loaded on this
 * path) — plain elements with inline styles and system fonts only. The one
 * action is a full reload, which re-boots the app from a clean state rather
 * than retrying a render inside a broken tree.
 */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "16px",
          padding: "40px 16px",
          textAlign: "center",
          fontFamily: "system-ui, -apple-system, sans-serif",
          backgroundColor: "#ffffff",
          color: "#171717",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 600 }}>
          Worth Knowing isn&apos;t loading
        </h1>
        <p style={{ margin: 0, fontSize: "14px", color: "#525252" }}>
          Something broke before the app could start. Reloading usually fixes
          it.
        </p>
        <div style={{ display: "flex", gap: "12px" }}>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              padding: "8px 16px",
              fontSize: "14px",
              fontWeight: 500,
              borderRadius: "6px",
              border: "1px solid #171717",
              backgroundColor: "#171717",
              color: "#ffffff",
              cursor: "pointer",
            }}
          >
            Reload page
          </button>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              padding: "8px 16px",
              fontSize: "14px",
              fontWeight: 500,
              borderRadius: "6px",
              border: "1px solid #d4d4d4",
              backgroundColor: "transparent",
              color: "#171717",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
