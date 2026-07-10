import type { Project, ProjectSource } from "@/lib/types";

type GitHubRepo = {
  name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  homepage: string | null;
  topics?: string[];
  fork?: boolean;
};

type GiteeRepo = {
  name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  homepage: string | null;
  fork?: boolean;
};

export function slugifyPart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function makeProjectSlug(source: ProjectSource, repo: string): string {
  return `${source}-${slugifyPart(repo)}`;
}

export function normalizeGitHubRepo(owner: string, repo: GitHubRepo): Project {
  return {
    source: "github",
    owner,
    repo: repo.name,
    slug: makeProjectSlug("github", repo.name),
    url: repo.html_url,
    description: repo.description ?? "",
    language: repo.language,
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    updatedAt: repo.updated_at,
    homepage: repo.homepage || null,
    topics: repo.topics ?? []
  };
}

export function normalizeGiteeRepo(owner: string, repo: GiteeRepo): Project {
  return {
    source: "gitee",
    owner,
    repo: repo.name,
    slug: makeProjectSlug("gitee", repo.name),
    url: repo.html_url,
    description: repo.description ?? "",
    language: repo.language,
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    updatedAt: repo.updated_at,
    homepage: repo.homepage || null,
    topics: []
  };
}

export function sortProjects(projects: Project[]): Project[] {
  return [...projects].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}
