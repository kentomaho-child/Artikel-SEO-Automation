import { and, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { dailyUsage } from "../db/schema";

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getFreeDailyLimit(): number {
  const envVal = Number(process.env.FREE_DAILY_LIMIT);
  return Number.isFinite(envVal) && envVal > 0 ? envVal : 3;
}

// In-memory fallback if MySQL is offline during local test or initial setup
const memoryUsage = new Map<
  string,
  { articleCount: number; outlineCount: number }
>();

function getMemoryKey(ip: string, date: string): string {
  return `${ip}_${date}`;
}

export async function getClientUsage(clientIp: string) {
  const limit = getFreeDailyLimit();
  const today = getTodayDateString();
  const cleanIp = (clientIp || "127.0.0.1").trim();

  try {
    const records = await db
      .select()
      .from(dailyUsage)
      .where(
        and(eq(dailyUsage.clientIp, cleanIp), eq(dailyUsage.usageDate, today))
      )
      .limit(1);

    if (records.length > 0 && records[0]) {
      const articleCount = records[0].articleCount;
      const outlineCount = records[0].outlineCount;
      return {
        clientIp: cleanIp,
        usageDate: today,
        articleCount,
        outlineCount,
        dailyLimit: limit,
        remainingArticles: Math.max(0, limit - articleCount),
      };
    }
  } catch (err) {
    // Fallback to memory tracking if database connection is unavailable
    const mem = memoryUsage.get(getMemoryKey(cleanIp, today)) || {
      articleCount: 0,
      outlineCount: 0,
    };
    return {
      clientIp: cleanIp,
      usageDate: today,
      articleCount: mem.articleCount,
      outlineCount: mem.outlineCount,
      dailyLimit: limit,
      remainingArticles: Math.max(0, limit - mem.articleCount),
    };
  }

  return {
    clientIp: cleanIp,
    usageDate: today,
    articleCount: 0,
    outlineCount: 0,
    dailyLimit: limit,
    remainingArticles: limit,
  };
}

export async function checkAndIncrementArticle(
  clientIp: string
): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  const limit = getFreeDailyLimit();
  const today = getTodayDateString();
  const cleanIp = (clientIp || "127.0.0.1").trim();

  try {
    const existing = await db
      .select()
      .from(dailyUsage)
      .where(
        and(eq(dailyUsage.clientIp, cleanIp), eq(dailyUsage.usageDate, today))
      )
      .limit(1);

    if (existing.length === 0) {
      await db.insert(dailyUsage).values({
        clientIp: cleanIp,
        usageDate: today,
        articleCount: 1,
        outlineCount: 0,
      });
      return { allowed: true, remaining: limit - 1, limit };
    }

    const currentCount = existing[0]?.articleCount ?? 0;
    if (currentCount >= limit) {
      return { allowed: false, remaining: 0, limit };
    }

    await db
      .update(dailyUsage)
      .set({
        articleCount: currentCount + 1,
        updatedAt: new Date(),
      })
      .where(eq(dailyUsage.id, existing[0]!.id));

    return { allowed: true, remaining: limit - (currentCount + 1), limit };
  } catch (err) {
    // Memory fallback
    const key = getMemoryKey(cleanIp, today);
    const current = memoryUsage.get(key) || { articleCount: 0, outlineCount: 0 };
    if (current.articleCount >= limit) {
      return { allowed: false, remaining: 0, limit };
    }
    current.articleCount += 1;
    memoryUsage.set(key, current);
    return {
      allowed: true,
      remaining: limit - current.articleCount,
      limit,
    };
  }
}

export async function checkAndIncrementOutline(
  clientIp: string
): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  const articleLimit = getFreeDailyLimit();
  const outlineLimit = articleLimit * 3;
  const today = getTodayDateString();
  const cleanIp = (clientIp || "127.0.0.1").trim();

  try {
    const existing = await db
      .select()
      .from(dailyUsage)
      .where(
        and(eq(dailyUsage.clientIp, cleanIp), eq(dailyUsage.usageDate, today))
      )
      .limit(1);

    if (existing.length === 0) {
      await db.insert(dailyUsage).values({
        clientIp: cleanIp,
        usageDate: today,
        articleCount: 0,
        outlineCount: 1,
      });
      return { allowed: true, remaining: outlineLimit - 1, limit: outlineLimit };
    }

    const currentCount = existing[0]?.outlineCount ?? 0;
    if (currentCount >= outlineLimit) {
      return { allowed: false, remaining: 0, limit: outlineLimit };
    }

    await db
      .update(dailyUsage)
      .set({
        outlineCount: currentCount + 1,
        updatedAt: new Date(),
      })
      .where(eq(dailyUsage.id, existing[0]!.id));

    return {
      allowed: true,
      remaining: outlineLimit - (currentCount + 1),
      limit: outlineLimit,
    };
  } catch (err) {
    const key = getMemoryKey(cleanIp, today);
    const current = memoryUsage.get(key) || { articleCount: 0, outlineCount: 0 };
    if (current.outlineCount >= outlineLimit) {
      return { allowed: false, remaining: 0, limit: outlineLimit };
    }
    current.outlineCount += 1;
    memoryUsage.set(key, current);
    return {
      allowed: true,
      remaining: outlineLimit - current.outlineCount,
      limit: outlineLimit,
    };
  }
}
