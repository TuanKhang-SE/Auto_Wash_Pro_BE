import express from "express";
import invoiceController from "../controllers/invoiceController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import roleMiddleware from "../middlewares/roleMiddleware.js";

const router = express.Router();

/**
 * @openapi
 * /api/invoices/preview/{transactionId}:
 *   get:
 *     summary: Xem trước thông tin hóa đơn dựa vào TransactionID
 *     tags: ["Invoices"]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Thành công
 */
router.get("/preview/:transactionId", authMiddleware, invoiceController.getInvoicePreview);

/**
 * @openapi
 * /api/invoices/generate/{transactionId}:
 *   post:
 *     summary: Thu ngân xuất hóa đơn chính thức
 *     tags: ["Invoices"]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       201:
 *         description: Hóa đơn được tạo thành công
 */
router.post("/generate/:transactionId", authMiddleware, roleMiddleware(["Admin", "Manager", "Staff"]), invoiceController.generateInvoice);

/**
 * @openapi
 * /api/invoices/{id}:
 *   get:
 *     summary: Xem lại chi tiết hóa đơn đã xuất bằng InvoiceID
 *     tags: ["Invoices"]
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
router.get("/:id", authMiddleware, invoiceController.getInvoiceById);

/**
 * @openapi
 * /api/invoices/{id}/cancel:
 *   put:
 *     summary: Hủy hóa đơn (Chỉ quản lý)
 *     tags: ["Invoices"]
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
 *         description: Hủy thành công
 */
router.put("/:id/cancel", authMiddleware, roleMiddleware(["Admin", "Manager"]), invoiceController.cancelInvoice);

export default router;
