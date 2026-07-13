import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as studentController from "../controllers/student.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { validate } from "../middleware/validate.js";
import { createStudentSchema, updateStudentSchema } from "../utils/schemas.js";

const router = Router();

const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: { error: "Too many requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(authenticate);

router.get("/", authorize("read", "user"), studentController.getAll);
router.get(
  "/:id",
  (req, res, next) => {
    if (String(req.user?.id) === String(req.params.id)) return next();
    return authorize("read", "user")(req, res, next);
  },
  studentController.getById,
);
router.post(
  "/",
  writeLimiter,
  authorize("create", "user"),
  validate(createStudentSchema),
  studentController.create,
);
router.put(
  "/:id",
  writeLimiter,
  authorize("update", "user"),
  validate(updateStudentSchema),
  studentController.update,
);
router.delete(
  "/:id",
  writeLimiter,
  authorize("delete", "user"),
  studentController.remove,
);

export default router;
