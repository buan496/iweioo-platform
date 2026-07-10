import type { ProductApplicationId } from "@iweioo/sdk";
import type { Locale } from "@/lib/types";

type LocalizedText = Record<Locale, string>;

export type ProductApplication = {
  appId: ProductApplicationId;
  hostname: string;
  href: string;
  status: "planned" | "available";
  title: LocalizedText;
  description: LocalizedText;
};

export const productApplications: readonly ProductApplication[] = [
  {
    appId: "interview",
    hostname: "interview.iweioo.com",
    href: "https://interview.iweioo.com/",
    status: "planned",
    title: {
      zh: "大厂面试训练",
      en: "Technical Interview Training"
    },
    description: {
      zh: "围绕八股知识、模拟面试、错题复盘与能力画像构建的 AI 训练产品。",
      en: "AI-guided knowledge drills, mock interviews, review, and skill profiling."
    }
  },
  {
    appId: "defense",
    hostname: "defense.iweioo.com",
    href: "https://defense.iweioo.com/",
    status: "planned",
    title: {
      zh: "论文答辩 Agent",
      en: "Thesis Defense Agent"
    },
    description: {
      zh: "从论文材料理解、问答演练到答辩复盘的一体化 AI 助手。",
      en: "An AI assistant for thesis understanding, defense rehearsal, and review."
    }
  }
] as const;
