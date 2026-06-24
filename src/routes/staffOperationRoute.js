import express from "express";
import authMiddleware from "../middlewares/authMiddleware.js";
import roleMiddleware from "../middlewares/roleMiddleware.js";
import staffOperationController from "../controllers/staffOperationController.js";

const router = express.Router();

/**
 * @openapi
 * /api/staff-operations/today-bookings:
 *   get:
 *     summary: Lấy danh sách xe rửa hôm nay (Cho Nhân viên)
 *     tags: ["Vận hành (Staff Operations)"]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: customerName
 *         schema:
 *           type: string
 *         description: Tìm kiếm theo tên khách hàng
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Lọc theo trạng thái (Pending, CheckedIn...)
 *     responses:
 *       200:
 *         description: Thành công
 */
router.get(
  "/today-bookings",
  authMiddleware,
  roleMiddleware(["Staff", "Manager", "Admin"]),
  staffOperationController.getTodayBookings
);

/**
 * @openapi
 * /api/staff-operations/booking-items/{id}/status:
 *   patch:
 *     summary: Cập nhật trạng thái 1 chiếc xe (CheckedIn, InProgress, Completed)
 *     tags: ["Vận hành (Staff Operations)"]
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
 *               status:
 *                 type: string
 *                 enum: [CheckedIn, InProgress, Completed]
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
router.patch(
  "/booking-items/:id/status",
  authMiddleware,
  roleMiddleware(["Staff", "Manager"]),
  staffOperationController.updateItemStatus
);

/**
 * @openapi
 * /api/staff-operations/booking-items/{id}/add-services:
 *   post:
 *     summary: Thêm dịch vụ phát sinh cho xe tại quán (Upsell)
 *     tags: ["Vận hành (Staff Operations)"]
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
 *               serviceIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 example: [1, 2]
 *     responses:
 *       200:
 *         description: Thành công
 */
router.post(
  "/booking-items/:id/add-services",
  authMiddleware,
  roleMiddleware(["Staff", "Manager"]),
  staffOperationController.addServices
);

export default router;
