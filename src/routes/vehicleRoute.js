import express from "express";
import { z } from "zod/v4";
import authMiddleware from "../middlewares/authMiddleware.js";
import roleMiddleware from "../middlewares/roleMiddleware.js";
import validate from "../middlewares/validateMiddleware.js";
import vehicleController from "../controllers/vehicleController.js";

const router = express.Router();


const createSchema = z.object({
  LicensePlate: z.string().min(1, "Biển số xe không được để trống"),
  VehicleType: z.enum(["Xe máy", "Xe tay ga", "Mô tô"]),
  Brand: z.string().optional(),
  Model: z.string().optional(),
  Color: z.string().optional(),
  CustomerID: z.number().int().positive().optional(), 
});

const updateSchema = z.object({
  LicensePlate: z.string().min(1).optional(),
  VehicleType: z.enum(["Xe máy", "Xe tay ga", "Mô tô"]).optional(),
  Brand: z.string().optional(),
  Model: z.string().optional(),
  Color: z.string().optional(),
});

/**
 * @openapi
 * /api/vehicles:
 *   get:
 *     summary: Danh sách xe
 *     tags: ["Quản lý Xe"]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: Status
 *         schema:
 *           type: string
 *           enum: [Active, Inactive]
 *         description: Lọc theo trạng thái
 *       - in: query
 *         name: CustomerID
 *         schema:
 *           type: integer
 *         description: Lọc theo ID khách hàng (Chỉ Admin)
 *     responses:
 *       200:
 *         description: Thành công
 */
router.get(
  "/",
  authMiddleware,
  roleMiddleware(["Admin", "Customer"]),
  vehicleController.getAllVehicles
);

/**
 * @openapi
 * /api/vehicles/{id}:
 *   get:
 *     summary: Chi tiết 1 xe
 *     tags: ["Quản lý Xe"]
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
  roleMiddleware(["Admin", "Customer"]),
  vehicleController.getVehicleById
);

/**
 * @openapi
 * /api/vehicles:
 *   post:
 *     summary: Thêm xe
 *     tags: ["Quản lý Xe"]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - LicensePlate
 *             properties:
 *               LicensePlate:
 *                 type: string
 *                 example: 59F1-123.45
 *               VehicleType:
 *                 type: string
 *                 example: Xe máy
 *               Brand:
 *                 type: string
 *                 example: Honda
 *               Model:
 *                 type: string
 *                 example: Wave RSX
 *               Color:
 *                 type: string
 *                 example: Đỏ đen
 *               CustomerID:
 *                 type: integer
 *                 description: Bắt buộc đối với Admin, tự động nhận dạng với Customer
 *                 example: 1
 *     responses:
 *       201:
 *         description: Thành công
 */
router.post(
  "/",
  authMiddleware,
  roleMiddleware(["Admin", "Customer"]),
  validate(createSchema),
  vehicleController.createVehicle
);

/**
 * @openapi
 * /api/vehicles/{id}:
 *   put:
 *     summary: Cập nhật thông tin xe
 *     tags: ["Quản lý Xe"]
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
 *               LicensePlate:
 *                 type: string
 *                 example: 59F1-999.99
 *               VehicleType:
 *                 type: string
 *               Brand:
 *                 type: string
 *               Model:
 *                 type: string
 *               Color:
 *                 type: string
 *     responses:
 *       200:
 *         description: Thành công
 */
router.put(
  "/:id",
  authMiddleware,
  roleMiddleware(["Admin", "Customer"]),
  validate(updateSchema),
  vehicleController.updateVehicle
);

/**
 * @openapi
 * /api/vehicles/{id}:
 *   delete:
 *     summary: Xóa xe (Soft delete)
 *     tags: ["Quản lý Xe"]
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
  roleMiddleware(["Admin", "Customer"]),
  vehicleController.deleteVehicle
);

export default router;
