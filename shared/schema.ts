import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Original users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// FIR table
export const firs = pgTable("firs", {
  id: serial("id").primaryKey(),
  firId: text("fir_id").notNull().unique(),
  crime: text("crime").notNull(),
  ipcSections: text("ipc_sections").array().notNull(),
  summary: text("summary").notNull(),
  priority: integer("priority").notNull(),
  dateTime: text("date_time"),
  location: text("location"),
  status: text("status").notNull().default("REGISTERED"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertFirSchema = createInsertSchema(firs).omit({
  id: true,
  createdAt: true,
});

export type InsertFir = z.infer<typeof insertFirSchema>;
export type Fir = typeof firs.$inferSelect;

// Status Updates table
export const statusUpdates = pgTable("status_updates", {
  id: serial("id").primaryKey(),
  firId: text("fir_id").notNull(),
  status: text("status").notNull(),
  description: text("description").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const insertStatusUpdateSchema = createInsertSchema(statusUpdates).omit({
  id: true,
  timestamp: true,
});

export type InsertStatusUpdate = z.infer<typeof insertStatusUpdateSchema>;
export type StatusUpdate = typeof statusUpdates.$inferSelect;

// Gemini Response schema
export const geminiResponseSchema = z.object({
  crime: z.string(),
  ipcSections: z.array(z.string()),
  summary: z.string(),
  priority: z.number().min(1).max(5),
});

export type GeminiResponse = z.infer<typeof geminiResponseSchema>;
