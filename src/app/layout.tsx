import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RxAudit — Pharmacy Bill Price Auditor",
  description:
    "Check if your pharmacy bill exceeds NPPA ceiling prices. Upload a bill, get a line-by-line audit with regulatory citations and generic alternatives.",
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
