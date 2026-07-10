import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { dictionary, isLocale, locales } from "@/lib/i18n";
import { getProject, getProjects } from "@/lib/projects";
import type { Locale } from "@/lib/types";

type PageProps = {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
};

export function generateStaticParams() {
  return locales.flatMap((locale) =>
    getProjects(locale).map((project) => ({
      locale,
      slug: project.slug
    }))
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: localeParam, slug } = await params;
  const locale: Locale = isLocale(localeParam) ? localeParam : "zh";
  const project = getProject(locale, slug);

  if (!project) {
    return {};
  }

  return {
    title: project.title,
    description: project.summary,
    alternates: {
      canonical: `/${locale}/projects/${project.slug}/`
    }
  };
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const { locale: localeParam, slug } = await params;
  if (!isLocale(localeParam)) {
    notFound();
  }

  const locale: Locale = localeParam;
  const copy = dictionary[locale];
  const project = getProject(locale, slug);

  if (!project) {
    notFound();
  }

  return (
    <main className="inner-page">
      <section className="shell inner-hero">
        <p className="eyebrow">{project.source}</p>
        <h1>{project.title}</h1>
        <p className="lead">{project.summary}</p>

        <div className="actions">
          <a className="button" href={project.url}>
            {copy.common.viewRepo}
          </a>
          {project.homepage ? (
            <a className="button secondary" href={project.homepage}>
              {copy.common.homepage}
            </a>
          ) : null}
        </div>
      </section>

      <section className="shell band split">
        <div>
          <h2>{project.repo}</h2>
          <p className="muted">
            {copy.common.updated}: {new Date(project.updatedAt).toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US")}
          </p>
        </div>
        <div className="timeline">
          <div className="timeline-item">
            <h3>{copy.common.source}</h3>
            <p>
              {project.owner} / {project.repo}
            </p>
          </div>
          <div className="timeline-item">
            <h3>{copy.common.stars}</h3>
            <p>{project.stars}</p>
          </div>
          <div className="timeline-item">
            <h3>{copy.common.forks}</h3>
            <p>{project.forks}</p>
          </div>
          <div className="tag-list">
            {project.tags.map((tag) => (
              <span className="tag" key={tag}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      <div className="shell">
        <Link className="text-link" href={`/${locale}/projects/`}>{copy.common.backToProjects}</Link>
      </div>
    </main>
  );
}
