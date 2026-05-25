import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, mealSlotsTable, classesTable } from "@workspace/db";
import {
  CreateMealSlotBody,
  UpdateMealSlotParams,
  UpdateMealSlotBody,
  DeleteMealSlotParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

const withClass = () =>
  db
    .select({
      id: mealSlotsTable.id,
      classId: mealSlotsTable.classId,
      className: classesTable.name,
      startTime: mealSlotsTable.startTime,
      endTime: mealSlotsTable.endTime,
      weekDays: mealSlotsTable.weekDays,
    })
    .from(mealSlotsTable)
    .innerJoin(classesTable, eq(mealSlotsTable.classId, classesTable.id));

router.get("/meal-slots", async (_req, res): Promise<void> => {
  const rows = await withClass().orderBy(mealSlotsTable.startTime);
  res.json(rows);
});

router.post("/meal-slots", async (req, res): Promise<void> => {
  const parsed = CreateMealSlotBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [slot] = await db.insert(mealSlotsTable).values(parsed.data).returning();
  const [cls] = await db.select().from(classesTable).where(eq(classesTable.id, slot.classId));
  res.status(201).json({ ...slot, className: cls?.name ?? "" });
});

router.patch("/meal-slots/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateMealSlotParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateMealSlotBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [updated] = await db
    .update(mealSlotsTable)
    .set(parsed.data)
    .where(eq(mealSlotsTable.id, params.data.id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Horário não encontrado" });
    return;
  }
  const [cls] = await db.select().from(classesTable).where(eq(classesTable.id, updated.classId));
  res.json({ ...updated, className: cls?.name ?? "" });
});

router.delete("/meal-slots/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteMealSlotParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [slot] = await db.delete(mealSlotsTable).where(eq(mealSlotsTable.id, params.data.id)).returning();
  if (!slot) {
    res.status(404).json({ error: "Horário não encontrado" });
    return;
  }
  res.sendStatus(204);
});

export default router;
