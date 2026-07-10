import type { Locale } from "@/lib/types";

export const locales: Locale[] = ["zh", "en"];

export const defaultLocale: Locale = "zh";

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export function otherLocale(locale: Locale): Locale {
  return locale === "zh" ? "en" : "zh";
}

export const dictionary = {
  zh: {
    brandSubtitle: "个人博客与作品集",
    nav: {
      home: "首页",
      projects: "项目",
      blog: "文章",
      about: "关于",
      language: "English"
    },
    home: {
      eyebrow: "iweioo.com",
      title: "iweioo",
      lead:
        "一个面向 AI 应用、工程实践与个人成长记录的双语作品集。",
      supportingLead:
        "A bilingual portfolio for AI applications, engineering practice, and long-form learning notes.",
      primaryAction: "View Projects",
      secondaryAction: "Read Blog",
      featuredProjects: "精选项目",
      featuredIntro: "精选 4 个重点项目，用公开仓库数据和本地双语摘要共同呈现。",
      latestPosts: "最新文章",
      latestIntro: "文章使用 MDX 管理，后续可以持续加入项目复盘、学习笔记和履历内容。",
      noPosts: "还没有发布文章。可以先在 content/posts/zh 添加 MDX 文件。",
      bridge: {
        title: "从构建到思考",
        body: "我先做真实系统，再把工程经验沉淀成文章。"
      },
      metrics: {
        sources: "代码托管来源",
        locale: "中英双语结构",
        deploy: "静态导出部署"
      }
    },
    projects: {
      title: "项目",
      lead: "公开仓库会在构建前同步到本地数据文件，页面展示使用同步字段和人工补充字段合并后的结果。",
      empty: "暂时没有可展示项目。运行 npm run sync:projects 后会从 GitHub 与 Gitee 同步公开仓库。"
    },
    blog: {
      title: "文章",
      lead: "用于记录技术实践、项目复盘和后续补充的学习/履历内容。",
      empty: "暂时没有已发布文章。"
    },
    about: {
      title: "关于",
      lead: "这里是公开身份、联系方式、技能方向和学历履历的入口。",
      education: "学历",
      educationPending: "学历内容待后续补充。",
      contact: "联系",
      profiles: "公开主页"
    },
    common: {
      source: "来源",
      updated: "更新",
      stars: "星标",
      forks: "分支",
      read: "阅读",
      viewRepo: "查看仓库",
      homepage: "项目主页",
      backToBlog: "返回文章",
      backToProjects: "返回项目"
    }
  },
  en: {
    brandSubtitle: "Personal blog and portfolio",
    nav: {
      home: "Home",
      projects: "Projects",
      blog: "Writing",
      about: "About",
      language: "中文"
    },
    home: {
      eyebrow: "iweioo.com",
      title: "iweioo",
      lead:
        "A bilingual portfolio for AI applications, engineering practice, and long-form learning notes.",
      supportingLead:
        "一个面向 AI 应用、工程实践与个人成长记录的双语作品集。",
      primaryAction: "View Projects",
      secondaryAction: "Read Blog",
      featuredProjects: "Featured projects",
      featuredIntro:
        "Four focused projects, presented with synced repository data and local bilingual summaries.",
      latestPosts: "Latest writing",
      latestIntro:
        "Posts are managed as MDX so project writeups, notes, and resume content can grow over time.",
      noPosts: "No published posts yet. Add MDX files under content/posts/en.",
      bridge: {
        title: "From Building to Thinking",
        body: "I build systems first, then write down what they taught me."
      },
      metrics: {
        sources: "code sources",
        locale: "bilingual structure",
        deploy: "static export"
      }
    },
    projects: {
      title: "Projects",
      lead:
        "Public repositories are synced before build and rendered from normalized metadata plus local editorial overrides.",
      empty:
        "No projects are visible yet. Run npm run sync:projects to sync public repositories from GitHub and Gitee."
    },
    blog: {
      title: "Writing",
      lead: "Technical notes, project retrospectives, and future education/career updates.",
      empty: "No published posts yet."
    },
    about: {
      title: "About",
      lead: "Public identity, contact details, technical direction, and education placeholders.",
      education: "Education",
      educationPending: "Education details will be added later.",
      contact: "Contact",
      profiles: "Profiles"
    },
    common: {
      source: "Source",
      updated: "Updated",
      stars: "Stars",
      forks: "Forks",
      read: "Read",
      viewRepo: "Repository",
      homepage: "Homepage",
      backToBlog: "Back to writing",
      backToProjects: "Back to projects"
    }
  }
} as const;
