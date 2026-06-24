import express from "express";
import { z } from "zod/v4";
import authMiddleware from "../middlewares/authMiddleware.js";
import roleMiddleware from "../middlewares/roleMiddleware.js";
import validate from "../middlewares/validateMiddleware.js";
import shiftController from "../controllers/shiftController.js";

const router = express.Router();

const createSchema = z.object({
  ShiftName: z.string().min(1, "Tên ca không được để trống"),
  StartTime: z.string().datetime().optional(), // ISO string like 2024-01-01T08:00:00.000Z
  EndTime: z.string().datetime().optional(),
});

const updateSchema = z.object({
  ShiftName: z.string().min(1).optional(),
  StartTime: z.string().datetime().optional(),
  EndTime: z.string().datetime().optional(),
  Status: z.enum(["Active", "Inactive"]).optional(),
});

/**
 * @openapi
 * /api/shifts:
 *   get:
 *     summary: Lấy danh sách ca làm việc
 *     tags: ["Quản lý Ca làm việc"]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: Status
 *         schema:
 *           type: string
 *           enum: [Active, Inactive]
 *         description: Lọc theo trạng thái
 *     responses:
 *       200:
 *         description: Thành công
 */
router.get(
  "/",
  authMiddleware,
  roleMiddleware(["Admin", "Manager", "Staff"]),
  shiftController.getAllShifts,
);

/**
 * @openapi
 * /api/shifts/{id}:
 *   get:
 *     summary: Xem chi tiết 1 ca làm việc
 *     tags: ["Quản lý Ca làm việc"]
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
router.get(
  "/:id",
  authMiddleware,
  roleMiddleware(["Admin", "Manager", "Staff"]),
  shiftController.getShiftById,
);

/**
 * @openapi
 * /api/shifts:
 *   post:
 *     summary: Thêm ca làm việc mới
 *     tags: ["Quản lý Ca làm việc"]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ShiftName
 *             properties:
 *               ShiftName:
 *                 type: string
 *                 example: Ca Sáng
 *               StartTime:
 *                 type: string
 *                 format: date-time
 *                 example: "1970-01-01T08:00:00.000Z"
 *               EndTime:
 *                 type: string
 *                 format: date-time
 *                 example: "1970-01-01T12:00:00.000Z"
 *     responses:
 *       201:
 *         description: Thành công
 */
router.post(
  "/",
  authMiddleware,
  roleMiddleware(["Admin"]),
  validate(createSchema),
  shiftController.createShift,
);

/**
 * @openapi
 * /api/shifts/{id}:
 *   put:
 *     summary: Cập nhật ca làm việc
 *     tags: ["Quản lý Ca làm việc"]
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
 *               ShiftName:
 *                 type: string
 *                 example: Ca Sáng Sớm
 *               StartTime:
 *                 type: string
 *                 format: date-time
 *               EndTime:
 *                 type: string
 *                 format: date-time
 *               Status:
 *                 type: string
 *                 enum: [Active, Inactive]
 *     responses:
 *       200:
 *         description: Thành công
 */
router.put(
  "/:id",
  authMiddleware,
  roleMiddleware(["Admin"]),
  validate(updateSchema),
  shiftController.updateShift,
);

/**
 * @openapi
 * /api/shifts/{id}:
 *   delete:
 *     summary: Xóa ca làm việc (Soft delete)
 *     tags: ["Quản lý Ca làm việc"]
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
 *         description: Xóa thành công
 */
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware(["Admin"]),
  shiftController.deleteShift,
);

export default router;
