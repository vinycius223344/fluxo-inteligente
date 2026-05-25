import { Router, type IRouter } from "express";
import healthRouter from "./health";
import classesRouter from "./classes";
import studentsRouter from "./students";
import mealSlotsRouter from "./meal_slots";
import checkinsRouter from "./checkins";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(classesRouter);
router.use(studentsRouter);
router.use(mealSlotsRouter);
router.use(checkinsRouter);
router.use(dashboardRouter);

export default router;
