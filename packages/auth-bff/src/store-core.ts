import { createClient, type RedisClientType } from "redis";
import type { AuthConfig } from "./config";
import {
  isBffSession,
  isOidcTransaction,
  isSessionDevice,
  isSessionId,
  type BffSession,
  type ManagedSession,
  type OidcTransaction
} from "./model";
import { hashHandle } from "./security";

type SessionMetadata = {
  sessionId: string;
  appId: string;
  device: BffSession["device"];
  createdAt: string;
  expiresAt: string;
};

type SessionLocator = {
  userKey: string;
  recordKey: string;
  refreshLockKey: string;
};

declare global {
  var iweiooRedisClients: Map<string, Promise<RedisClientType>> | undefined;
}

const SESSION_META_PREFIX = "iweioo:session-meta:";
const SESSION_LOCATOR_PREFIX = "iweioo:session-locator:";
const CREATE_SESSION_SCRIPT = `
if redis.call('EXISTS', KEYS[1]) == 1 or redis.call('EXISTS', KEYS[2]) == 1 or redis.call('EXISTS', KEYS[3]) == 1 then
  return -1
end
local max_sessions = tonumber(ARGV[7])
local eviction_count = redis.call('ZCARD', KEYS[4]) - max_sessions + 1
if eviction_count > 0 then
  local eviction_candidates = redis.call('ZRANGE', KEYS[4], 0, eviction_count - 1)
  for _, session_id in ipairs(eviction_candidates) do
    local locator_raw = redis.call('GET', ARGV[9] .. session_id)
    if not locator_raw then
      return -2
    end
    local ok, locator = pcall(cjson.decode, locator_raw)
    if not ok or locator['userKey'] ~= KEYS[4] or not locator['recordKey'] or not locator['refreshLockKey'] then
      return -2
    end
  end
end
redis.call('SET', KEYS[1], ARGV[1], 'EX', ARGV[4], 'NX')
redis.call('SET', KEYS[2], ARGV[2], 'EX', ARGV[4], 'NX')
redis.call('SET', KEYS[3], ARGV[3], 'EX', ARGV[4], 'NX')
redis.call('ZADD', KEYS[4], ARGV[5], ARGV[6])
while redis.call('ZCARD', KEYS[4]) > tonumber(ARGV[7]) do
  local candidates = redis.call('ZRANGE', KEYS[4], 0, 1)
  local oldest = candidates[1]
  if oldest == ARGV[6] and candidates[2] then oldest = candidates[2] end
  if not oldest then break end
  local old_meta_key = ARGV[8] .. oldest
  local old_locator_key = ARGV[9] .. oldest
  local old_locator_raw = redis.call('GET', old_locator_key)
  if old_locator_raw then
    local ok, old_locator = pcall(cjson.decode, old_locator_raw)
    if ok and old_locator['recordKey'] and old_locator['refreshLockKey'] then
      redis.call('DEL', old_locator['recordKey'], old_locator['refreshLockKey'])
    end
  end
  redis.call('DEL', old_meta_key, old_locator_key)
  redis.call('ZREM', KEYS[4], oldest)
end
local index_ttl = redis.call('TTL', KEYS[4])
if index_ttl < tonumber(ARGV[4]) then
  redis.call('EXPIRE', KEYS[4], ARGV[4])
end
return 1
`;

const REVOKE_SESSION_SCRIPT = `
if not redis.call('ZSCORE', KEYS[1], ARGV[1]) then
  return 0
end
local locator_raw = redis.call('GET', KEYS[3])
if not locator_raw then
  return -1
end
local ok, locator = pcall(cjson.decode, locator_raw)
if not ok or locator['userKey'] ~= ARGV[2] or not locator['recordKey'] or not locator['refreshLockKey'] then
  return -1
end
redis.call('DEL', locator['recordKey'], locator['refreshLockKey'])
redis.call('DEL', KEYS[2], KEYS[3])
redis.call('ZREM', KEYS[1], ARGV[1])
return 1
`;

const REVOKE_ALL_SESSIONS_SCRIPT = `
local ids = redis.call('ZRANGE', KEYS[1], 0, -1)
local revoked = 0
for _, session_id in ipairs(ids) do
  local locator_key = ARGV[3] .. session_id
  local locator_raw = redis.call('GET', locator_key)
  if not locator_raw then
    return -1
  end
  local ok, locator = pcall(cjson.decode, locator_raw)
  if not ok or locator['userKey'] ~= ARGV[1] or not locator['recordKey'] or not locator['refreshLockKey'] then
    return -1
  end
end
for _, session_id in ipairs(ids) do
  local meta_key = ARGV[2] .. session_id
  local locator_key = ARGV[3] .. session_id
  local locator_raw = redis.call('GET', locator_key)
  local ok, locator = pcall(cjson.decode, locator_raw)
  redis.call('DEL', locator['recordKey'], locator['refreshLockKey'])
  redis.call('DEL', meta_key, locator_key)
  revoked = revoked + 1
end
redis.call('DEL', KEYS[1])
return revoked
`;

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

function refreshLockKey(config: AuthConfig, handle: string): string {
  return `iweioo:${config.appId}:session-refresh:${hashHandle(handle)}`;
}

function sessionMetadataKey(sessionId: string): string {
  return `${SESSION_META_PREFIX}${sessionId}`;
}

function sessionLocatorKey(sessionId: string): string {
  return `${SESSION_LOCATOR_PREFIX}${sessionId}`;
}

function userSessionIndexKey(platformUserId: string): string {
  return `iweioo:user-sessions:${hashHandle(platformUserId)}`;
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
  if (!isBffSession(session) || session.appId !== config.appId) {
    throw new Error("BFF session does not match the application boundary");
  }
  const userKey = userSessionIndexKey(session.user.platformUserId);
  const recordKey = sessionKey(config, handle);
  const lockKey = refreshLockKey(config, handle);
  const metadata: SessionMetadata = {
    sessionId: session.sessionId,
    appId: session.appId,
    device: session.device,
    createdAt: session.createdAt,
    expiresAt: session.expiresAt
  };
  const locator: SessionLocator = {
    userKey,
    recordKey,
    refreshLockKey: lockKey
  };
  const tieBreaker = Number.parseInt(session.sessionId.slice(0, 8), 16) / 0x1_0000_0000;
  const result = await (await redis(config)).eval(CREATE_SESSION_SCRIPT, {
    keys: [
      recordKey,
      sessionMetadataKey(session.sessionId),
      sessionLocatorKey(session.sessionId),
      userKey
    ],
    arguments: [
      JSON.stringify(session),
      JSON.stringify(metadata),
      JSON.stringify(locator),
      String(ttlSeconds),
      String(Date.parse(session.createdAt) + tieBreaker),
      session.sessionId,
      String(config.maxSessionsPerUser),
      SESSION_META_PREFIX,
      SESSION_LOCATOR_PREFIX
    ]
  });
  if (result === -2) {
    throw new Error("The user session index is inconsistent");
  }
  if (result !== 1) {
    throw new Error("A random authentication session identifier collided");
  }
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
  const session = await getBffSession(config, handle);
  if (
    session &&
    (await revokeUserSession(config, session.user.platformUserId, session.sessionId))
  ) {
    return;
  }
  await (await redis(config)).del([
    sessionKey(config, handle),
    refreshLockKey(config, handle)
  ]);
}

export async function replaceBffSession(
  config: AuthConfig,
  handle: string,
  session: BffSession
): Promise<boolean> {
  const result = await (await redis(config)).set(sessionKey(config, handle), JSON.stringify(session), {
    KEEPTTL: true,
    XX: true
  });
  return result === "OK";
}

export async function listUserSessions(
  config: AuthConfig,
  platformUserId: string,
  currentSessionId: string
): Promise<ManagedSession[]> {
  const client = await redis(config);
  const userKey = userSessionIndexKey(platformUserId);
  const ids = await client.zRange(userKey, 0, -1, { REV: true });
  if (ids.length === 0) {
    return [];
  }
  const rawMetadata = await client.mGet(ids.map(sessionMetadataKey));
  const staleIds: string[] = [];
  const now = Date.now();
  const sessions: ManagedSession[] = [];
  for (let index = 0; index < ids.length; index += 1) {
    const sessionId = ids[index];
    const metadata = parseSessionMetadata(rawMetadata[index]);
    if (
      !metadata ||
      metadata.sessionId !== sessionId ||
      Date.parse(metadata.expiresAt) <= now
    ) {
      staleIds.push(sessionId);
      continue;
    }
    sessions.push({
      sessionId: metadata.sessionId,
      appId: metadata.appId,
      device: metadata.device,
      createdAt: metadata.createdAt,
      expiresAt: metadata.expiresAt,
      current: metadata.sessionId === currentSessionId
    });
  }
  if (staleIds.length > 0) {
    await client.zRem(userKey, staleIds);
  }
  return sessions;
}

export async function revokeUserSession(
  config: AuthConfig,
  platformUserId: string,
  sessionId: string
): Promise<boolean> {
  if (!isSessionId(sessionId)) {
    return false;
  }
  const userKey = userSessionIndexKey(platformUserId);
  const result = await (await redis(config)).eval(REVOKE_SESSION_SCRIPT, {
    keys: [userKey, sessionMetadataKey(sessionId), sessionLocatorKey(sessionId)],
    arguments: [sessionId, userKey]
  });
  if (result === -1) {
    throw new Error("Session metadata did not match the authenticated user");
  }
  return result === 1;
}

export async function revokeAllUserSessions(
  config: AuthConfig,
  platformUserId: string
): Promise<number> {
  const userKey = userSessionIndexKey(platformUserId);
  const result = await (await redis(config)).eval(REVOKE_ALL_SESSIONS_SCRIPT, {
    keys: [userKey],
    arguments: [userKey, SESSION_META_PREFIX, SESSION_LOCATOR_PREFIX]
  });
  if (result === -1 || typeof result !== "number") {
    throw new Error("Session metadata did not match the authenticated user");
  }
  return result;
}

export async function acquireSessionRefreshLock(
  config: AuthConfig,
  handle: string,
  owner: string
): Promise<boolean> {
  const result = await (await redis(config)).set(refreshLockKey(config, handle), owner, {
    EX: 10,
    NX: true
  });
  return result === "OK";
}

export async function releaseSessionRefreshLock(
  config: AuthConfig,
  handle: string,
  owner: string
): Promise<void> {
  await (await redis(config)).eval(
    "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
    { keys: [refreshLockKey(config, handle)], arguments: [owner] }
  );
}

export async function closeAuthStoreConnections(): Promise<void> {
  const cache = clients();
  const pending = [...cache.values()];
  cache.clear();
  await Promise.all(
    pending.map(async (connection) => {
      const client = await connection;
      if (client.isOpen) {
        await client.close();
      }
    })
  );
}

function parseSessionMetadata(raw: string | null): SessionMetadata | null {
  if (!raw) {
    return null;
  }
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return null;
    }
    const metadata = value as Record<string, unknown>;
    if (
      !isSessionId(metadata.sessionId) ||
      typeof metadata.appId !== "string" ||
      !/^[a-z][a-z0-9-]{1,31}$/.test(metadata.appId) ||
      !isSessionDevice(metadata.device) ||
      typeof metadata.createdAt !== "string" ||
      !Number.isFinite(Date.parse(metadata.createdAt)) ||
      typeof metadata.expiresAt !== "string" ||
      !Number.isFinite(Date.parse(metadata.expiresAt))
    ) {
      return null;
    }
    return metadata as SessionMetadata;
  } catch {
    return null;
  }
}
