import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  normalizeGiteeRepo,
  normalizeGitHubRepo,
  sortProjects
} from "@/lib/sync";
import type { Project } from "@/lib/types";

const githubUser = process.env.GITHUB_USER ?? "buan496";
const giteeUser = process.env.GITEE_USER ?? "wang-jing26";
const outputFile = join(process.cwd(), "public", "data", "projects.json");

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "iweioo-platform-sync",
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} from ${url}`);
  }

  return (await response.json()) as T;
}

async function fetchGitHubProjects(): Promise<Project[]> {
  type GitHubRepo = Parameters<typeof normalizeGitHubRepo>[1];
  const repos = await fetchJson<GitHubRepo[]>(
    `https://api.github.com/users/${githubUser}/repos?sort=updated&per_page=100`
  );
  return repos.filter((repo) => !repo.fork).map((repo) => normalizeGitHubRepo(githubUser, repo));
}

async function fetchGiteeProjects(): Promise<Project[]> {
  type GiteeRepo = Parameters<typeof normalizeGiteeRepo>[1];
  const repos = await fetchJson<GiteeRepo[]>(
    `https://gitee.com/api/v5/users/${giteeUser}/repos?type=all&sort=updated&per_page=100&page=1`
  );
  return repos.filter((repo) => !repo.fork).map((repo) => normalizeGiteeRepo(giteeUser, repo));
}

function readExistingProjects(): Project[] {
  try {
    return JSON.parse(readFileSync(outputFile, "utf8")) as Project[];
  } catch {
    return [];
  }
}

async function main() {
  const settled = await Promise.allSettled([fetchGitHubProjects(), fetchGiteeProjects()]);
  const projects = settled.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
  const failures = settled.filter((result) => result.status === "rejected");

  if (failures.length > 0) {
    for (const failure of failures) {
      if (failure.status === "rejected") {
        console.warn(`[sync:projects] ${failure.reason}`);
      }
    }
  }

  const nextProjects = projects.length > 0 ? sortProjects(projects) : readExistingProjects();
  mkdirSync(dirname(outputFile), { recursive: true });
  writeFileSync(`${outputFile}`, `${JSON.stringify(nextProjects, null, 2)}\n`);
  console.log(`[sync:projects] wrote ${nextProjects.length} projects to public/data/projects.json`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
