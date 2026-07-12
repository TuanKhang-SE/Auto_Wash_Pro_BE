import express from "express";
import { z } from "zod";
import authMiddleware from "../middlewares/authMiddleware.js";
import roleMiddleware from "../middlewares/roleMiddleware.js";
import validate from "../middlewares/validateMiddleware.js";
import reviewController from "../controllers/reviewController.js";

const router = express.Router();

const createReviewSchema = z.object({
  bookingGroupId: z.number().int().positive("ID Đơn hàng không hợp lệ"),
  rating: z.number().int().min(1, "Chấm điểm từ 1 đến 5 sao").max(5, "Chấm điểm tối đa 5 sao"),
  comment: z.string().optional(),
});

/**
 * @openapi
 * /api/reviews:
 *   post:
 *     summary: Khách hàng gửi đánh giá dịch vụ
 *     tags: ["Đánh giá (Reviews)"]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bookingGroupId:
 *                 type: integer
 *               rating:
 *                 type: integer
 *               comment:
 *                 type: string
 *     responses:
 *       201:
 *         description: Đánh giá thành công
 */
router.post(
  "/",
  authMiddleware,
  roleMiddleware(["Customer"]),
  validate(createReviewSchema),
  reviewController.createReview
);

/**
 * @openapi
 * /api/reviews/branch/{branchId}:
 *   get:
 *     summary: Xem điểm sao trung bình và danh sách đánh giá của Chi nhánh
 *     tags: ["Đánh giá (Reviews)"]
 *     parameters:
 *       - in: path
 *         name: branchId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Trả về thành công
 */
router.get("/branch/:branchId", reviewController.getBranchReviews);

export default router;
