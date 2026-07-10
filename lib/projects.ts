import { readFileSync } from "node:fs";
import { join } from "node:path";
import { projectOverrides } from "@/data/project-overrides";
import type { Locale, Project, ProjectOverride, ProjectView } from "@/lib/types";

const projectsFile = join(process.cwd(), "public", "data", "projects.json");

function getMonogram(title: string, repo: string): string {
  const source = title || repo;
  const asciiParts = source.match(/[A-Za-z0-9]+/g);
  if (asciiParts && asciiParts.length > 1) {
    return asciiParts
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  }

  const first = Array.from(source.trim())[0] ?? "I";
  return first.toUpperCase();
}

export function readProjects(): Project[] {
  try {
    return JSON.parse(readFileSync(projectsFile, "utf8")) as Project[];
  } catch {
    return [];
  }
}

export function applyProjectOverrides(
  projects: Project[],
  locale: Locale,
  overrides: ProjectOverride[] = projectOverrides
): ProjectView[] {
  const overrideBySlug = new Map(overrides.map((override) => [override.slug, override]));

  return projects
    .map((project) => {
      const override = overrideBySlug.get(project.slug);
      const title = override?.title?.[locale] ?? project.repo;
      const summary =
        override?.summary?.[locale] ??
        project.description ??
        (locale === "zh" ? "暂无项目简介。" : "No project description yet.");

      return {
        ...project,
        title,
        summary,
        featured: override?.featured ?? false,
        hidden: override?.hidden ?? false,
        order: override?.order ?? 999,
        tags: override?.tags ?? project.topics ?? [],
        logo: override?.logo,
        monogram: getMonogram(title, project.repo)
      };
    })
    .filter((project) => !project.hidden)
    .sort((a, b) => a.order - b.order || Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

export function getProjects(locale: Locale): ProjectView[] {
  return applyProjectOverrides(readProjects(), locale);
}

export function getFeaturedProjects(locale: Locale): ProjectView[] {
  return getProjects(locale)
    .filter((project) => project.featured)
    .slice(0, 4);
}

export function getProject(locale: Locale, slug: string): ProjectView | undefined {
  return getProjects(locale).find((project) => project.slug === slug);
}
