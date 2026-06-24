import express from "express";
import { z } from "zod/v4";
import authMiddleware from "../middlewares/authMiddleware.js";
import roleMiddleware from "../middlewares/roleMiddleware.js";
import validate from "../middlewares/validateMiddleware.js";
import staffScheduleController from "../controllers/staffScheduleController.js";

const router = express.Router();

const createSchema = z.object({
  UserID: z.number().int().positive("UserID phải là số nguyên dương"),
  WorkDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "WorkDate phải có định dạng YYYY-MM-DD"),
  ShiftID: z.number().int().positive("ShiftID phải là số nguyên dương"),
  CapacityWeight: z.number().positive().optional(),
});

const updateSchema = z.object({
  WorkDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "WorkDate phải có định dạng YYYY-MM-DD").optional(),
  ShiftID: z.number().int().positive().optional(),
  CapacityWeight: z.number().positive().optional(),
  Status: z.enum(["Active", "Inactive"]).optional(),
});

/**
 * @openapi
 * /api/staff-schedules:
 *   get:
 *     summary: Lấy danh sách lịch làm việc
 *     tags: ["Quản lý Lịch làm việc"]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: UserID
 *         schema:
 *           type: integer
 *         description: Lọc theo nhân viên
 *       - in: query
 *         name: ShiftID
 *         schema:
 *           type: integer
 *         description: Lọc theo ca làm việc
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *         description: Lọc từ ngày (YYYY-MM-DD)
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *         description: Lọc đến ngày (YYYY-MM-DD)
 *       - in: query
 *         name: Status
 *         schema:
 *           type: string
 *           enum: [Active, Inactive]
 *     responses:
 *       200:
 *         description: Thành công
 */
router.get(
  "/",
  authMiddleware,
  roleMiddleware(["Admin", "Manager", "Staff"]),
  staffScheduleController.getAllSchedules
);

/**
 * @openapi
 * /api/staff-schedules/{id}:
 *   get:
 *     summary: Xem chi tiết 1 lịch làm việc
 *     tags: ["Quản lý Lịch làm việc"]
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
  staffScheduleController.getScheduleById
);

/**
 * @openapi
 * /api/staff-schedules:
 *   post:
 *     summary: Xếp lịch cho nhân viên
 *     tags: ["Quản lý Lịch làm việc"]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - UserID
 *               - WorkDate
 *               - ShiftID
 *             properties:
 *               UserID:
 *                 type: integer
 *               WorkDate:
 *                 type: string
 *                 format: date
 *                 example: "2026-06-25"
 *               ShiftID:
 *                 type: integer
 *               CapacityWeight:
 *                 type: number
 *                 example: 1.0
 *     responses:
 *       201:
 *         description: Thành công
 */
router.post(
  "/",
  authMiddleware,
  roleMiddleware(["Admin", "Manager"]),
  validate(createSchema),
  staffScheduleController.createSchedule
);

/**
 * @openapi
 * /api/staff-schedules/{id}:
 *   put:
 *     summary: Cập nhật lịch làm việc
 *     tags: ["Quản lý Lịch làm việc"]
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
 *               WorkDate:
 *                 type: string
 *                 format: date
 *               ShiftID:
 *                 type: integer
 *               CapacityWeight:
 *                 type: number
 *               Status:
 *                 type: string
 *                 enum: [Active, Inactive]
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
router.put(
  "/:id",
  authMiddleware,
  roleMiddleware(["Admin", "Manager"]),
  validate(updateSchema),
  staffScheduleController.updateSchedule
);

/**
 * @openapi
 * /api/staff-schedules/{id}:
 *   delete:
 *     summary: Xóa lịch làm việc (Soft Delete)
 *     tags: ["Quản lý Lịch làm việc"]
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
  roleMiddleware(["Admin", "Manager"]),
  staffScheduleController.deleteSchedule
);

export default router;
