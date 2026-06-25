import prisma from "../config/prisma.js";

const getAllRewards = async (status = "Active") => {
  const where = status === "All" ? {} : { Status: status };
  return await prisma.rewards.findMany({
    where,
    orderBy: { RequiredPoints: 'asc' }
  });
};

const createReward = async (data) => {
  return await prisma.rewards.create({
    data: {
      RewardName: data.RewardName,
      RequiredPoints: data.RequiredPoints,
      DiscountValue: data.DiscountValue || 0,
      ValidDays: data.ValidDays || 30,
      Status: data.Status || "Active",
    }
  });
};

const updateReward = async (id, data) => {
  return await prisma.rewards.update({
    where: { RewardID: id },
    data
  });
};

const redeemReward = async (customerId, rewardId) => {
  const reward = await prisma.rewards.findUnique({
    where: { RewardID: rewardId }
  });

  if (!reward || reward.Status !== "Active") {
    throw new Error("Phần quà không tồn tại hoặc đã ngưng áp dụng.");
  }

  const loyaltyAccount = await prisma.loyaltyAccounts.findFirst({
    where: { CustomerID: customerId }
  });

  if (!loyaltyAccount) {
    throw new Error("Khách hàng chưa có tài khoản điểm thưởng.");
  }

  if (loyaltyAccount.CurrentPoints < reward.RequiredPoints) {
    throw new Error(`Bạn không đủ điểm. Cần ${reward.RequiredPoints} điểm, nhưng bạn chỉ có ${loyaltyAccount.CurrentPoints} điểm.`);
  }

  const result = await prisma.$transaction(async (tx) => {

    const updatedAccount = await tx.loyaltyAccounts.update({
      where: { AccountID: loyaltyAccount.AccountID },
      data: {
        CurrentPoints: { decrement: reward.RequiredPoints }
      }
    });


    await tx.pointTransactions.create({
      data: {
        AccountID: loyaltyAccount.AccountID,
        Type: "REDEEM",
        Points: -reward.RequiredPoints
      }
    });


    const redemption = await tx.rewardRedemptions.create({
      data: {
        RewardID: rewardId,
        CustomerID: customerId,
        Status: "UNUSED"
      }
    });

    return { updatedAccount, redemption };
  });

  return result;
};

const getCustomerRedemptions = async (customerId) => {
  return await prisma.rewardRedemptions.findMany({
    where: { CustomerID: customerId },
    include: { Rewards: true },
    orderBy: { RedeemedAt: 'desc' }
  });
};

export default {
  getAllRewards,
  createReward,
  updateReward,
  redeemReward,
  getCustomerRedemptions
};
