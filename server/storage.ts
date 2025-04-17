import { firs, statusUpdates, users, evidence, notifications, type User, type InsertUser, type Fir, type InsertFir, type StatusUpdate, type InsertStatusUpdate, type Evidence, type InsertEvidence, type Notification, type InsertNotification } from "@shared/schema";
import { format } from "date-fns";
import { db } from "./db";
import { eq, desc, and, gte, lte, like, sql, inArray, or, isNull, count, asc, SQL } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

// Define SearchParams interface
export interface SearchParams {
  query?: string;
  status?: string | string[];
  priority?: number | number[];
  startDate?: string;
  endDate?: string;
  location?: string;
  ipcSection?: string;
  tags?: string[];
  page?: number;
  limit?: number;
  userId?: number;
  officerId?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

const PostgresSessionStore = connectPg(session);

// Extended interface for storage operations
export interface IStorage {
  // Session store
  sessionStore: session.SessionStore;

  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User>;
  updateUserLastLogin(id: number): Promise<void>;
  getUserCount(): Promise<number>;
  getUsers(page?: number, limit?: number): Promise<User[]>;
  getUsersByRole(role: string): Promise<User[]>;
  
  // FIR methods
  createFir(fir: InsertFir): Promise<Fir>;
  getFir(firId: string): Promise<Fir | undefined>;
  getAllFirs(page?: number, limit?: number): Promise<Fir[]>;
  updateFir(firId: string, updates: Partial<Fir>): Promise<Fir | undefined>;
  updateFirStatus(firId: string, status: string, updatedBy?: number): Promise<Fir | undefined>;
  getFirsByUser(userId: number): Promise<Fir[]>;
  getFirsByOfficer(officerId: number): Promise<Fir[]>;
  getFirCount(): Promise<number>;
  searchFirs(params: SearchParams): Promise<{ firs: Fir[], total: number }>;
  
  // Status Update methods
  createStatusUpdate(statusUpdate: InsertStatusUpdate): Promise<StatusUpdate>;
  getStatusUpdates(firId: string): Promise<StatusUpdate[]>;
  
  // Evidence methods
  createEvidence(evidence: InsertEvidence): Promise<Evidence>;
  getEvidenceByFir(firId: string): Promise<Evidence[]>;
  getEvidenceById(id: number): Promise<Evidence | undefined>;
  
  // Notification methods
  createNotification(notification: InsertNotification): Promise<Notification>;
  getUserNotifications(userId: number, unreadOnly?: boolean): Promise<Notification[]>;
  markNotificationAsRead(id: number): Promise<void>;
  markAllNotificationsAsRead(userId: number): Promise<void>;
  
  // Analytics methods
  getAnalyticsByTimeRange(startDate: Date, endDate: Date): Promise<any>;
  getCrimeTypeDistribution(): Promise<any[]>;
  getStatusDistribution(): Promise<any[]>;
  getMonthlyStats(year: number): Promise<any[]>;
  getPriorityDistribution(): Promise<any[]>;
}

// Database storage implementation
export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // FIR methods
  async createFir(insertFir: InsertFir): Promise<Fir> {
    const [fir] = await db
      .insert(firs)
      .values({
        ...insertFir,
        dateTime: insertFir.dateTime || null,
        location: insertFir.location || null,
        status: insertFir.status || "REGISTERED"
      })
      .returning();
    
    // Create initial status update
    await this.createStatusUpdate({
      firId: fir.firId,
      status: "REGISTERED",
      description: `FIR has been registered in the system with ID ${fir.firId}`
    });
    
    return fir;
  }

  async getFir(firId: string): Promise<Fir | undefined> {
    const [fir] = await db.select().from(firs).where(eq(firs.firId, firId));
    return fir || undefined;
  }

  async getAllFirs(): Promise<Fir[]> {
    return await db.select().from(firs).orderBy(desc(firs.createdAt));
  }

  async updateFirStatus(firId: string, status: string): Promise<Fir | undefined> {
    const [fir] = await db
      .update(firs)
      .set({ status })
      .where(eq(firs.firId, firId))
      .returning();
    return fir || undefined;
  }

  // Status Update methods
  async createStatusUpdate(insertStatusUpdate: InsertStatusUpdate): Promise<StatusUpdate> {
    const [statusUpdate] = await db
      .insert(statusUpdates)
      .values(insertStatusUpdate)
      .returning();
    return statusUpdate;
  }

  async getStatusUpdates(firId: string): Promise<StatusUpdate[]> {
    return await db
      .select()
      .from(statusUpdates)
      .where(eq(statusUpdates.firId, firId))
      .orderBy(statusUpdates.timestamp);
  }
}

// Use DatabaseStorage
export const storage = new DatabaseStorage();
