import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://iweioo.com"),
  title: {
    default: "iweioo",
    template: "%s | iweioo"
  },
  description: "A bilingual portfolio and technical blog by Jing Wang.",
  alternates: {
    canonical: "/"
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh">
      <body>{children}</body>
    </html>
  );
}
