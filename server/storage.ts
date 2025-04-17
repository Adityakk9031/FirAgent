import { firs, statusUpdates, users, type User, type InsertUser, type Fir, type InsertFir, type StatusUpdate, type InsertStatusUpdate } from "@shared/schema";
import { format } from "date-fns";

// modify the interface with any CRUD methods
// you might need
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

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private firs: Map<string, Fir>;
  private statusUpdates: Map<number, StatusUpdate>;
  private userCurrentId: number;
  private firCurrentId: number;
  private statusUpdateCurrentId: number;

  constructor() {
    this.users = new Map();
    this.firs = new Map();
    this.statusUpdates = new Map();
    this.userCurrentId = 1;
    this.firCurrentId = 1;
    this.statusUpdateCurrentId = 1;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // FIR methods
  async createFir(insertFir: InsertFir): Promise<Fir> {
    const id = this.firCurrentId++;
    const createdAt = new Date();
    const fir: Fir = { 
      ...insertFir, 
      id, 
      createdAt
    };
    this.firs.set(insertFir.firId, fir);
    
    // Create initial status update
    await this.createStatusUpdate({
      firId: fir.firId,
      status: "REGISTERED",
      description: `FIR has been registered in the system with ID ${fir.firId}`
    });
    
    return fir;
  }

  async getFir(firId: string): Promise<Fir | undefined> {
    return this.firs.get(firId);
  }

  async getAllFirs(): Promise<Fir[]> {
    return Array.from(this.firs.values());
  }

  async updateFirStatus(firId: string, status: string): Promise<Fir | undefined> {
    const fir = await this.getFir(firId);
    if (!fir) return undefined;
    
    const updatedFir: Fir = { ...fir, status };
    this.firs.set(firId, updatedFir);
    return updatedFir;
  }

  // Status Update methods
  async createStatusUpdate(insertStatusUpdate: InsertStatusUpdate): Promise<StatusUpdate> {
    const id = this.statusUpdateCurrentId++;
    const timestamp = new Date();
    const statusUpdate: StatusUpdate = {
      ...insertStatusUpdate,
      id,
      timestamp
    };
    this.statusUpdates.set(id, statusUpdate);
    return statusUpdate;
  }

  async getStatusUpdates(firId: string): Promise<StatusUpdate[]> {
    return Array.from(this.statusUpdates.values())
      .filter(update => update.firId === firId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }
}

export const storage = new MemStorage();
