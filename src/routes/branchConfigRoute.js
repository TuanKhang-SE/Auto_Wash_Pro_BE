import express from "express";
import { z } from "zod/v4";
import authMiddleware from "../middlewares/authMiddleware.js";
import roleMiddleware from "../middlewares/roleMiddleware.js";
import validate from "../middlewares/validateMiddleware.js";
import branchConfigController from "../controllers/branchConfigController.js";

const router = express.Router();

const upsertSchema = z.object({
  BranchID: z.number().int().positive("BranchID phải là số nguyên dương"),
  SlotDuration: z.number().int().positive().optional(),
  TotalWashBays: z.number().int().positive().optional(),
  BufferMinutes: z.number().int().min(0).optional(),
  MaxCarsPerBooking: z.number().int().positive().optional(),
  CancelWindowHours: z.number().int().min(0).optional(),
});

/**
 * @openapi
 * /api/branch-configs:
 *   get:
 *     summary: Lấy cấu hình chi nhánh
 *     tags: ["Cấu hình Chi nhánh"]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: BranchID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Thành công
 */
router.get(
  "/",
  authMiddleware,
  roleMiddleware(["Admin", "Manager"]),
  branchConfigController.getConfig
);

/**
 * @openapi
 * /api/branch-configs:
 *   post:
 *     summary: Cập nhật cấu hình chi nhánh
 *     tags: ["Cấu hình Chi nhánh"]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - BranchID
 *             properties:
 *               BranchID:
 *                 type: integer
 *                 example: 1
 *               SlotDuration:
 *                 type: integer
 *                 example: 30
 *               TotalWashBays:
 *                 type: integer
 *                 example: 8
 *               BufferMinutes:
 *                 type: integer
 *                 example: 5
 *               MaxCarsPerBooking:
 *                 type: integer
 *                 example: 2
 *               CancelWindowHours:
 *                 type: integer
 *                 example: 24
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
router.post(
  "/",
  authMiddleware,
  roleMiddleware(["Admin", "Manager"]),
  validate(upsertSchema),
  branchConfigController.upsertConfig
);

export default router;
