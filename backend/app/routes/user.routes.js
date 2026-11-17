import { Router } from "express";
import { authenticate } from "../authorization/authorization.js";
import userController from "../controllers/user.controller.js";

const router = Router();

router.get("/:id", [authenticate], userController.findOne);
router.put("/:id", [authenticate], userController.update);

export default router;
