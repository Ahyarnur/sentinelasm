import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SentinelASM",
  description: "Attack Surface Management dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
