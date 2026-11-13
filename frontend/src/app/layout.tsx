
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VeriSync AI | Stay Current. Stay Certain.",
  description:
    "AI-powered verification of factual claims using live web evidence.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
