import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AccountDashboard } from "@/components/AccountDashboard";
import { accountCopy, isAccountLocale } from "@/lib/i18n";

type AccountPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: AccountPageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isAccountLocale(locale)) {
    return {};
  }
  return {
    title: locale === "zh" ? "账户中心" : "Account Center",
    description: accountCopy[locale].lead,
    alternates: {
      canonical: `/${locale}/`,
      languages: { zh: "/zh/", en: "/en/" }
    }
  };
}

export default async function AccountPage({ params }: AccountPageProps) {
  const { locale } = await params;
  if (!isAccountLocale(locale)) {
    notFound();
  }
  const copy = accountCopy[locale];

  return (
    <main className="account-main">
      <section className="account-hero account-shell">
        <p className="account-eyebrow">{copy.eyebrow}</p>
        <h1>{copy.title}</h1>
        <p>{copy.lead}</p>
      </section>
      <section className="account-shell account-content">
        <AccountDashboard locale={locale} />
      </section>
    </main>
  );
}
