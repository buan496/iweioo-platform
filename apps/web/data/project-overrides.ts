import type { ProjectOverride } from "@/lib/types";

export const projectOverrides: ProjectOverride[] = [
  {
    slug: "github-buan496",
    title: {
      zh: "AI Agent 与自动化项目集合",
      en: "AI Agent and Automation Portfolio"
    },
    summary: {
      zh: "汇总 AI Agent、语音识别和自动化工作流相关项目，用于沉淀工程实践、实验系统和学习型产品原型。",
      en: "A collection of AI agent, speech recognition, and automation workflow projects for engineering notes, experiments, and learning prototypes."
    },
    featured: true,
    order: 10,
    tags: ["AI Agent", "Automation", "Portfolio"]
  },
  {
    slug: "github-cla-lidnet",
    title: {
      zh: "CLA-LIDNet",
      en: "CLA-LIDNet"
    },
    summary: {
      zh: "语音模型相关项目，后续可补充研究背景、模型结构、实验结果和论文/答辩材料。",
      en: "A speech-model project that can later include research context, architecture, experiments, and defense materials."
    },
    featured: true,
    order: 20,
    tags: ["Python", "Speech"]
  },
  {
    slug: "github-interview-agent",
    title: {
      zh: "AI 模拟面试练习平台",
      en: "AI Interview Practice Platform"
    },
    summary: {
      zh: "面向面试训练的 AI 应用项目，包含题库、追问评分、语音作答、模拟面试和报告方向。",
      en: "An AI interview practice project covering question banks, follow-up scoring, voice answers, mock interviews, and reports."
    },
    featured: true,
    order: 30,
    tags: ["AI", "Next.js", "FastAPI"]
  },
  {
    slug: "gitee-django-vue-web",
    title: {
      zh: "Django Vue Web",
      en: "Django Vue Web"
    },
    summary: {
      zh: "基于 Vue 与 Django DRF 的前后端分离 Web 项目，数据库使用 MySQL。",
      en: "A separated frontend/backend web project built with Vue, Django DRF, and MySQL."
    },
    featured: true,
    order: 40,
    tags: ["Vue", "Django", "MySQL"]
  }
];
