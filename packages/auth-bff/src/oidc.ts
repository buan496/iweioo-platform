import "server-only";

import * as client from "openid-client";
import type { AuthConfig } from "./config";
import type { AuthIntent, OidcTransaction } from "./model";
import { hashHandle, randomHandle } from "./security";

type CachedConfiguration = {
  expiresAt: number;
  promise: Promise<client.Configuration>;
};

const DISCOVERY_CACHE_MS = 10 * 60 * 1000;
const discoveryCache = new Map<string, CachedConfiguration>();

function discoveryKey(config: AuthConfig): string {
  return `${config.issuer.href}|${config.clientId}|${hashHandle(config.clientSecret)}`;
}

export async function getOidcConfiguration(config: AuthConfig): Promise<client.Configuration> {
  const key = discoveryKey(config);
  const cached = discoveryCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.promise;
  }

  const execute = config.issuer.protocol === "http:" ? [client.allowInsecureRequests] : undefined;
  const promise = client
    .discovery(
      config.issuer,
      config.clientId,
      undefined,
      client.ClientSecretBasic(config.clientSecret),
      { execute, timeout: 5 }
    )
    .catch((error) => {
      discoveryCache.delete(key);
      throw error;
    });

  discoveryCache.set(key, {
    expiresAt: Date.now() + DISCOVERY_CACHE_MS,
    promise
  });
  return promise;
}

export type AuthorizationStart = {
  authorizationUrl: URL;
  transactionHandle: string;
  transaction: OidcTransaction;
};

export async function beginAuthorization(
  config: AuthConfig,
  intent: AuthIntent,
  returnTo: string,
  locale: "zh" | "en"
): Promise<AuthorizationStart> {
  const oidc = await getOidcConfiguration(config);
  const codeVerifier = client.randomPKCECodeVerifier();
  const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);
  const state = client.randomState();
  const nonce = client.randomNonce();
  const parameters: Record<string, string> = {
    redirect_uri: config.callbackUrl,
    scope: "openid email profile",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state,
    nonce,
    ui_locales: locale === "zh" ? "zh-CN" : "en"
  };

  if (intent === "register") {
    parameters.prompt = "create";
  }

  return {
    authorizationUrl: client.buildAuthorizationUrl(oidc, parameters),
    transactionHandle: randomHandle(),
    transaction: {
      state,
      nonce,
      codeVerifier,
      returnTo,
      locale,
      intent,
      createdAt: new Date().toISOString()
    }
  };
}

export async function exchangeAuthorizationCode(
  config: AuthConfig,
  callbackRequestUrl: URL,
  transaction: OidcTransaction
) {
  const oidc = await getOidcConfiguration(config);
  const callbackUrl = new URL(config.callbackUrl);
  callbackUrl.search = callbackRequestUrl.search;

  return client.authorizationCodeGrant(
    oidc,
    callbackUrl,
    {
      pkceCodeVerifier: transaction.codeVerifier,
      expectedState: transaction.state,
      expectedNonce: transaction.nonce,
      idTokenExpected: true
    },
    { redirect_uri: config.callbackUrl }
  );
}

export async function buildRemoteLogoutUrl(config: AuthConfig, idToken: string, refreshToken: string) {
  const oidc = await getOidcConfiguration(config);
  try {
    await client.tokenRevocation(oidc, refreshToken, { token_type_hint: "refresh_token" });
  } catch (error) {
    const message = error instanceof Error ? error.name : "unknown_error";
    console.error(`[auth-logout] refresh token revocation failed: ${message}`);
  }

  return client.buildEndSessionUrl(oidc, {
    id_token_hint: idToken,
    post_logout_redirect_uri: config.postLogoutRedirectUrl
  });
}
