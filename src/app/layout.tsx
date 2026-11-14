import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "SNID-RDC", template: "%s · SNID-RDC" },
  description: "Système National d'Identification Numérique de la République démocratique du Congo",
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0369a1" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Lire les en-têtes rend toutes les pages dynamiques : indispensable pour que le nonce CSP soit appliqué.
  await headers();
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
