import {
  mysqlTable,
  serial,
  varchar,
  text,
  longtext,
  int,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/mysql-core";

export const articles = mysqlTable("articles", {
  id: serial("id").primaryKey(),
  keyword: varchar("keyword", { length: 255 }).notNull(),
  secondaryKeywords: text("secondary_keywords"),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull(),
  metaDescription: varchar("meta_description", { length: 320 }),
  targetAudience: varchar("target_audience", { length: 255 }).notNull(),
  languageStyle: varchar("language_style", { length: 100 }).notNull(),
  language: varchar("language", { length: 10 }).default("id").notNull(),
  pov: varchar("pov", { length: 50 }).default("anda").notNull(),
  customInstructions: text("custom_instructions"),
  targetWordCount: int("target_word_count").default(1200).notNull(),
  outline: longtext("outline"),
  content: longtext("content").default("").notNull(),
  wordCount: int("word_count").default(0).notNull(),
  seoScore: int("seo_score").default(0).notNull(),
  seoReport: longtext("seo_report"),
  status: varchar("status", { length: 32 }).default("draft").notNull(),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const stylePresets = mysqlTable("style_presets", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  targetAudience: varchar("target_audience", { length: 255 }).notNull(),
  languageStyle: varchar("language_style", { length: 100 }).notNull(),
  language: varchar("language", { length: 10 }).default("id").notNull(),
  pov: varchar("pov", { length: 50 }).default("anda").notNull(),
  customInstructions: text("custom_instructions"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const dailyUsage = mysqlTable(
  "daily_usage",
  {
    id: serial("id").primaryKey(),
    clientIp: varchar("client_ip", { length: 64 }).notNull(),
    usageDate: varchar("usage_date", { length: 10 }).notNull(),
    articleCount: int("article_count").default(0).notNull(),
    outlineCount: int("outline_count").default(0).notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("daily_usage_ip_date_idx").on(table.clientIp, table.usageDate),
  ]
);

export type Article = typeof articles.$inferSelect;
export type NewArticle = typeof articles.$inferInsert;
export type StylePreset = typeof stylePresets.$inferSelect;
export type NewStylePreset = typeof stylePresets.$inferInsert;
export type DailyUsage = typeof dailyUsage.$inferSelect;
