import { Router, type IRouter } from "express";
import { eq, gte, sql } from "drizzle-orm";
import { db, checkinsTable, studentsTable, classesTable, mealSlotsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/dashboard/stats", async (_req, res): Promise<void> => {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const [{ totalStudents }] = await db
    .select({ totalStudents: sql<number>`cast(count(*) as int)` })
    .from(studentsTable);

  const [{ totalClasses }] = await db
    .select({ totalClasses: sql<number>`cast(count(*) as int)` })
    .from(classesTable);

  const [{ totalCheckinsTodayCount }] = await db
    .select({ totalCheckinsTodayCount: sql<number>`cast(count(*) as int)` })
    .from(checkinsTable)
    .where(gte(checkinsTable.checkedInAt, todayStart));

  const [{ checkinsThisWeek }] = await db
    .select({ checkinsThisWeek: sql<number>`cast(count(*) as int)` })
    .from(checkinsTable)
    .where(gte(checkinsTable.checkedInAt, weekStart));

  const activeRows = await db
    .select({
      className: classesTable.name,
      count: sql<number>`cast(count(${checkinsTable.id}) as int)`,
    })
    .from(checkinsTable)
    .innerJoin(studentsTable, eq(checkinsTable.studentId, studentsTable.id))
    .innerJoin(classesTable, eq(studentsTable.classId, classesTable.id))
    .where(gte(checkinsTable.checkedInAt, weekStart))
    .groupBy(classesTable.name)
    .orderBy(sql`count(${checkinsTable.id}) desc`)
    .limit(1);

  const mostActiveClass = activeRows[0]?.className ?? null;

  res.json({
    totalStudents,
    totalClasses,
    totalCheckinsTodayCount,
    checkinsThisWeek,
    mostActiveClass,
  });
});

router.get("/dashboard/today-schedule", async (_req, res): Promise<void> => {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const slots = await db
    .select({
      id: mealSlotsTable.id,
      classId: mealSlotsTable.classId,
      className: classesTable.name,
      startTime: mealSlotsTable.startTime,
      endTime: mealSlotsTable.endTime,
      weekDays: mealSlotsTable.weekDays,
    })
    .from(mealSlotsTable)
    .innerJoin(classesTable, eq(mealSlotsTable.classId, classesTable.id))
    .orderBy(mealSlotsTable.startTime);

  const result = await Promise.all(
    slots.map(async (slot) => {
      const [{ count }] = await db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(checkinsTable)
        .where(
          sql`${checkinsTable.mealSlotId} = ${slot.id} AND ${checkinsTable.checkedInAt} >= ${todayStart}`
        );
      return { ...slot, checkinCount: count };
    })
  );

  res.json(result);
});

export default router;
