import "server-only";

import { createClient, type RedisClientType } from "redis";
import type { AuthConfig } from "./config";
import {
  isOidcTransaction,
  isBffSession,
  type BffSession,
  type OidcTransaction,
} from "./model";
import { hashHandle } from "./security";

declare global {
  var iweiooRedisClients: Map<string, Promise<RedisClientType>> | undefined;
}

function clients(): Map<string, Promise<RedisClientType>> {
  globalThis.iweiooRedisClients ??= new Map();
  return globalThis.iweiooRedisClients;
}

async function connect(url: string): Promise<RedisClientType> {
  const client = createClient({ url });
  client.on("error", (error) => {
    const name = error instanceof Error ? error.name : "unknown_error";
    console.error(`[auth-store] Redis client error: ${name}`);
  });
  await client.connect();
  return client as RedisClientType;
}

async function redis(config: AuthConfig): Promise<RedisClientType> {
  const cache = clients();
  const key = hashHandle(config.redisUrl);
  let pending = cache.get(key);
  if (!pending) {
    pending = connect(config.redisUrl).catch((error) => {
      cache.delete(key);
      throw error;
    });
    cache.set(key, pending);
  }
  return pending;
}

function transactionKey(config: AuthConfig, handle: string): string {
  return `iweioo:${config.appId}:oidc-tx:${hashHandle(handle)}`;
}

function sessionKey(config: AuthConfig, handle: string): string {
  return `iweioo:${config.appId}:session:${hashHandle(handle)}`;
}

async function createRecord(
  config: AuthConfig,
  key: string,
  value: unknown,
  ttlSeconds: number
): Promise<void> {
  const result = await (await redis(config)).set(key, JSON.stringify(value), {
    EX: ttlSeconds,
    NX: true
  });
  if (result !== "OK") {
    throw new Error("A random authentication handle collided");
  }
}

export async function createOidcTransaction(
  config: AuthConfig,
  handle: string,
  transaction: OidcTransaction
): Promise<void> {
  await createRecord(
    config,
    transactionKey(config, handle),
    transaction,
    config.transactionTtlSeconds
  );
}

export async function takeOidcTransaction(
  config: AuthConfig,
  handle: string
): Promise<OidcTransaction | null> {
  const raw = await (await redis(config)).getDel(transactionKey(config, handle));
  if (!raw) {
    return null;
  }
  try {
    const value: unknown = JSON.parse(raw);
    return isOidcTransaction(value) ? value : null;
  } catch {
    return null;
  }
}

export async function createBffSession(
  config: AuthConfig,
  handle: string,
  session: BffSession,
  ttlSeconds = config.sessionTtlSeconds
): Promise<void> {
  await createRecord(config, sessionKey(config, handle), session, ttlSeconds);
}

export async function getBffSession(
  config: AuthConfig,
  handle: string
): Promise<BffSession | null> {
  const raw = await (await redis(config)).get(sessionKey(config, handle));
  if (!raw) {
    return null;
  }
  try {
    const value: unknown = JSON.parse(raw);
    return isBffSession(value) ? value : null;
  } catch {
    return null;
  }
}

export async function deleteBffSession(config: AuthConfig, handle: string): Promise<void> {
  await (await redis(config)).del(sessionKey(config, handle));
}
