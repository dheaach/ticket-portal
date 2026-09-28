import "./globals.css?v=1.0.1";

import { AntdRegistry } from "@ant-design/nextjs-registry";
import type { Metadata } from "next";
import Script from "next/script";

import { auth } from "@/auth";
// import { Geist, Geist_Mono } from "next/font/google";
import AntdProvider from "@/components/providers/AntdProvider";
import { getAppSettings } from "@/lib/app-settings";

const themeInitScript = `
(function(){
  try {
    var k = 'deskteam-theme';
    var s = localStorage.getItem(k) || 'system';
    var dark = s === 'dark' || (s !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  } catch (e) {}
})();`;

// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// });

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://app.efectiveseo.com'

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getAppSettings()
  const appName = settings.app_name || process.env.NEXT_PUBLIC_APP_NAME || 'EfectiveSEO'
  const description =
    process.env.NEXT_PUBLIC_APP_DESCRIPTION ||
    `${appName} ticket portal — manage support tickets, teams, and customer work in one place.`
  const logoUrl = settings.app_logo_url || settings.app_favicon_url || '/logo.jpg'
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: appName, template: `%s | ${appName}` },
    description,
    manifest: '/manifest.json',
    icons: settings.app_favicon_url ? [{ url: settings.app_favicon_url }] : undefined,
    openGraph: {
      title: appName,
      description,
      url: SITE_URL,
      siteName: appName,
      images: [{ url: logoUrl, alt: appName }],
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title: appName,
      description,
      images: [logoUrl],
    },
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth()
  return (
    // Browser extensions (Grammarly, password managers) mutate the DOM before hydrate; suppress root warnings.
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        // className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Script id="deskteam-theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
        <AntdRegistry>
          <AntdProvider session={session}>
            {children}
          </AntdProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
