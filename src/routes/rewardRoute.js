import express from "express";
import { z } from "zod";
import authMiddleware from "../middlewares/authMiddleware.js";
import roleMiddleware from "../middlewares/roleMiddleware.js";
import validate from "../middlewares/validateMiddleware.js";
import rewardController from "../controllers/rewardController.js";

const router = express.Router();

const rewardSchema = z.object({
  RewardName: z.string().min(1, "Tên quà không được để trống"),
  RequiredPoints: z.number().int().positive("Số điểm yêu cầu phải lớn hơn 0"),
  DiscountValue: z.number().min(0).optional(),
  ValidDays: z.number().int().min(1).optional(),
  Status: z.string().optional()
});

const redeemSchema = z.object({
  RewardID: z.number().int().positive("RewardID không hợp lệ"),
  CustomerID: z.number().int().positive().optional() 
});

/**
 * @openapi
 * /api/rewards:
 *   get:
 *     summary: Lấy danh sách phần quà
 *     tags: ["Rewards"]
 *     responses:
 *       200:
 *         description: Thành công
 */
router.get("/", rewardController.getAllRewards);

/**
 * @openapi
 * /api/rewards:
 *   post:
 *     summary: Tạo phần quà mới
 *     tags: ["Rewards"]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               RewardName:
 *                 type: string
 *               RequiredPoints:
 *                 type: integer
 *               DiscountValue:
 *                 type: number
 *               ValidDays:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Thành công
 */
router.post(
  "/",
  authMiddleware,
  roleMiddleware(["Admin", "Manager"]),
  validate(rewardSchema),
  rewardController.createReward
);

/**
 * @openapi
 * /api/rewards/{id}:
 *   put:
 *     summary: Cập nhật phần quà
 *     tags: ["Rewards"]
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
 *               Status:
 *                 type: string
 *                 example: Inactive
 *     responses:
 *       200:
 *         description: Thành công
 */
router.put(
  "/:id",
  authMiddleware,
  roleMiddleware(["Admin", "Manager"]),
  rewardController.updateReward
);

/**
 * @openapi
 * /api/rewards/redeem:
 *   post:
 *     summary: Đổi điểm lấy quà
 *     tags: ["Rewards"]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               RewardID:
 *                 type: integer
 *               CustomerID:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Đổi quà thành công
 */
router.post(
  "/redeem",
  authMiddleware,
  validate(redeemSchema),
  rewardController.redeemReward
);

/**
 * @openapi
 * /api/rewards/customer/{customerId}:
 *   get:
 *     summary: Xem lịch sử quà tặng của khách hàng
 *     tags: ["Rewards"]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Thành công
 */
router.get(
  "/customer/:customerId",
  authMiddleware,
  rewardController.getCustomerRedemptions
);

export default router;
