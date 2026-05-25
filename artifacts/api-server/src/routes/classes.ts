import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, classesTable, studentsTable } from "@workspace/db";
import {
  CreateClassBody,
  DeleteClassParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/classes", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id: classesTable.id,
      name: classesTable.name,
      year: classesTable.year,
      studentCount: sql<number>`cast(count(${studentsTable.id}) as int)`,
    })
    .from(classesTable)
    .leftJoin(studentsTable, eq(studentsTable.classId, classesTable.id))
    .groupBy(classesTable.id)
    .orderBy(classesTable.year, classesTable.name);
  res.json(rows);
});

router.post("/classes", async (req, res): Promise<void> => {
  const parsed = CreateClassBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [cls] = await db.insert(classesTable).values(parsed.data).returning();
  res.status(201).json({ ...cls, studentCount: 0 });
});

router.delete("/classes/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteClassParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [cls] = await db.delete(classesTable).where(eq(classesTable.id, params.data.id)).returning();
  if (!cls) {
    res.status(404).json({ error: "Turma não encontrada" });
    return;
  }
  res.sendStatus(204);
});

export default router;
