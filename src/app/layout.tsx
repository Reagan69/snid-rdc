import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Newsreader, Source_Sans_3 } from "next/font/google";
import "./globals.css";

// Polices auto-hébergées par Next.js (aucune requête vers Google au chargement des pages : compatible avec la CSP).
const body = Source_Sans_3({ subsets: ["latin", "latin-ext"], variable: "--font-body", display: "swap" });
const title = Newsreader({ subsets: ["latin", "latin-ext"], variable: "--font-title", display: "swap" });

export const metadata: Metadata = {
  title: { default: "SNID-RDC", template: "%s · SNID-RDC" },
  description: "Système National d'Identification Numérique de la République démocratique du Congo",
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0e2a47" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Lire les en-têtes rend toutes les pages dynamiques : indispensable pour que le nonce CSP soit appliqué.
  await headers();
  return (
    <html lang="fr" className={`${body.variable} ${title.variable}`}>
      <body>{children}</body>
    </html>
  );
}
