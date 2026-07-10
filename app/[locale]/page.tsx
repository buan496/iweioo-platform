import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { dictionary, isLocale } from "@/lib/i18n";
import { getFeaturedProjects } from "@/lib/projects";
import { getPosts } from "@/lib/posts";
import { siteProfile } from "@/data/site";
import type { Locale } from "@/lib/types";
import { ParticleBackdrop } from "@/components/ParticleBackdrop";
import { FeaturedProjectCarousel } from "@/components/FeaturedProjectCarousel";
import { HomeBridge } from "@/components/HomeBridge";
import { EditorialRail } from "@/components/EditorialRail";

type PageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: localeParam } = await params;
  const locale: Locale = isLocale(localeParam) ? localeParam : "zh";
  return {
    title: locale === "zh" ? "首页" : "Home",
    description: siteProfile.bio[locale],
    alternates: {
      canonical: `/${locale}/`,
      languages: {
        zh: "/zh/",
        en: "/en/"
      }
    }
  };
}

export default async function HomePage({ params }: PageProps) {
  const { locale: localeParam } = await params;
  const locale: Locale = isLocale(localeParam) ? localeParam : "zh";
  const copy = dictionary[locale];
  const featuredProjects = getFeaturedProjects(locale);
  const posts = getPosts(locale).slice(0, 3);

  return (
    <main className="home-page">
      <section className="apple-hero">
        <div className="particle-field" aria-hidden="true">
          <ParticleBackdrop />
        </div>
        <div className="shell home-hero-content">
          <Image className="hero-logo" src="/logo.png" alt="iweioo" width={184} height={184} priority />
          <p className="hero-kicker">{copy.home.eyebrow}</p>
          <h1 className="apple-hero-title">iweioo</h1>
          <p className="hero-copy">{copy.home.lead}</p>
          <p className="hero-copy hero-copy-en">{copy.home.supportingLead}</p>
          <div className="actions">
            <Link className="button" href={`/${locale}/projects/`}>
              {copy.home.primaryAction}
            </Link>
            <Link className="button secondary" href={`/${locale}/blog/`}>
              {copy.home.secondaryAction}
            </Link>
          </div>
          <div className="metrics" aria-label="Site metrics">
            <div className="metric">
              <strong>2</strong>
              <span>{copy.home.metrics.sources}</span>
            </div>
            <div className="metric">
              <strong>ZH / EN</strong>
              <span>{copy.home.metrics.locale}</span>
            </div>
            <div className="metric">
              <strong>out/</strong>
              <span>{copy.home.metrics.deploy}</span>
            </div>
          </div>
        </div>
      </section>

      <FeaturedProjectCarousel
        locale={locale}
        projects={featuredProjects}
        labels={{
          title: copy.home.featuredProjects,
          intro: copy.home.featuredIntro,
          allProjects: copy.nav.projects,
          stars: copy.common.stars
        }}
      />

      <HomeBridge title={copy.home.bridge.title} body={copy.home.bridge.body} />

      <section className="shell band writing-section">
        <div className="section-head writing-head">
          <div>
            <p className="section-kicker">Latest Writing</p>
            <h2>{copy.home.latestPosts}</h2>
            <p>{copy.home.latestIntro}</p>
          </div>
          <Link className="button secondary" href={`/${locale}/blog/`}>
            {copy.nav.blog}
          </Link>
        </div>
        {posts.length > 0 ? (
          <EditorialRail locale={locale} posts={posts} />
        ) : (
          <div className="empty">{copy.home.noPosts}</div>
        )}
      </section>
    </main>
  );
}
