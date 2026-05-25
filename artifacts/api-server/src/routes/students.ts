import { Router, type IRouter } from "express";
import { eq, like, and } from "drizzle-orm";
import { db, studentsTable, classesTable } from "@workspace/db";
import {
  CreateStudentBody,
  GetStudentParams,
  UpdateStudentParams,
  UpdateStudentBody,
  DeleteStudentParams,
  ListStudentsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

const withClass = () =>
  db
    .select({
      id: studentsTable.id,
      name: studentsTable.name,
      registration: studentsTable.registration,
      classId: studentsTable.classId,
      className: classesTable.name,
      qrCode: studentsTable.qrCode,
    })
    .from(studentsTable)
    .innerJoin(classesTable, eq(studentsTable.classId, classesTable.id));

router.get("/students", async (req, res): Promise<void> => {
  const query = ListStudentsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const { classId, search } = query.data;
  const conditions = [];
  if (classId) conditions.push(eq(studentsTable.classId, classId));
  if (search) conditions.push(like(studentsTable.name, `%${search}%`));

  const rows = await (conditions.length
    ? withClass().where(and(...conditions)).orderBy(studentsTable.name)
    : withClass().orderBy(studentsTable.name));
  res.json(rows);
});

router.post("/students", async (req, res): Promise<void> => {
  const parsed = CreateStudentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const qrCode = `QR-${parsed.data.registration}-${Date.now()}`;
  const [student] = await db.insert(studentsTable).values({ ...parsed.data, qrCode }).returning();
  const [cls] = await db.select().from(classesTable).where(eq(classesTable.id, student.classId));
  res.status(201).json({ ...student, className: cls?.name ?? "" });
});

router.get("/students/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetStudentParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [student] = await withClass().where(eq(studentsTable.id, params.data.id));
  if (!student) {
    res.status(404).json({ error: "Aluno não encontrado" });
    return;
  }
  res.json(student);
});

router.patch("/students/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateStudentParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateStudentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [updated] = await db
    .update(studentsTable)
    .set(parsed.data)
    .where(eq(studentsTable.id, params.data.id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Aluno não encontrado" });
    return;
  }
  const [cls] = await db.select().from(classesTable).where(eq(classesTable.id, updated.classId));
  res.json({ ...updated, className: cls?.name ?? "" });
});

router.delete("/students/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteStudentParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [student] = await db.delete(studentsTable).where(eq(studentsTable.id, params.data.id)).returning();
  if (!student) {
    res.status(404).json({ error: "Aluno não encontrado" });
    return;
  }
  res.sendStatus(204);
});

export default router;
