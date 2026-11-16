import type { Metadata } from "next";
import "./globals.css";
import "./board/styles/buttons.css";
import "./board/styles/access.css";
import "./board/styles/dialogs.css";
import { THEME_INIT_SCRIPT } from "./theme";
import { siteUrl, SITE_DESCRIPTION, SITE_NAME, SOCIAL_IMAGE } from "../lib/domain/site";

const socialImage = {
  url: new URL(SOCIAL_IMAGE.path, siteUrl).toString(),
  width: SOCIAL_IMAGE.width,
  height: SOCIAL_IMAGE.height,
  alt: SOCIAL_IMAGE.alt,
};

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: SITE_NAME,
  description: SITE_DESCRIPTION,
  icons: { icon: "/favicon.svg" },
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: siteUrl,
    siteName: SITE_NAME,
    locale: "es_ES",
    type: "website",
    images: [socialImage],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [socialImage],
  },
};

/**
 * Layout raíz con metadatos y hojas de estilo.
 * Las fuentes se autohospedan en `public/fonts` y se declaran en `globals.css`.
 * @param props - Contenido de la página.
 * @returns El documento HTML de la aplicación.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
