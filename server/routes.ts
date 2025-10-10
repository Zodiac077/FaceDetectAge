import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertFaceAnalysisSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Face analysis routes
  app.post("/api/analyses", async (req, res) => {
    try {
      const data = insertFaceAnalysisSchema.parse(req.body);
      const analysis = await storage.createFaceAnalysis(data);
      res.json(analysis);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/analyses", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const analyses = await storage.getFaceAnalyses(limit);
      res.json(analyses);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/analyses/:id", async (req, res) => {
    try {
      const analysis = await storage.getFaceAnalysis(req.params.id);
      if (!analysis) {
        res.status(404).json({ error: "Analysis not found" });
        return;
      }
      res.json(analysis);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
