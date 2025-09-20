import { sql } from "drizzle-orm";
import { pgTable, text, varchar, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const faceAnalyses = pgTable("face_analyses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  imageFileName: text("image_file_name").notNull(),
  imageDimensions: jsonb("image_dimensions").$type<{ width: number; height: number }>().notNull(),
  detectedFaces: jsonb("detected_faces").$type<FaceDetectionResult[]>().notNull(),
  analysisTimestamp: timestamp("analysis_timestamp").notNull().defaultNow(),
  processingTime: text("processing_time"),
});

export interface FaceDetectionResult {
  id: string;
  box: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  age: number;
  ageConfidence: number;
  gender: 'male' | 'female';
  genderConfidence: number;
  landmarks?: { x: number; y: number }[];
}

export interface AnalysisStats {
  totalFaces: number;
  avgConfidence: number;
  processingTime: string;
  imageSize: string;
}

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertFaceAnalysisSchema = createInsertSchema(faceAnalyses).omit({
  id: true,
  analysisTimestamp: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type FaceAnalysis = typeof faceAnalyses.$inferSelect;
export type InsertFaceAnalysis = z.infer<typeof insertFaceAnalysisSchema>;
