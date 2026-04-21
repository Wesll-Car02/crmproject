import Redis from 'ioredis';
import { config } from '../config';

let redis: Redis;

export function getRedis(): Redis {
  if (!redis) throw new Error('Redis not connected');
  return redis;
}

export async function connectRedis(): Promise<void> {
  redis = new Redis(config.redisUrl, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: true,
  });

  redis.on('error', (err) => console.error('Redis error:', err));
  await redis.connect();
  console.log('✅ Redis connected');
}

export async function setCache(key: string, value: any, ttlSeconds = 300): Promise<void> {
  await getRedis().setex(key, ttlSeconds, JSON.stringify(value));
}

export async function getCache<T>(key: string): Promise<T | null> {
  const data = await getRedis().get(key);
  return data ? JSON.parse(data) : null;
}

export async function deleteCache(key: string): Promise<void> {
  await getRedis().del(key);
}

export async function deleteCachePattern(pattern: string): Promise<void> {
  const keys = await getRedis().keys(pattern);
  if (keys.length > 0) await getRedis().del(...keys);
}

export async function setRefreshToken(userId: string, token: string): Promise<void> {
  await getRedis().setex(`refresh:${userId}`, 7 * 24 * 3600, token);
}

export async function getRefreshToken(userId: string): Promise<string | null> {
  return getRedis().get(`refresh:${userId}`);
}

export async function deleteRefreshToken(userId: string): Promise<void> {
  await getRedis().del(`refresh:${userId}`);
}
