import express from "express";
import { z } from "zod";
import authMiddleware from "../middlewares/authMiddleware.js";
import roleMiddleware from "../middlewares/roleMiddleware.js";
import validate from "../middlewares/validateMiddleware.js";
import tierConfigController from "../controllers/tierConfigController.js";

const router = express.Router();

const tierSchema = z.object({
  TierName: z.string().min(1, "Tên hạng không được để trống"),
  MinSpent: z.number().min(0).optional(),
  DiscountPercent: z.number().min(0).max(100).optional(),
  PointMultiplier: z.number().min(0).optional(),
  Status: z.string().optional()
});

const tierUpdateSchema = z.object({
  TierName: z.string().min(1, "Tên hạng không được để trống").optional(),
  MinSpent: z.number().min(0).optional(),
  DiscountPercent: z.number().min(0).max(100).optional(),
  PointMultiplier: z.number().min(0).optional(),
  Status: z.string().optional()
});

/**
 * @openapi
 * /api/tier-configs:
 *   get:
 *     summary: Lấy danh sách hạng thành viên
 *     tags: ["Loyalty & Cấu hình Hạng"]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thành công
 */
router.get("/", authMiddleware, tierConfigController.getAll);

/**
 * @openapi
 * /api/tier-configs/{id}:
 *   get:
 *     summary: Lấy chi tiết hạng thành viên
 *     tags: ["Loyalty & Cấu hình Hạng"]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Thành công
 */
router.get("/:id", authMiddleware, tierConfigController.getById);

/**
 * @openapi
 * /api/tier-configs:
 *   post:
 *     summary: Tạo mới hạng thành viên
 *     tags: ["Loyalty & Cấu hình Hạng"]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - TierName
 *             properties:
 *               TierName:
 *                 type: string
 *               MinSpent:
 *                 type: number
 *               DiscountPercent:
 *                 type: number
 *               PointMultiplier:
 *                 type: number
 *     responses:
 *       201:
 *         description: Thành công
 */
router.post(
  "/",
  authMiddleware,
  roleMiddleware(["Admin"]),
  validate(tierSchema),
  tierConfigController.create
);

/**
 * @openapi
 * /api/tier-configs/{id}:
 *   put:
 *     summary: Cập nhật hạng thành viên
 *     tags: ["Loyalty & Cấu hình Hạng"]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               TierName:
 *                 type: string
 *               MinSpent:
 *                 type: number
 *               DiscountPercent:
 *                 type: number
 *               PointMultiplier:
 *                 type: number
 *               Status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Thành công
 */
router.put(
  "/:id",
  authMiddleware,
  roleMiddleware(["Admin"]),
  validate(tierUpdateSchema),
  tierConfigController.update
);

/**
 * @openapi
 * /api/tier-configs/{id}:
 *   delete:
 *     summary: Xóa mềm (Vô hiệu hóa) hạng thành viên
 *     tags: ["Loyalty & Cấu hình Hạng"]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Thành công
 */
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware(["Admin"]),
  tierConfigController.remove
);

export default router;
