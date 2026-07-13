import { Router } from "express";
import * as dashboardCtrl from "../controllers/dashboard.controller.js";
import branchRoutes from "./branch.routes.js";
import groupRoutes from "./group.routes.js";
import moduleRoutes from "./module.routes.js";
import roomRoutes from "./room.routes.js";
import teacherRoutes from "./teacher.routes.js";
import studentRoutes from "./student.routes.js";
import scheduleRoutes from "./schedule.routes.js";
import absenceRoutes from "./absence.routes.js";
import mtgRoutes from "./mtg.routes.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import * as scheduleCtrl from "../controllers/schedule.controller.js";
import * as absenceCtrl from "../controllers/absence.controller.js";

const router = Router();

router.use("/branches", branchRoutes);
router.use("/groups", groupRoutes);
router.use("/modules", moduleRoutes);
router.use("/rooms", roomRoutes);
router.use("/teachers", teacherRoutes);
router.use("/students", studentRoutes);
router.use("/absences", absenceRoutes);
router.use("/sessions", scheduleRoutes);
router.use("/module-teacher-groups", mtgRoutes);

router.get(
  "/schedule/week",
  authenticate,
  authorize("read", "schedule"),
  scheduleCtrl.getWeek,
);

router.post(
  "/schedule/generate-week",
  authenticate,
  authorize("create", "schedule"),
  scheduleCtrl.generateWeekInstances,
);

router.get(
  "/students/:id/absences",
  authenticate,
  authorize("read", "absence"),
  absenceCtrl.getAbsencesByStudent,
);

router.get(
  "/groups/:id/absences",
  authenticate,
  authorize("read", "absence"),
  (req, res, next) => {
    req.query.group_id = req.params.id;
    absenceCtrl.listAbsences(req, res, next);
  },
);

router.get(
  "/dashboard/stats",
  authenticate,
  authorize("read", "schedule"),
  dashboardCtrl.getStats,
);

export default router;
