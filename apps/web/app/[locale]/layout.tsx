import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { dictionary, isLocale, locales, otherLocale } from "@/lib/i18n";
import { siteProfile } from "@/data/site";
import type { Locale } from "@/lib/types";
import { CursorHalo } from "@/components/CursorHalo";

type LocaleLayoutProps = {
  children: React.ReactNode;
  params: Promise<{
    locale: string;
  }>;
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale: localeParam } = await params;
  if (!isLocale(localeParam)) {
    notFound();
  }

  const locale: Locale = localeParam;
  const copy = dictionary[locale];
  const links = [
    { href: `/${locale}/`, label: copy.nav.home },
    { href: `/${locale}/#products`, label: copy.nav.products },
    { href: `/${locale}/projects/`, label: copy.nav.projects },
    { href: `/${locale}/blog/`, label: copy.nav.blog },
    { href: `/${locale}/about/`, label: copy.nav.about }
  ];

  return (
    <>
      <CursorHalo />
      <header className="site-header">
        <nav className="shell nav" aria-label="Primary">
          <Link className="brand" href={`/${locale}/`}>
            <Image className="brand-mark" src="/logo.png" alt="iweioo" width={60} height={60} />
            <span className="brand-copy">
              <strong>iweioo</strong>
              <span>{copy.brandSubtitle}</span>
            </span>
          </Link>
          <div className="nav-links">
            {links.map((link) => (
              <Link key={link.href} href={link.href}>
                {link.label}
              </Link>
            ))}
            <Link href={`/${otherLocale(locale)}/`}>{copy.nav.language}</Link>
          </div>
        </nav>
      </header>
      {children}
      <footer className="footer">
        <div className="shell">
          <span>© {new Date().getFullYear()} iweioo.com</span>
          <a href={`mailto:${siteProfile.email}`}>{siteProfile.email}</a>
        </div>
      </footer>
    </>
  );
}
