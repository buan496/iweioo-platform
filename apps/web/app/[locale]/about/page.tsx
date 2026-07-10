import type { Metadata } from "next";
import { dictionary, isLocale } from "@/lib/i18n";
import { siteProfile } from "@/data/site";
import type { Locale } from "@/lib/types";

type PageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: localeParam } = await params;
  const locale: Locale = isLocale(localeParam) ? localeParam : "zh";
  return {
    title: dictionary[locale].about.title,
    description: siteProfile.bio[locale],
    alternates: {
      canonical: `/${locale}/about/`
    }
  };
}

export default async function AboutPage({ params }: PageProps) {
  const { locale: localeParam } = await params;
  const locale: Locale = isLocale(localeParam) ? localeParam : "zh";
  const copy = dictionary[locale];

  return (
    <main className="inner-page">
      <section className="shell inner-hero">
        <p className="eyebrow">{siteProfile.role[locale]}</p>
        <h1>{copy.about.title}</h1>
        <p className="lead">{copy.about.lead}</p>
      </section>

      <section className="shell band split">
        <div>
          <h2>{siteProfile.name}</h2>
          <p>{siteProfile.bio[locale]}</p>
          <div className="tag-list">
            {siteProfile.aliases.map((alias) => (
              <span className="tag" key={alias}>
                {alias}
              </span>
            ))}
          </div>
        </div>
        <div className="timeline">
          <div className="timeline-item">
            <h3>{copy.about.contact}</h3>
            <p>
              <a href={`mailto:${siteProfile.email}`}>{siteProfile.email}</a>
            </p>
          </div>
          <div className="timeline-item">
            <h3>{copy.about.profiles}</h3>
            <p>
              <a href={siteProfile.github}>GitHub</a> · <a href={siteProfile.gitee}>Gitee</a>
            </p>
          </div>
          <div className="timeline-item">
            <h3>{copy.about.education}</h3>
            <p>{copy.about.educationPending}</p>
          </div>
        </div>
      </section>
    </main>
  );
}
