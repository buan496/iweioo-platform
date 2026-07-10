import Link from "next/link";
import type { Metadata } from "next";
import { dictionary, isLocale } from "@/lib/i18n";
import { getProjects } from "@/lib/projects";
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
    title: dictionary[locale].projects.title,
    description: dictionary[locale].projects.lead,
    alternates: {
      canonical: `/${locale}/projects/`
    }
  };
}

export default async function ProjectsPage({ params }: PageProps) {
  const { locale: localeParam } = await params;
  const locale: Locale = isLocale(localeParam) ? localeParam : "zh";
  const copy = dictionary[locale];
  const projects = getProjects(locale);

  return (
    <main className="inner-page">
      <section className="shell inner-hero">
        <p className="eyebrow">Portfolio</p>
        <h1>{copy.projects.title}</h1>
        <p className="lead">{copy.projects.lead}</p>
      </section>

      <section className="shell band">
        {projects.length > 0 ? (
          <div className="grid inner-card-grid">
            {projects.map((project) => (
              <article className="card" key={project.slug}>
                <div>
                  <h3>
                    <Link href={`/${locale}/projects/${project.slug}/`}>{project.title}</Link>
                  </h3>
                  <p>{project.summary}</p>
                </div>
                <div className="tag-list">
                  {project.tags.slice(0, 5).map((tag) => (
                    <span className="tag" key={tag}>
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="card-footer">
                  <span>{project.source}</span>
                  <span>{project.language ?? "Code"}</span>
                  <span>
                    {copy.common.stars}: {project.stars}
                  </span>
                  <span>
                    {copy.common.forks}: {project.forks}
                  </span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty">{copy.projects.empty}</div>
        )}
      </section>
    </main>
  );
}
