import { pgTable, text, serial, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// CV Session schema for storing CV creation session data
export const cvSessions = pgTable("cv_sessions", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().unique(),
  assistantId: text("assistant_id"),
  threadId: text("thread_id"),
  profession: text("profession"),
  sections: jsonb("sections"),
  cvData: jsonb("cv_data"),
  status: text("status").default("started"),
  completed: boolean("completed").default(false),
});

// Schema for creating a new CV session
export const insertCVSessionSchema = createInsertSchema(cvSessions).pick({
  sessionId: true,
  assistantId: true,
  threadId: true,
});

// Schema for updating CV session
export const updateCVSessionSchema = createInsertSchema(cvSessions).omit({
  id: true,
});

// Types
export type InsertCVSession = z.infer<typeof insertCVSessionSchema>;
export type UpdateCVSession = z.infer<typeof updateCVSessionSchema>;
export type CVSession = typeof cvSessions.$inferSelect;

// CV Data schema for input validation
export const cvDataSchema = z.object({
  personalInfo: z.object({
    fullName: z.string(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    location: z.string().optional(),
    title: z.string().optional(),
  }),
  sections: z.array(z.object({
    title: z.string(),
    content: z.any(),
  })),
});

export type CVData = z.infer<typeof cvDataSchema>;
