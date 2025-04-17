import { firs, statusUpdates, users, type User, type InsertUser, type Fir, type InsertFir, type StatusUpdate, type InsertStatusUpdate } from "@shared/schema";
import { format } from "date-fns";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // FIR methods
  createFir(fir: InsertFir): Promise<Fir>;
  getFir(firId: string): Promise<Fir | undefined>;
  getAllFirs(): Promise<Fir[]>;
  updateFirStatus(firId: string, status: string): Promise<Fir | undefined>;
  
  // Status Update methods
  createStatusUpdate(statusUpdate: InsertStatusUpdate): Promise<StatusUpdate>;
  getStatusUpdates(firId: string): Promise<StatusUpdate[]>;
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
