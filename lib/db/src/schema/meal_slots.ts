import { pgTable, text, serial, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { classesTable } from "./classes";

export const mealSlotsTable = pgTable("meal_slots", {
  id: serial("id").primaryKey(),
  classId: integer("class_id").notNull().references(() => classesTable.id),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  weekDays: text("week_days").notNull(),
});

export const insertMealSlotSchema = createInsertSchema(mealSlotsTable).omit({ id: true });
export type InsertMealSlot = z.infer<typeof insertMealSlotSchema>;
export type MealSlot = typeof mealSlotsTable.$inferSelect;
