export type AccountLocale = "zh" | "en";

export const accountLocales: AccountLocale[] = ["zh", "en"];

export function isAccountLocale(value: string): value is AccountLocale {
  return accountLocales.includes(value as AccountLocale);
}

export const accountCopy = {
  zh: {
    language: "English",
    eyebrow: "iweioo Account",
    title: "一个账号，连接每一次成长",
    lead: "集中查看身份、资料、授权与当前会话。持久化资料和授权写入将在平台 API 数据层完成后开放。",
    login: "登录账户中心",
    register: "创建 iweioo 账号",
    loading: "正在验证安全会话…",
    retry: "重新验证",
    signedIn: "已通过统一身份登录",
    identity: "身份",
    identityIntro: "以下信息来自经过签名验证的 Keycloak ID Token，只返回安全字段。",
    displayName: "显示名称",
    email: "验证邮箱",
    userId: "平台用户 ID",
    verified: "已验证",
    profile: "个人资料",
    profileIntro: "资料主记录将由 Platform API 和 PostgreSQL 管理；当前不使用浏览器或临时内存伪造写入。",
    locale: "语言偏好",
    timezone: "时区",
    education: "学校 / 专业 / 毕业年份",
    career: "职业目标",
    fromIdentity: "来自统一身份",
    pendingStorage: "等待持久化数据层",
    consent: "授权与隐私",
    consentIntro: "可选的数据共享默认关闭。启用前必须记录政策版本、授权证据与撤销时间。",
    growthConsent: "跨产品成长画像",
    growthConsentBody: "允许产品提交经过最小化处理的能力维度与成长摘要，不包含原始答案或论文内容。",
    memoryConsent: "个性化 Memory",
    memoryConsentBody: "允许使用可见、可删除且有来源的目标与偏好，为训练提供个性化建议。",
    notGranted: "未授权",
    availableAfterApi: "数据层完成后可管理",
    session: "当前会话",
    sessionIntro: "浏览器只保存当前子域名的不透明 HttpOnly Cookie；OIDC 令牌保留在服务端 Redis。",
    application: "应用",
    expires: "会话到期",
    cookieBoundary: "Cookie 边界",
    hostOnly: "account 子域名专属",
    logout: "退出账户中心",
    portal: "返回 iweioo 门户",
    unavailable: "会话服务暂时不可用，请稍后重试。",
    foundation: "Account Center Foundation"
  },
  en: {
    language: "中文",
    eyebrow: "iweioo Account",
    title: "One account for every step forward",
    lead:
      "Review identity, profile, consent, and the current session in one place. Durable profile and consent writes open after the Platform API data layer is ready.",
    login: "Sign in to Account",
    register: "Create an iweioo account",
    loading: "Verifying the secure session…",
    retry: "Verify again",
    signedIn: "Signed in through central identity",
    identity: "Identity",
    identityIntro: "These safe fields come from a signature-validated Keycloak ID Token.",
    displayName: "Display name",
    email: "Verified email",
    userId: "Platform user ID",
    verified: "Verified",
    profile: "Profile",
    profileIntro:
      "The Platform API and PostgreSQL will own profile records. This foundation does not fake writes in the browser or temporary memory.",
    locale: "Language preference",
    timezone: "Timezone",
    education: "School / major / graduation year",
    career: "Career goal",
    fromIdentity: "From central identity",
    pendingStorage: "Awaiting durable data layer",
    consent: "Consent & privacy",
    consentIntro:
      "Optional data sharing is off by default. Enabling it requires policy version, evidence, and revocation timestamps.",
    growthConsent: "Cross-product growth profile",
    growthConsentBody:
      "Allow products to submit minimized capability dimensions and growth summaries, never raw answers or thesis content.",
    memoryConsent: "Personalized Memory",
    memoryConsentBody:
      "Allow visible, deletable, provenance-backed goals and preferences to personalize training guidance.",
    notGranted: "Not granted",
    availableAfterApi: "Manage after the data layer ships",
    session: "Current session",
    sessionIntro:
      "The browser keeps only an opaque HttpOnly cookie for this subdomain; OIDC tokens remain in server-side Redis.",
    application: "Application",
    expires: "Session expiry",
    cookieBoundary: "Cookie boundary",
    hostOnly: "account subdomain only",
    logout: "Sign out of Account",
    portal: "Back to iweioo portal",
    unavailable: "The session service is temporarily unavailable. Please try again.",
    foundation: "Account Center Foundation"
  }
} as const;
