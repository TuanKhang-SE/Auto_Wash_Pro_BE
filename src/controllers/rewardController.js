import rewardService from "../services/rewardService.js";
import prisma from "../config/prisma.js";

const getAllRewards = async (req, res) => {
  try {
    const rewards = await rewardService.getAllRewards(req.query.status || "Active");
    res.json({ success: true, data: rewards });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createReward = async (req, res) => {
  try {
    const reward = await rewardService.createReward(req.body);
    res.status(201).json({ success: true, message: "Tạo phần quà thành công", data: reward });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const updateReward = async (req, res) => {
  try {
    const reward = await rewardService.updateReward(parseInt(req.params.id), req.body);
    res.json({ success: true, message: "Cập nhật phần quà thành công", data: reward });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const redeemReward = async (req, res) => {
  try {
    let customerId = req.body.CustomerID;

    if (req.user.role === "Customer") {
      const customer = await prisma.customers.findFirst({ where: { UserID: req.user.userId } });
      if (!customer) return res.status(404).json({ success: false, message: "Chưa có hồ sơ khách hàng" });
      customerId = customer.CustomerID;
    }

    if (!customerId) {
      return res.status(400).json({ success: false, message: "Thiếu thông tin CustomerID" });
    }

    const result = await rewardService.redeemReward(parseInt(customerId), parseInt(req.body.RewardID));
    res.json({ success: true, message: "Đổi quà thành công", data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const getCustomerRedemptions = async (req, res) => {
  try {
    let customerId = parseInt(req.params.customerId);

    if (req.user.role === "Customer") {
      const customer = await prisma.customers.findFirst({ where: { UserID: req.user.userId } });
      if (!customer || customer.CustomerID !== customerId) {
        return res.status(403).json({ success: false, message: "Không có quyền xem phần quà của khách hàng khác" });
      }
    }

    const redemptions = await rewardService.getCustomerRedemptions(customerId);
    res.json({ success: true, data: redemptions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export default {
  getAllRewards,
  createReward,
  updateReward,
  redeemReward,
  getCustomerRedemptions
};
