import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "My to-dos" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN">
      <body>{children}</body>
    </html>
  );
}
