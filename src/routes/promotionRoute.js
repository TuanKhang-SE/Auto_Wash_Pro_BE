import express from "express";
import { z } from "zod";
import promotionController from "../controllers/promotionController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import roleMiddleware from "../middlewares/roleMiddleware.js";
import validate from "../middlewares/validateMiddleware.js";

const router = express.Router();

const promotionSchema = z.object({
  PromotionName: z.string().min(1, "Tên khuyến mãi không được để trống"),
  DiscountType: z.enum(["PERCENTAGE", "FIXED_AMOUNT"], {
    errorMap: () => ({ message: "Loại giảm giá phải là PERCENTAGE hoặc FIXED_AMOUNT" })
  }),
  DiscountValue: z.number().min(0, "Giá trị giảm giá không được nhỏ hơn 0"),
  StartDate: z.string().datetime({ message: "Ngày bắt đầu không hợp lệ (ISO 8601)" }).optional(),
  EndDate: z.string().datetime({ message: "Ngày kết thúc không hợp lệ (ISO 8601)" }).optional(),
  UsageLimit: z.number().int().min(1, "Giới hạn sử dụng phải lớn hơn 0").optional().nullable(),
  BranchID: z.number().int().positive().optional().nullable()
});

const promotionUpdateSchema = z.object({
  PromotionName: z.string().min(1, "Tên khuyến mãi không được để trống").optional(),
  DiscountType: z.enum(["PERCENTAGE", "FIXED_AMOUNT"], {
    errorMap: () => ({ message: "Loại giảm giá phải là PERCENTAGE hoặc FIXED_AMOUNT" })
  }).optional(),
  DiscountValue: z.number().min(0, "Giá trị giảm giá không được nhỏ hơn 0").optional(),
  StartDate: z.string().datetime({ message: "Ngày bắt đầu không hợp lệ (ISO 8601)" }).optional(),
  EndDate: z.string().datetime({ message: "Ngày kết thúc không hợp lệ (ISO 8601)" }).optional(),
  UsageLimit: z.number().int().min(1, "Giới hạn sử dụng phải lớn hơn 0").optional().nullable(),
  BranchID: z.number().int().positive().optional().nullable(),
  Status: z.string().optional()
});

/**
 * @openapi
 * /api/promotions/active:
 *   get:
 *     summary: Lấy danh sách Khuyến mãi đang chạy (Public/Customer)
 *     tags: ["Khuyến mãi"]
 *     responses:
 *       200:
 *         description: Trả về danh sách khuyến mãi đang Active và còn hạn
 */
router.get("/active", promotionController.getActivePromotions);

/**
 * @openapi
 * /api/promotions:
 *   get:
 *     summary: Lấy danh sách tất cả Khuyến mãi (Admin/Manager)
 *     tags: ["Khuyến mãi"]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Trả về danh sách khuyến mãi
 *   post:
 *     summary: Tạo Khuyến mãi mới (Admin/Manager)
 *     tags: ["Khuyến mãi"]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               PromotionName:
 *                 type: string
 *               DiscountType:
 *                 type: string
 *                 enum: [PERCENTAGE, FIXED_AMOUNT]
 *               DiscountValue:
 *                 type: number
 *               StartDate:
 *                 type: string
 *                 format: date-time
 *               EndDate:
 *                 type: string
 *                 format: date-time
 *               UsageLimit:
 *                 type: integer
 *               BranchID:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Tạo thành công
 */
router.get("/", authMiddleware, roleMiddleware(["Admin", "Manager"]), promotionController.getAllPromotions);
router.post("/", authMiddleware, roleMiddleware(["Admin", "Manager"]), validate(promotionSchema), promotionController.createPromotion);

/**
 * @openapi
 * /api/promotions/{id}:
 *   get:
 *     summary: Lấy thông tin 1 Khuyến mãi (Admin/Manager)
 *     tags: ["Khuyến mãi"]
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
 *         description: Trả về thông tin khuyến mãi
 *   put:
 *     summary: Cập nhật Khuyến mãi (Admin/Manager)
 *     tags: ["Khuyến mãi"]
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
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *   delete:
 *     summary: Tạm ngưng/Xóa mềm Khuyến mãi (Admin/Manager)
 *     tags: ["Khuyến mãi"]
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
router.get("/:id", authMiddleware, roleMiddleware(["Admin", "Manager"]), promotionController.getPromotionById);
router.put("/:id", authMiddleware, roleMiddleware(["Admin", "Manager"]), validate(promotionUpdateSchema), promotionController.updatePromotion);
router.delete("/:id", authMiddleware, roleMiddleware(["Admin", "Manager"]), promotionController.deletePromotion);

export default router;
