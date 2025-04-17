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
  public sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({
        ...updates,
        // If we're updating anything, update the timestamp
        ...(Object.keys(updates).length > 0 ? { updatedAt: new Date() } : {})
      })
      .where(eq(users.id, id))
      .returning();
    
    if (!updatedUser) {
      throw new Error(`User with ID ${id} not found`);
    }
    
    return updatedUser;
  }

  async updateUserLastLogin(id: number): Promise<void> {
    await db
      .update(users)
      .set({ lastLogin: new Date() })
      .where(eq(users.id, id));
  }

  async getUserCount(): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(users);
    
    return result.count;
  }

  async getUsers(page: number = 1, limit: number = 10): Promise<User[]> {
    const offset = (page - 1) * limit;
    
    return await db
      .select()
      .from(users)
      .limit(limit)
      .offset(offset)
      .orderBy(asc(users.username));
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.role, role))
      .orderBy(asc(users.username));
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

  async getAllFirs(page: number = 1, limit: number = 10): Promise<Fir[]> {
    const offset = (page - 1) * limit;
    
    return await db
      .select()
      .from(firs)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(firs.createdAt));
  }

  async updateFir(firId: string, updates: Partial<Fir>): Promise<Fir | undefined> {
    const [updatedFir] = await db
      .update(firs)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(firs.firId, firId))
      .returning();
    
    return updatedFir;
  }

  async updateFirStatus(firId: string, status: string, updatedBy?: number): Promise<Fir | undefined> {
    // First update the FIR status
    const [fir] = await db
      .update(firs)
      .set({ 
        status,
        updatedAt: new Date(),
        ...(status === 'CLOSED' ? { closedAt: new Date() } : {})
      })
      .where(eq(firs.firId, firId))
      .returning();
    
    if (!fir) return undefined;
    
    // Then create a status update record
    await this.createStatusUpdate({
      firId: fir.firId,
      status,
      description: `Status updated to ${status}`,
      updatedBy
    });
    
    return fir;
  }

  async getFirsByUser(userId: number): Promise<Fir[]> {
    return await db
      .select()
      .from(firs)
      .where(eq(firs.userId, userId))
      .orderBy(desc(firs.createdAt));
  }

  async getFirsByOfficer(officerId: number): Promise<Fir[]> {
    return await db
      .select()
      .from(firs)
      .where(eq(firs.officerId, officerId))
      .orderBy(desc(firs.createdAt));
  }

  async getFirCount(): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(firs);
    
    return result.count;
  }

  async searchFirs(params: SearchParams): Promise<{ firs: Fir[], total: number }> {
    const { 
      query, status, priority, startDate, endDate, location, ipcSection, 
      tags, page = 1, limit = 10, userId, officerId, sortBy = 'createdAt', 
      sortDirection = 'desc' 
    } = params;
    
    const offset = (page - 1) * limit;
    const conditions: SQL<unknown>[] = [];
    
    // Add conditions based on search parameters
    if (query) {
      conditions.push(or(
        like(firs.crime, `%${query}%`),
        like(firs.summary, `%${query}%`),
        like(firs.location, `%${query}%`),
        like(firs.firId, `%${query}%`)
      ));
    }
    
    if (status) {
      if (Array.isArray(status)) {
        conditions.push(inArray(firs.status, status));
      } else {
        conditions.push(eq(firs.status, status));
      }
    }
    
    if (priority) {
      if (Array.isArray(priority)) {
        conditions.push(inArray(firs.priority, priority));
      } else {
        conditions.push(eq(firs.priority, priority));
      }
    }
    
    if (startDate) {
      conditions.push(gte(firs.createdAt, new Date(startDate)));
    }
    
    if (endDate) {
      conditions.push(lte(firs.createdAt, new Date(endDate)));
    }
    
    if (location) {
      conditions.push(like(firs.location, `%${location}%`));
    }
    
    if (userId) {
      conditions.push(eq(firs.userId, userId));
    }
    
    if (officerId) {
      conditions.push(eq(firs.officerId, officerId));
    }
    
    // IPC section search is complex because it's stored as an array
    if (ipcSection) {
      conditions.push(sql`${firs.ipcSections} @> ARRAY[${ipcSection}]::text[]`);
    }
    
    // Tags search is complex because it's stored as an array
    if (tags && tags.length > 0) {
      conditions.push(sql`${firs.tags} && ARRAY[${tags.join(',')}]::text[]`);
    }
    
    // Create WHERE clause
    const whereClause = conditions.length > 0 
      ? and(...conditions) 
      : undefined;
    
    // Get total count for pagination
    const [countResult] = await db
      .select({ count: count() })
      .from(firs)
      .where(whereClause);
    
    // Build sort direction
    const sortDirectionFn = sortDirection === 'asc' ? asc : desc;
    
    // Get paginated results
    const results = await db
      .select()
      .from(firs)
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(sortDirectionFn(firs[sortBy as keyof typeof firs] as any));
    
    return {
      firs: results,
      total: countResult.count
    };
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

  // Evidence methods
  async createEvidence(insertEvidence: InsertEvidence): Promise<Evidence> {
    const [evidence] = await db
      .insert(evidence)
      .values(insertEvidence)
      .returning();
    return evidence;
  }

  async getEvidenceByFir(firId: string): Promise<Evidence[]> {
    return await db
      .select()
      .from(evidence)
      .where(eq(evidence.firId, firId))
      .orderBy(desc(evidence.uploadedAt));
  }

  async getEvidenceById(id: number): Promise<Evidence | undefined> {
    const [evidenceItem] = await db
      .select()
      .from(evidence)
      .where(eq(evidence.id, id));
    
    return evidenceItem;
  }

  // Notification methods
  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const [notification] = await db
      .insert(notifications)
      .values(insertNotification)
      .returning();
    
    return notification;
  }

  async getUserNotifications(userId: number, unreadOnly: boolean = false): Promise<Notification[]> {
    let query = db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId));
    
    if (unreadOnly) {
      query = query.where(eq(notifications.isRead, false));
    }
    
    return await query.orderBy(desc(notifications.createdAt));
  }

  async markNotificationAsRead(id: number): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id));
  }

  async markAllNotificationsAsRead(userId: number): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));
  }

  // Analytics methods
  async getAnalyticsByTimeRange(startDate: Date, endDate: Date): Promise<any> {
    // Get FIR count by status within time range
    const statusCount = await db
      .select({
        status: firs.status,
        count: count()
      })
      .from(firs)
      .where(and(
        gte(firs.createdAt, startDate),
        lte(firs.createdAt, endDate)
      ))
      .groupBy(firs.status);
    
    // Get FIR count by priority within time range
    const priorityCount = await db
      .select({
        priority: firs.priority,
        count: count()
      })
      .from(firs)
      .where(and(
        gte(firs.createdAt, startDate),
        lte(firs.createdAt, endDate)
      ))
      .groupBy(firs.priority);
    
    // Get crime type distribution within time range
    const crimeTypeCount = await db
      .select({
        crimeType: firs.crime,
        count: count()
      })
      .from(firs)
      .where(and(
        gte(firs.createdAt, startDate),
        lte(firs.createdAt, endDate)
      ))
      .groupBy(firs.crime);
    
    // Total FIRs in the time range
    const [totalCount] = await db
      .select({
        count: count()
      })
      .from(firs)
      .where(and(
        gte(firs.createdAt, startDate),
        lte(firs.createdAt, endDate)
      ));
    
    // Average processing time (from creation to closure) in days
    const processingTimes = await db
      .select({
        processingTime: sql`EXTRACT(EPOCH FROM (${firs.closedAt} - ${firs.createdAt})) / 86400`
      })
      .from(firs)
      .where(and(
        gte(firs.createdAt, startDate),
        lte(firs.createdAt, endDate),
        eq(firs.status, 'CLOSED'),
        sql`${firs.closedAt} IS NOT NULL`
      ));
    
    let avgProcessingTime = 0;
    if (processingTimes.length > 0) {
      avgProcessingTime = processingTimes.reduce((sum, item) => sum + Number(item.processingTime), 0) / processingTimes.length;
    }
    
    return {
      totalFirs: totalCount.count,
      statusDistribution: statusCount,
      priorityDistribution: priorityCount,
      crimeDistribution: crimeTypeCount,
      averageProcessingTimeDays: avgProcessingTime
    };
  }

  async getCrimeTypeDistribution(): Promise<any[]> {
    return await db
      .select({
        crimeType: firs.crime,
        count: count()
      })
      .from(firs)
      .groupBy(firs.crime)
      .orderBy(desc(sql`count`));
  }

  async getStatusDistribution(): Promise<any[]> {
    return await db
      .select({
        status: firs.status,
        count: count()
      })
      .from(firs)
      .groupBy(firs.status)
      .orderBy(desc(sql`count`));
  }

  async getMonthlyStats(year: number): Promise<any[]> {
    const result = [];
    
    for (let month = 0; month < 12; month++) {
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
      
      const [monthCount] = await db
        .select({
          count: count()
        })
        .from(firs)
        .where(and(
          gte(firs.createdAt, startDate),
          lte(firs.createdAt, endDate)
        ));
      
      result.push({
        month: month + 1,
        count: monthCount.count
      });
    }
    
    return result;
  }

  async getPriorityDistribution(): Promise<any[]> {
    return await db
      .select({
        priority: firs.priority,
        count: count()
      })
      .from(firs)
      .groupBy(firs.priority)
      .orderBy(firs.priority);
  }
}

// Use DatabaseStorage
export const storage = new DatabaseStorage();
