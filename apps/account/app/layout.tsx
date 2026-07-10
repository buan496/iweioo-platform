import type { Metadata } from "next";
import { iweiooTokens } from "@iweioo/ui";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://account.iweioo.com"),
  title: {
    default: "Account | iweioo",
    template: "%s | iweioo Account"
  },
  description: "Identity, profile, consent, and session controls for iweioo students.",
  robots: {
    index: false,
    follow: false
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const theme = {
    "--iweioo-accent": iweiooTokens.color.accent,
    "--iweioo-accent-soft": iweiooTokens.color.accentSoft
  } as React.CSSProperties;

  return (
    <html lang="zh">
      <body style={theme}>{children}</body>
    </html>
  );
}
