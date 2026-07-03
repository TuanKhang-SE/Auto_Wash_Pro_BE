import express from "express";

import authController from "../controllers/authController.js";

import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     summary: Đăng ký tài khoản khách hàng mới
 *     tags: [Xác thực]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *               - phone
 *               - email
 *               - password
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: Nguyễn Văn A
 *               phone:
 *                 type: string
 *                 example: "0987654321"
 *               email:
 *                 type: string
 *                 example: customer@example.com
 *               password:
 *                 type: string
 *                 example: "password123"
 *     responses:
 *       201:
 *         description: Đăng ký thành công
 *       400:
 *         description: Email đã tồn tại hoặc dữ liệu không hợp lệ
 */
router.post("/register", authController.register);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Đăng nhập vào hệ thống
 *     tags: [Xác thực]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: customer@example.com
 *               password:
 *                 type: string
 *                 example: "password123"
 *     responses:
 *       200:
 *         description: Đăng nhập thành công và trả về token JWT
 *       401:
 *         description: Email không tồn tại hoặc sai mật khẩu
 */
router.post("/login", authController.login);

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     summary: Đăng xuất tài khoản (Thu hồi token)
 *     tags: [Xác thực]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Đăng xuất thành công
 *       401:
 *         description: Không có token hoặc token đã bị thu hồi/hết hạn
 */
router.post("/logout", authMiddleware, authController.logout);

router.post("/send-register-code", authController.sendRegisterCode);

router.post("/forgot-password/send-code", authController.sendForgotPasswordCode);

router.post("/forgot-password/reset", authController.resetPassword);

export default router;
