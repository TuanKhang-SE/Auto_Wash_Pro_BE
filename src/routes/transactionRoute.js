import express from "express";
import { z } from "zod";
import authMiddleware from "../middlewares/authMiddleware.js";
import roleMiddleware from "../middlewares/roleMiddleware.js";
import validate from "../middlewares/validateMiddleware.js";
import transactionController from "../controllers/transactionController.js";

const router = express.Router();

const payManualSchema = z.object({
  method: z.enum(["CASH", "BANK_TRANSFER"], {
    errorMap: () => ({
      message: "Phương thức thanh toán chỉ có thể là CASH hoặc BANK_TRANSFER",
    }),
  }),
});

/**
 * @openapi
 * /api/transactions/from-booking/{bookingId}:
 *   post:
 *     summary: Tạo hóa đơn thanh toán từ Booking
 *     tags: ["Giao dịch & Thanh toán"]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID của BookingGroup
 *     responses:
 *       201:
 *         description: Tạo hóa đơn thành công
 *         content:
 *           application/json:
 *             example:
 *               message: "Tạo hóa đơn tạm tính thành công"
 *               data:
 *                 TransactionID: 1
 *                 BookingGroupID: 5
 *                 CustomerID: 12
 *                 Subtotal: 250000
 *                 DiscountAmount: 0
 *                 FinalAmount: 250000
 *                 Status: "Pending"
 *                 CreatedAt: "2026-06-23T06:35:00.000Z"
 */
router.post(
  "/from-booking/:bookingId",
  authMiddleware,
  roleMiddleware(["Admin", "Manager", "Staff"]),
  transactionController.createFromBooking,
);

/**
 * @openapi
 * /api/transactions/{id}/pay-manual:
 *   post:
 *     summary: Xác nhận thu tiền thủ công (Tiền mặt/Chuyển khoản)
 *     tags: ["Giao dịch & Thanh toán"]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID của Giao dịch (Transaction)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               method:
 *                 type: string
 *                 enum: [CASH, BANK_TRANSFER]
 *           example:
 *             method: "CASH"
 *     responses:
 *       200:
 *         description: Xác nhận thanh toán thành công
 *         content:
 *           application/json:
 *             example:
 *               message: "Xác nhận thanh toán thành công"
 *               data:
 *                 TransactionID: 1
 *                 BookingGroupID: 5
 *                 CustomerID: 12
 *                 Subtotal: 250000
 *                 DiscountAmount: 0
 *                 FinalAmount: 250000
 *                 Status: "Paid"
 *                 CreatedAt: "2026-06-23T06:35:00.000Z"
 */
router.post(
  "/:id/pay-manual",
  authMiddleware,
  roleMiddleware(["Admin", "Manager", "Staff"]),
  validate(payManualSchema),
  transactionController.payManual,
);

/**
 * @openapi
 * /api/transactions/{id}/create-vnpay-url:
 *   post:
 *     summary: Lấy link chuyển hướng sang VNPay
 *     tags: ["Giao dịch & Thanh toán"]
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
 *         description: Trả về link URL thanh toán
 *         content:
 *           application/json:
 *             example:
 *               message: "Tạo URL VNPay thành công"
 *               data:
 *                 url: "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=..."
 */
router.post(
  "/:id/create-vnpay-url",
  authMiddleware,
  transactionController.createVNPayUrl,
);

/**
 * @openapi
 * /api/transactions/{id}/apply-discount:
 *   post:
 *     summary: Áp dụng mã khuyến mãi vào hóa đơn
 *     tags: ["Giao dịch & Thanh toán"]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID của Giao dịch (Transaction)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               promotionId:
 *                 type: integer
 *           example:
 *             promotionId: 1
 *     responses:
 *       200:
 *         description: Áp dụng khuyến mãi thành công
 */
router.post(
  "/:id/apply-discount",
  authMiddleware,
  transactionController.applyDiscount,
);

/**
 * @openapi
 * /api/transactions/{id}/apply-reward:
 *   post:
 *     summary: Áp dụng phần quà đổi từ điểm (Reward) vào hóa đơn
 *     tags: ["Giao dịch & Thanh toán"]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID của Giao dịch (Transaction)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - redemptionId
 *             properties:
 *               redemptionId:
 *                 type: integer
 *           example:
 *             redemptionId: 1
 *     responses:
 *       200:
 *         description: Áp dụng phần quà thành công
 */
router.post(
  "/:id/apply-reward",
  authMiddleware,
  transactionController.applyReward,
);

router.get("/vnpay-return", transactionController.vnpayReturn);
router.get("/vnpay-ipn", transactionController.vnpayIPN);

export default router;
