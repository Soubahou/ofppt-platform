import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { validate } from "../middleware/validate.js";
import { submissionUpload } from "../middleware/upload.js";
import {
  createSubmissionSchema,
  patchSubmissionStatusSchema,
  gradeSubmissionSchema,
} from "../utils/schemas.js";
import * as submissionController from "../controllers/submission.controller.js";

const router = Router();

router.get(
  "/",
  authenticate,
  authorize("read", "document"),
  submissionController.list,
);

router.post(
  "/",
  authenticate,
  authorize("submit", "document"),
  submissionUpload.single("file"),
  validate(createSubmissionSchema),
  submissionController.create,
);

router.get(
  "/:id",
  authenticate,
  authorize("read", "document"),
  submissionController.getById,
);

router.patch(
  "/:id/status",
  authenticate,
  authorize("assign", "document"),
  validate(patchSubmissionStatusSchema),
  submissionController.patchStatus,
);

router.patch(
  "/:id/grade",
  authenticate,
  authorize("assign", "document"),
  validate(gradeSubmissionSchema),
  submissionController.grade,
);

router.delete(
  "/:id",
  authenticate,
  authorize("submit", "document"),
  submissionController.remove,
);

router.get(
  "/:id/download",
  authenticate,
  authorize("read", "document"),
  submissionController.download,
);

export default router;
