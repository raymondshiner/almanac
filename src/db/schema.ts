import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
  type AnySQLiteColumn,
} from "drizzle-orm/sqlite-core";

export const MEDIA_TYPES = [
  "film",
  "tv_show",
  "tv_season",
  "game",
  "book",
  "album",
] as const;
export type MediaType = (typeof MEDIA_TYPES)[number];

export const LOG_STATUSES = ["done", "in_progress", "abandoned"] as const;
export type LogStatus = (typeof LOG_STATUSES)[number];

// Cached copies of external lookups, shared across the site. Log entries are
// the real data; items can always be re-derived from their source.
export const mediaItems = sqliteTable(
  "media_items",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    mediaType: text("media_type").$type<MediaType>().notNull(),
    parentId: text("parent_id").references((): AnySQLiteColumn => mediaItems.id, {
      onDelete: "cascade",
    }),
    externalSource: text("external_source").notNull(),
    externalId: text("external_id").notNull(),
    title: text("title").notNull(),
    year: integer("year"),
    creator: text("creator"),
    coverUrl: text("cover_url"),
    metadata: text("metadata", { mode: "json" })
      .$type<Record<string, unknown>>()
      .notNull()
      .$defaultFn(() => ({})),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [
    uniqueIndex("media_items_external_idx").on(
      t.externalSource,
      t.externalId,
      t.mediaType,
    ),
    index("media_items_parent_idx").on(t.parentId),
  ],
);

export const logEntries = sqliteTable(
  "log_entries",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    itemId: text("item_id")
      .notNull()
      .references(() => mediaItems.id, { onDelete: "cascade" }),
    // date consumed, YYYY-MM-DD
    loggedAt: text("logged_at").notNull(),
    // 5 stars in half steps; validated app-side
    rating: real("rating"),
    review: text("review"),
    status: text("status").$type<LogStatus>().notNull().default("done"),
    isPrivate: integer("is_private", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [
    index("log_entries_logged_idx").on(t.loggedAt),
    index("log_entries_item_idx").on(t.itemId),
  ],
);

// KV for site settings + the admin credential (seeded from env on boot).
export const siteConfig = sqliteTable("site_config", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const sessions = sqliteTable("sessions", {
  token: text("token").primaryKey(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
});

export type MediaItem = typeof mediaItems.$inferSelect;
export type NewMediaItem = typeof mediaItems.$inferInsert;
export type LogEntry = typeof logEntries.$inferSelect;
export type NewLogEntry = typeof logEntries.$inferInsert;
