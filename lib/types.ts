export type Locale = "zh" | "en";

export type LocalizedText = Record<Locale, string>;

export type SiteProfile = {
  name: string;
  aliases: string[];
  role: LocalizedText;
  location: LocalizedText;
  email: string;
  github: string;
  gitee: string;
  bio: LocalizedText;
};

export type ProjectSource = "github" | "gitee";

export type Project = {
  source: ProjectSource;
  owner: string;
  repo: string;
  slug: string;
  url: string;
  description: string;
  language: string | null;
  stars: number;
  forks: number;
  updatedAt: string;
  homepage: string | null;
  topics: string[];
};

export type ProjectOverride = {
  slug: string;
  title?: Partial<LocalizedText>;
  summary?: Partial<LocalizedText>;
  logo?: string;
  featured?: boolean;
  hidden?: boolean;
  order?: number;
  tags?: string[];
};

export type ProjectView = Project & {
  title: string;
  summary: string;
  featured: boolean;
  hidden: boolean;
  order: number;
  tags: string[];
  logo?: string;
  monogram: string;
};

export type Post = {
  slug: string;
  locale: Locale;
  title: string;
  description: string;
  date: string;
  tags: string[];
  draft: boolean;
};
