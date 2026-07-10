import assert from "node:assert/strict";
import test from "node:test";
import { applyProjectOverrides } from "@/lib/projects";
import {
  makeProjectSlug,
  normalizeGiteeRepo,
  normalizeGitHubRepo,
  sortProjects
} from "@/lib/sync";
import type { Project } from "@/lib/types";

test("makeProjectSlug normalizes source and repository names", () => {
  assert.equal(makeProjectSlug("github", "CLA-LIDNet"), "github-cla-lidnet");
  assert.equal(makeProjectSlug("gitee", "Django_Vue_web"), "gitee-django-vue-web");
});

test("repository normalization maps GitHub and Gitee fields into Project", () => {
  const github = normalizeGitHubRepo("buan496", {
    name: "demo",
    html_url: "https://github.com/buan496/demo",
    description: null,
    language: "TypeScript",
    stargazers_count: 3,
    forks_count: 1,
    updated_at: "2026-01-02T00:00:00Z",
    homepage: "",
    topics: ["nextjs"]
  });

  const gitee = normalizeGiteeRepo("wang-jing26", {
    name: "ScP",
    html_url: "https://gitee.com/wang-jing26/ScP",
    description: "成绩管理系统",
    language: "Java",
    stargazers_count: 1,
    forks_count: 0,
    updated_at: "2026-01-01T00:00:00Z",
    homepage: null
  });

  assert.equal(github.slug, "github-demo");
  assert.equal(github.homepage, null);
  assert.deepEqual(github.topics, ["nextjs"]);
  assert.equal(gitee.slug, "gitee-scp");
  assert.equal(gitee.description, "成绩管理系统");
});

test("project overrides hide, localize, tag, and order projects", () => {
  const projects: Project[] = [
    {
      source: "github",
      owner: "buan496",
      repo: "visible",
      slug: "github-visible",
      url: "https://example.com/visible",
      description: "Visible repo",
      language: "TypeScript",
      stars: 0,
      forks: 0,
      updatedAt: "2026-01-01T00:00:00Z",
      homepage: null,
      topics: []
    },
    {
      source: "github",
      owner: "buan496",
      repo: "hidden",
      slug: "github-hidden",
      url: "https://example.com/hidden",
      description: "Hidden repo",
      language: null,
      stars: 0,
      forks: 0,
      updatedAt: "2026-01-03T00:00:00Z",
      homepage: null,
      topics: []
    }
  ];

  const views = applyProjectOverrides(projects, "zh", [
    {
      slug: "github-visible",
      title: { zh: "可见项目" },
      summary: { zh: "中文摘要" },
      order: 1,
      featured: true,
      tags: ["Demo"]
    },
    {
      slug: "github-hidden",
      hidden: true
    }
  ]);

  assert.equal(views.length, 1);
  assert.equal(views[0].title, "可见项目");
  assert.equal(views[0].summary, "中文摘要");
  assert.equal(views[0].featured, true);
  assert.deepEqual(views[0].tags, ["Demo"]);
});

test("sortProjects sorts by newest update first", () => {
  const older = {
    slug: "old",
    updatedAt: "2026-01-01T00:00:00Z"
  } as Project;
  const newer = {
    slug: "new",
    updatedAt: "2026-01-02T00:00:00Z"
  } as Project;

  assert.deepEqual(
    sortProjects([older, newer]).map((project) => project.slug),
    ["new", "old"]
  );
});
