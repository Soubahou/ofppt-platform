import { Router } from "express";
import * as userController from "../controllers/user.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorize } from "../middleware/authorize.js";
import { validate } from "../middleware/validate.js";
import { upload, handleMulterError } from "../middleware/upload.js";
import { createUserSchema, updateUserSchema } from "../utils/schemas.js";

const router = Router();

router.get("/:id/avatar", userController.getAvatar);

router.use(authenticate);

router.get("/roles", authorize("read", "user"), userController.getRoles);

router.get("/", authorize("read", "user"), userController.getAll);
router.get(
  "/:id",
  (req, res, next) => {
    if (String(req.user?.id) === String(req.params.id)) return next();
    return authorize("read", "user")(req, res, next);
  },
  userController.getById,
);
router.post(
  "/",
  authorize("create", "user"),
  validate(createUserSchema),
  userController.create,
);
router.put(
  "/:id",
  authorize("update", "user"),
  validate(updateUserSchema),
  userController.update,
);
router.delete("/:id", authorize("delete", "user"), userController.remove);

router.post(
  "/:id/avatar",
  upload.single("avatar"),
  handleMulterError,
  userController.setAvatar,
);
router.delete("/:id/avatar", userController.deleteAvatar);

export default router;
