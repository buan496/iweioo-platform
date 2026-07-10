import Link from "next/link";
import { notFound } from "next/navigation";
import { accountCopy, accountLocales, isAccountLocale } from "@/lib/i18n";

type LocaleLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

const DEFAULT_PORTAL_URL = "https://iweioo.com";

function portalUrl(): string {
  const configured = process.env.NEXT_PUBLIC_PORTAL_URL ?? DEFAULT_PORTAL_URL;
  try {
    const url = new URL(configured);
    const isLocalHttp =
      process.env.NODE_ENV !== "production" &&
      url.protocol === "http:" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1");
    return url.protocol === "https:" || isLocalHttp ? url.origin : DEFAULT_PORTAL_URL;
  } catch {
    return DEFAULT_PORTAL_URL;
  }
}

export function generateStaticParams() {
  return accountLocales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;
  if (!isAccountLocale(locale)) {
    notFound();
  }
  const copy = accountCopy[locale];
  const portalOrigin = portalUrl();

  return (
    <>
      <header className="account-header">
        <nav className="account-shell account-nav" aria-label="Account navigation">
          <Link className="account-brand" href={`/${locale}/`}>
            <span className="account-brand-mark" aria-hidden="true">i</span>
            <span>
              <strong>iweioo</strong>
              <small>Account</small>
            </span>
          </Link>
          <div className="account-nav-links">
            <a href={portalOrigin}>{copy.portal}</a>
            <Link href={`/${locale === "zh" ? "en" : "zh"}/`}>{copy.language}</Link>
          </div>
        </nav>
      </header>
      {children}
      <footer className="account-footer">
        <div className="account-shell">
          <span>© {new Date().getFullYear()} iweioo</span>
          <span>{copy.foundation}</span>
        </div>
      </footer>
    </>
  );
}
