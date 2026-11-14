import type { Metadata, Viewport } from "next";
import { SiteFooter } from "@/components/site-footer";
import { PartnerRail } from "@/components/partner-rail";
import { SiteHeader } from "@/components/site-header";
import { ThemeProvider } from "@/components/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "1StopDesi — services, events, jobs and homes for the Desi community", template: "%s | 1StopDesi" },
  description:
    "Find trusted South Asian service providers, events, jobs and rentals across the USA, starting in Dallas–Fort Worth. Contact providers, apply and RSVP in one place.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f5f4" },
    { media: "(prefers-color-scheme: dark)", color: "#0c1a1c" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-dvh">
        <ThemeProvider>
          <SiteHeader />
          <div className="page-with-rail">
            <main id="main" className="min-w-0 xl:flex-1">{children}</main>
            <PartnerRail variant="rail" />
          </div>
          <PartnerRail variant="strip" />
          <SiteFooter />
        </ThemeProvider>
      </body>
    </html>
  );
}
