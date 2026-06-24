import express from "express";
import { z } from "zod/v4";
import authMiddleware from "../middlewares/authMiddleware.js";
import roleMiddleware from "../middlewares/roleMiddleware.js";
import validate from "../middlewares/validateMiddleware.js";
import customerController from "../controllers/customerController.js";

const router = express.Router();

const updateProfileSchema = z.object({
  FullName: z.string().min(1, "Họ tên không được để trống").optional(),
  Phone: z.string().min(10, "Số điện thoại không hợp lệ").optional(),
});

/**
 * @openapi
 * /api/customers/profile:
 *   get:
 *     summary: Xem hồ sơ cá nhân của Khách hàng
 *     tags: ["Hồ sơ Khách hàng"]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thành công
 */
router.get(
  "/profile",
  authMiddleware,
  roleMiddleware(["Customer"]),
  customerController.getProfile
);

/**
 * @openapi
 * /api/customers/profile:
 *   put:
 *     summary: Cập nhật hồ sơ cá nhân của Khách hàng
 *     tags: ["Hồ sơ Khách hàng"]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               FullName:
 *                 type: string
 *                 example: Nguyễn Văn B
 *               Phone:
 *                 type: string
 *                 example: "0912345678"
 *     responses:
 *       200:
 *         description: Thành công
 */
router.put(
  "/profile",
  authMiddleware,
  roleMiddleware(["Customer"]),
  validate(updateProfileSchema),
  customerController.updateProfile
);

export default router;
