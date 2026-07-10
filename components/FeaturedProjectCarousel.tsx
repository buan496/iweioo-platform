"use client";

import Link from "next/link";
import type { Locale, ProjectView } from "@/lib/types";

type FeaturedProjectCarouselProps = {
  locale: Locale;
  projects: ProjectView[];
  labels: {
    title: string;
    intro: string;
    allProjects: string;
    stars: string;
  };
};

type ProjectCardProps = {
  locale: Locale;
  project: ProjectView;
  starsLabel: string;
  duplicate?: boolean;
};

function FeaturedProjectCard({ locale, project, starsLabel, duplicate = false }: ProjectCardProps) {
  const handleCardPointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--spot-x", `${event.clientX - rect.left}px`);
    event.currentTarget.style.setProperty("--spot-y", `${event.clientY - rect.top}px`);
  };

  return (
    <article
      className="featured-project-card"
      data-cursor="interactive"
      onPointerMove={handleCardPointerMove}
    >
      <div className="project-card-topline">
        <div className="project-logo-slot" aria-hidden="true">
          {project.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={project.logo} alt="" />
          ) : (
            <span>{project.monogram}</span>
          )}
        </div>
        <span>{project.source}</span>
      </div>

      <Link
        className="featured-project-link"
        href={`/${locale}/projects/${project.slug}/`}
        tabIndex={duplicate ? -1 : undefined}
      >
        <h3>{project.title}</h3>
        <p>{project.summary}</p>
      </Link>

      <div className="tag-list">
        {project.tags.slice(0, 4).map((tag) => (
          <span className="tag" key={tag}>
            {tag}
          </span>
        ))}
      </div>

      <div className="card-footer">
        <span>{project.language ?? "Code"}</span>
        <span>
          {starsLabel}: {project.stars}
        </span>
      </div>
    </article>
  );
}

export function FeaturedProjectCarousel({
  locale,
  projects,
  labels
}: FeaturedProjectCarouselProps) {
  if (projects.length === 0) {
    return null;
  }

  return (
    <section className="featured-section" aria-labelledby="featured-projects-title">
      <div className="shell">
        <div className="section-head featured-head">
          <div>
            <p className="section-kicker">Selected Systems</p>
            <h2 id="featured-projects-title">{labels.title}</h2>
            <p>{labels.intro}</p>
          </div>
          <div className="carousel-actions" aria-label="Featured projects actions">
            <Link className="button secondary rail-link" href={`/${locale}/projects/`}>
              {labels.allProjects}
            </Link>
          </div>
        </div>
      </div>

      <div className="featured-carousel-shell auto-rail" data-cursor="interactive">
        <ul className="featured-carousel auto-rail-track" role="list">
          {[0, 1].map((groupIndex) => (
            <li
              className="auto-rail-group"
              key={groupIndex}
              aria-hidden={groupIndex > 0 ? "true" : undefined}
            >
              {projects.map((project) => (
                <div className="featured-slide" key={`${groupIndex}-${project.slug}`}>
                  <FeaturedProjectCard
                    locale={locale}
                    project={project}
                    starsLabel={labels.stars}
                    duplicate={groupIndex > 0}
                  />
                </div>
              ))}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
