import { pgTable, text, serial, integer, boolean, timestamp, foreignKey, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Enhanced users table with roles and profile information
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull().default("civilian"),
  phone: text("phone"),
  address: text("address"),
  profileImage: text("profile_image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastLogin: timestamp("last_login"),
  emailVerified: boolean("email_verified").default(false),
  preferences: jsonb("preferences"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  fullName: true,
  role: true,
  phone: true,
  address: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// FIR table with enhanced fields
export const firs = pgTable("firs", {
  id: serial("id").primaryKey(),
  firId: text("fir_id").notNull().unique(),
  userId: integer("user_id").references(() => users.id), // Reporter ID
  officerId: integer("officer_id").references(() => users.id), // Assigned officer
  crime: text("crime").notNull(),
  ipcSections: text("ipc_sections").array().notNull(),
  summary: text("summary").notNull(),
  priority: integer("priority").notNull(),
  dateTime: text("date_time"),
  location: text("location"),
  coordinates: text("coordinates"), // Geo coordinates for mapping
  district: text("district"),
  state: text("state"),
  suspects: text("suspects"),
  victims: text("victims"),
  witnesses: text("witnesses"),
  status: text("status").notNull().default("REGISTERED"),
  tags: text("tags").array(),
  isAnonymous: boolean("is_anonymous").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  closedAt: timestamp("closed_at"),
  metadata: jsonb("metadata"),
});

export const insertFirSchema = createInsertSchema(firs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  closedAt: true,
});

export type InsertFir = z.infer<typeof insertFirSchema>;
export type Fir = typeof firs.$inferSelect;

// Status Updates table
export const statusUpdates = pgTable("status_updates", {
  id: serial("id").primaryKey(),
  firId: text("fir_id").notNull().references(() => firs.firId, { onDelete: 'cascade' }),
  status: text("status").notNull(),
  description: text("description").notNull(),
  updatedBy: integer("updated_by").references(() => users.id),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  notes: text("internal_notes"),
  isPublic: boolean("is_public").default(true),
});

export const insertStatusUpdateSchema = createInsertSchema(statusUpdates).omit({
  id: true,
  timestamp: true,
});

export type InsertStatusUpdate = z.infer<typeof insertStatusUpdateSchema>;
export type StatusUpdate = typeof statusUpdates.$inferSelect;

// Evidence table for files and uploads
export const evidence = pgTable("evidence", {
  id: serial("id").primaryKey(),
  firId: text("fir_id").notNull().references(() => firs.firId, { onDelete: 'cascade' }),
  fileUrl: text("file_url").notNull(),
  fileType: text("file_type").notNull(),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size").notNull(),
  description: text("description"),
  uploadedBy: integer("uploaded_by").references(() => users.id),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  tags: text("tags").array(),
  metadata: jsonb("metadata"),
});

export const insertEvidenceSchema = createInsertSchema(evidence).omit({
  id: true,
  uploadedAt: true,
});

export type InsertEvidence = z.infer<typeof insertEvidenceSchema>;
export type Evidence = typeof evidence.$inferSelect;

// Notifications table
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  firId: text("fir_id").references(() => firs.firId),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(), // 'status_update', 'assignment', etc.
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  link: text("link"),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
  isRead: true,
});

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// Gemini Response schema
export const geminiResponseSchema = z.object({
  crime: z.string(),
  ipcSections: z.array(z.string()),
  summary: z.string(),
  priority: z.number().min(1).max(5),
  dateTime: z.string().optional(),
  location: z.string().optional(),
});

export type GeminiResponse = z.infer<typeof geminiResponseSchema>;

// Define relations
export const usersRelations = relations(users, ({ many }) => ({
  reportedFirs: many(firs, { relationName: 'reporter' }),
  assignedFirs: many(firs, { relationName: 'officer' }),
  statusUpdates: many(statusUpdates),
  evidenceUploads: many(evidence),
  notifications: many(notifications),
}));

export const firsRelations = relations(firs, ({ one, many }) => ({
  reporter: one(users, {
    fields: [firs.userId],
    references: [users.id],
    relationName: 'reporter',
  }),
  assignedOfficer: one(users, {
    fields: [firs.officerId],
    references: [users.id],
    relationName: 'officer',
  }),
  statusUpdates: many(statusUpdates),
  evidence: many(evidence),
  notifications: many(notifications),
}));

export const statusUpdatesRelations = relations(statusUpdates, ({ one }) => ({
  fir: one(firs, {
    fields: [statusUpdates.firId],
    references: [firs.firId],
  }),
  updatedByUser: one(users, {
    fields: [statusUpdates.updatedBy],
    references: [users.id],
  }),
}));

export const evidenceRelations = relations(evidence, ({ one }) => ({
  fir: one(firs, {
    fields: [evidence.firId],
    references: [firs.firId],
  }),
  uploadedByUser: one(users, {
    fields: [evidence.uploadedBy],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  fir: one(firs, {
    fields: [notifications.firId],
    references: [firs.firId],
  }),
}));
