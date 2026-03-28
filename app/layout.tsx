import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Printora — Cetak hemat, kualitas hebat",
  description: "Order print online lokal yang modern, cepat, dan transparan."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}