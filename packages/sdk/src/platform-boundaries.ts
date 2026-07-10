export const productApplicationIds = ["interview", "defense"] as const;

export type ProductApplicationId = (typeof productApplicationIds)[number];

export const platformBoundaries = {
  identity: {
    issuer: "https://auth.iweioo.com/realms/iweioo",
    protocol: "oidc-authorization-code-pkce",
    browserSession: "host-only-opaque-cookie"
  },
  usage: {
    authority: "iweioo-platform-api",
    amountEncoding: "integer-micro-units",
    productCanSetAuthoritativeBalance: false
  }
} as const;
