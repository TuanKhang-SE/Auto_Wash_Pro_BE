import express from "express";
import dashboardController from "../controllers/dashboardController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import roleMiddleware from "../middlewares/roleMiddleware.js";

const router = express.Router();

/**
 * @openapi
 * /api/dashboard/daily-cashflow:
 *   get:
 *     summary: Lấy báo cáo doanh thu theo phương thức thanh toán (Daily Cashflow)
 *     tags: ["Báo cáo & Đối soát"]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Ngày bắt đầu (Ví dụ 2026-06-01). Mặc định là hôm nay.
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Ngày kết thúc (Ví dụ 2026-06-30). Mặc định là hôm nay.
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: integer
 *         description: ID chi nhánh (Chỉ Admin mới có quyền lọc theo BranchID).
 *     responses:
 *       200:
 *         description: Báo cáo thành công
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 totalRevenue: 10000000
 *                 breakdown:
 *                   CASH: 3000000
 *                   BANK_TRANSFER: 2000000
 *                   VNPAY: 5000000
 */
router.get(
  "/daily-cashflow",
  authMiddleware,
  roleMiddleware(["Admin", "Manager"]),
  dashboardController.getDailyCashflow
);

/**
 * @openapi
 * /api/dashboard/revenue-by-branch:
 *   get:
 *     summary: Lấy báo cáo tổng doanh thu theo từng chi nhánh
 *     tags: ["Báo cáo & Đối soát"]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Ngày bắt đầu (Ví dụ 2026-06-01). Mặc định lấy từ đầu hệ thống.
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Ngày kết thúc (Ví dụ 2026-06-30). Mặc định đến hiện tại.
 *     responses:
 *       200:
 *         description: Báo cáo thành công
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 totalRevenueAll: 50000000
 *                 totalBookingsAll: 150
 *                 branches: [
 *                   { branchId: 1, branchName: "Chi nhánh 1", totalRevenue: 20000000, totalBookings: 60 },
 *                   { branchId: 2, branchName: "Chi nhánh 2", totalRevenue: 30000000, totalBookings: 90 }
 *                 ]
 */
router.get(
  "/revenue-by-branch",
  authMiddleware,
  roleMiddleware(["Admin", "Manager"]),
  dashboardController.getRevenueByBranch
);

router.get(
  "/branch-overview",
  authMiddleware,
  roleMiddleware(["Admin", "Manager"]),
  dashboardController.getBranchOverview,
);

export default router;
