import type { MetadataRoute } from "next";
import { locales } from "@/lib/i18n";
import { getProjects } from "@/lib/projects";
import { getPosts } from "@/lib/posts";

const baseUrl = "https://iweioo.com";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = locales.flatMap((locale) =>
    ["", "projects", "blog", "about"].map((path) => ({
      url: `${baseUrl}/${locale}/${path}`.replace(/\/$/, "/"),
      lastModified: new Date()
    }))
  );

  const projectRoutes = locales.flatMap((locale) =>
    getProjects(locale).map((project) => ({
      url: `${baseUrl}/${locale}/projects/${project.slug}/`,
      lastModified: new Date(project.updatedAt)
    }))
  );

  const postRoutes = locales.flatMap((locale) =>
    getPosts(locale).map((post) => ({
      url: `${baseUrl}/${locale}/blog/${post.slug}/`,
      lastModified: new Date(post.date)
    }))
  );

  return [...staticRoutes, ...projectRoutes, ...postRoutes];
}
