import { Router, type IRouter } from "express";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { db, checkinsTable, studentsTable, classesTable, mealSlotsTable } from "@workspace/db";
import {
  ListCheckinsQueryParams,
  ScanQrCodeBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/checkins", async (req, res): Promise<void> => {
  const query = ListCheckinsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const { date, studentId } = query.data;
  const conditions = [];
  if (date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    conditions.push(gte(checkinsTable.checkedInAt, start));
    conditions.push(lte(checkinsTable.checkedInAt, end));
  }
  if (studentId) {
    conditions.push(eq(checkinsTable.studentId, studentId));
  }

  const rows = await db
    .select({
      id: checkinsTable.id,
      studentId: checkinsTable.studentId,
      studentName: studentsTable.name,
      className: classesTable.name,
      mealSlotId: checkinsTable.mealSlotId,
      checkedInAt: sql<string>`${checkinsTable.checkedInAt}::text`,
      status: checkinsTable.status,
    })
    .from(checkinsTable)
    .innerJoin(studentsTable, eq(checkinsTable.studentId, studentsTable.id))
    .innerJoin(classesTable, eq(studentsTable.classId, classesTable.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(sql`${checkinsTable.checkedInAt} desc`);
  res.json(rows);
});

router.post("/checkins/scan", async (req, res): Promise<void> => {
  const parsed = ScanQrCodeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { studentId } = parsed.data;

  const [student] = await db
    .select({
      id: studentsTable.id,
      name: studentsTable.name,
      classId: studentsTable.classId,
      className: classesTable.name,
    })
    .from(studentsTable)
    .innerJoin(classesTable, eq(studentsTable.classId, classesTable.id))
    .where(eq(studentsTable.id, studentId));

  if (!student) {
    res.status(404).json({ error: "Aluno não encontrado" });
    return;
  }

  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const dayOfWeek = now.getDay();

  const slots = await db
    .select()
    .from(mealSlotsTable)
    .where(eq(mealSlotsTable.classId, student.classId));

  const matchingSlot = slots.find((slot) => {
    const days = slot.weekDays.split(",").map((d) => parseInt(d.trim(), 10));
    return (
      days.includes(dayOfWeek) &&
      currentTime >= slot.startTime &&
      currentTime <= slot.endTime
    );
  });

  const status = matchingSlot ? "allowed" : slots.length === 0 ? "no_slot" : "denied";
  const message =
    status === "allowed"
      ? `Entrada liberada! Bom apetite, ${student.name}!`
      : status === "no_slot"
      ? "Nenhum horário cadastrado para esta turma."
      : "Fora do horário permitido para esta turma.";

  const [checkin] = await db
    .insert(checkinsTable)
    .values({
      studentId,
      mealSlotId: matchingSlot?.id ?? null,
      status,
    })
    .returning();

  res.json({
    status,
    message,
    studentName: student.name,
    className: student.className,
    checkinId: checkin.id,
  });
});

export default router;
