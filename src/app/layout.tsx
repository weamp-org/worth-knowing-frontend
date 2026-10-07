import { ClerkProvider } from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif, Inter } from "next/font/google";

import { QueryProvider } from "@/components/query-provider";
import { ScrollToTop } from "@/components/scroll-to-top";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { AuthTokenSetter } from "@/lib/auth-token-setter";
import { SITE_NAME, SITE_TAGLINE, siteUrl } from "@/lib/site";
import { cn } from "@/lib/utils";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const instrumentSerifHeading = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-heading",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * Site-wide metadata defaults.
 *
 * **`robots: { index: false, follow: true }` is the important line.** Everything
 * under this layout is a page, and most of them are somebody's saved list,
 * settings form, or edit form — none of which belongs in a search result. The
 * six public routes opt back in explicitly, which means a new route is
 * non-indexable by default rather than indexable by omission.
 *
 * `noindex` rather than relying on `robots.ts`, and the distinction matters: a
 * `Disallow` stops a crawler spending a request but a URL that is *linked* can
 * still be indexed without a snippet, whereas `noindex` is what actually keeps a
 * page out of results. The two are complementary and both are in place.
 *
 * `follow: true` alongside it, so a crawler reading a link on a non-indexable
 * page still follows it onward to one that is.
 */
export const metadata: Metadata = {
  metadataBase: siteUrl() ?? undefined,
  title: SITE_NAME,
  description: SITE_TAGLINE,
  robots: { index: false, follow: true },
  /**
   * iOS home-screen behaviour.
   *
   * iOS ignores the manifest's `display: "standalone"` (support varies by
   * version), so without this a home-screen launch opens in a Safari tab
   * instead of the standalone app window. `capable: true` opts into the
   * standalone window; `statusBarStyle: "default"` keeps the iOS status bar
   * consistent with the page rather than floating white text over content.
   * No `startupImage`: the app launches into a live feed, not a splash.
   */
  appleWebApp: { capable: true, statusBarStyle: "default" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_TAGLINE,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_TAGLINE,
  },
};

/**
 * Browser chrome tint, matching the app background in each color scheme.
 *
 * `themeColor` with a `media` per scheme is what keeps the mobile address bar
 * and the PWA task switcher from flashing a default grey that belongs to
 * neither theme. The values mirror `--background` in `globals.css` — white in
 * light mode, near-black in dark — so the chrome reads as an extension of the
 * page rather than a frame around it.
 */
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#171717" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "h-full",
        "antialiased",
        geistSans.variable,
        geistMono.variable,
        "font-sans",
        inter.variable,
        instrumentSerifHeading.variable,
      )}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ClerkProvider>
            <QueryProvider>
              <AuthTokenSetter>
                {/* First tab stop on the page. With a sticky header, keyboard
                    users would otherwise tab through the nav on every route. */}
                <a
                  href="#main"
                  className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-60 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-xs focus:font-semibold focus:text-primary-foreground"
                >
                  Skip to content
                </a>
                <SiteHeader />
                {/*
                  `flex flex-col` so the centred pages — the error boundary,
                  the 404, and the loading spinner — can actually centre. They
                  all carry `flex-1 justify-center` on their root, which does
                  nothing unless their parent is a flex container: `main` was a
                  plain block, so the child sized to its content and the
                  "Something went wrong" text sat directly under the header.
                */}
                <main id="main" className="flex flex-1 flex-col">
                  {children}
                </main>
                <SiteFooter />
                <Toaster />
                <ScrollToTop />
                <ServiceWorkerRegistration />
                <Analytics />
                <SpeedInsights />
              </AuthTokenSetter>
            </QueryProvider>
          </ClerkProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
