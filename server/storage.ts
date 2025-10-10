import { type User, type InsertUser, type FaceAnalysis, type InsertFaceAnalysis } from "@shared/schema";
import { db } from "../db";
import { users, faceAnalyses } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  createFaceAnalysis(analysis: InsertFaceAnalysis): Promise<FaceAnalysis>;
  getFaceAnalyses(limit?: number): Promise<FaceAnalysis[]>;
  getFaceAnalysis(id: string): Promise<FaceAnalysis | undefined>;
}

export class DbStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    if (!db) throw new Error('Database not available');
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    if (!db) throw new Error('Database not available');
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    if (!db) throw new Error('Database not available');
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async createFaceAnalysis(analysis: InsertFaceAnalysis): Promise<FaceAnalysis> {
    if (!db) throw new Error('Database not available');
    const result = await db.insert(faceAnalyses).values(analysis as any).returning();
    return result[0];
  }

  async getFaceAnalyses(limit: number = 10): Promise<FaceAnalysis[]> {
    if (!db) return [];
    return await db
      .select()
      .from(faceAnalyses)
      .orderBy(desc(faceAnalyses.analysisTimestamp))
      .limit(limit);
  }

  async getFaceAnalysis(id: string): Promise<FaceAnalysis | undefined> {
    if (!db) return undefined;
    const result = await db.select().from(faceAnalyses).where(eq(faceAnalyses.id, id)).limit(1);
    return result[0];
  }
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private analyses: Map<string, FaceAnalysis>;

  constructor() {
    this.users = new Map();
    this.analyses = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createFaceAnalysis(analysis: InsertFaceAnalysis): Promise<FaceAnalysis> {
    const id = randomUUID();
    const faceAnalysis: FaceAnalysis = {
      id,
      imageFileName: analysis.imageFileName,
      imageDimensions: analysis.imageDimensions,
      detectedFaces: analysis.detectedFaces as any,
      analysisTimestamp: new Date(),
      processingTime: analysis.processingTime || null
    };
    this.analyses.set(id, faceAnalysis);
    return faceAnalysis;
  }

  async getFaceAnalyses(limit: number = 10): Promise<FaceAnalysis[]> {
    return Array.from(this.analyses.values())
      .sort((a, b) => b.analysisTimestamp.getTime() - a.analysisTimestamp.getTime())
      .slice(0, limit);
  }

  async getFaceAnalysis(id: string): Promise<FaceAnalysis | undefined> {
    return this.analyses.get(id);
  }
}

// Use database storage if available, otherwise use in-memory storage
export const storage = db ? new DbStorage() : new MemStorage();
