import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import type { Locale, Post } from "@/lib/types";

const postsRoot = join(process.cwd(), "content", "posts");

type Frontmatter = {
  title?: string;
  description?: string;
  date?: string;
  tags?: string[];
  draft?: boolean;
};

export type PostWithBody = Post & {
  body: string;
};

export function getPostDirectory(locale: Locale): string {
  return join(postsRoot, locale);
}

export function getPosts(locale: Locale, includeDrafts = false): Post[] {
  const directory = getPostDirectory(locale);
  if (!existsSync(directory)) {
    return [];
  }

  return readdirSync(directory)
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => {
      const slug = file.replace(/\.mdx$/, "");
      const raw = readFileSync(join(directory, file), "utf8");
      const { data } = matter(raw);
      const frontmatter = data as Frontmatter;

      return {
        slug,
        locale,
        title: frontmatter.title ?? slug,
        description: frontmatter.description ?? "",
        date: frontmatter.date ?? "1970-01-01",
        tags: frontmatter.tags ?? [],
        draft: frontmatter.draft ?? false
      };
    })
    .filter((post) => includeDrafts || !post.draft)
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
}

export function getPost(locale: Locale, slug: string): PostWithBody | undefined {
  const file = join(getPostDirectory(locale), `${slug}.mdx`);
  if (!existsSync(file)) {
    return undefined;
  }

  const raw = readFileSync(file, "utf8");
  const { data, content } = matter(raw);
  const frontmatter = data as Frontmatter;
  const post: PostWithBody = {
    slug,
    locale,
    title: frontmatter.title ?? slug,
    description: frontmatter.description ?? "",
    date: frontmatter.date ?? "1970-01-01",
    tags: frontmatter.tags ?? [],
    draft: frontmatter.draft ?? false,
    body: content
  };

  if (post.draft) {
    return undefined;
  }

  return post;
}
