import express from "express";
import { z } from "zod/v4";
import authMiddleware from "../middlewares/authMiddleware.js";
import roleMiddleware from "../middlewares/roleMiddleware.js";
import validate from "../middlewares/validateMiddleware.js";
import bookingController from "../controllers/bookingController.js";

const router = express.Router();

const createBookingSchema = z.object({
  BranchID: z.number().int().positive(),
  BookingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Định dạng YYYY-MM-DD"),
  StartTime: z.string().regex(/^\d{2}:\d{2}$/, "Định dạng HH:mm"),
  Items: z.array(
    z.object({
      VehicleID: z.number().int().positive(),
      Services: z.array(
        z.object({
          ServiceID: z.number().int().positive()
        })
      ).min(1, "Phải chọn ít nhất 1 dịch vụ")
    })
  ).min(1, "Phải có ít nhất 1 xe trong đơn")
});

/**
 * @openapi
 * /api/bookings/available-slots:
 *   get:
 *     summary: Xem slot trống
 *     tags: ["Đặt lịch (Booking)"]
 *     parameters:
 *       - in: query
 *         name: BranchID
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: BookingDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Thành công
 */
router.get("/available-slots", bookingController.getAvailableSlots);

/**
 * @openapi
 * /api/bookings/me:
 *   get:
 *     summary: Lịch sử đặt lịch của tôi
 *     tags: ["Đặt lịch (Booking)"]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thành công
 */
router.get(
  "/me",
  authMiddleware,
  roleMiddleware(["Customer"]),
  bookingController.getMyBookings
);

/**
 * @openapi
 * /api/bookings:
 *   post:
 *     summary: Đặt lịch rửa xe
 *     tags: ["Đặt lịch (Booking)"]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               BranchID:
 *                 type: integer
 *                 example: 1
 *               BookingDate:
 *                 type: string
 *                 example: "2026-06-25"
 *               StartTime:
 *                 type: string
 *                 example: "08:00"
 *               Items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     VehicleID:
 *                       type: integer
 *                       example: 1
 *                     Services:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           ServiceID:
 *                             type: integer
 *                             example: 1
 *     responses:
 *       201:
 *         description: Thành công
 */
router.post(
  "/",
  authMiddleware,
  roleMiddleware(["Customer"]),
  validate(createBookingSchema),
  bookingController.createBooking
);

/**
 * @openapi
 * /api/bookings/{id}/cancel:
 *   patch:
 *     summary: Hủy đơn đặt lịch
 *     tags: ["Đặt lịch (Booking)"]
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
router.patch(
  "/:id/cancel",
  authMiddleware,
  roleMiddleware(["Customer"]),
  bookingController.cancelBooking
);

export default router;
