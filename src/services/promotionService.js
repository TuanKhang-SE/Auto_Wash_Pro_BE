import prisma from "../config/prisma.js";

const getAllPromotions = async (branchId, role) => {
  let whereClause = {};
  if (role === "Manager" && branchId) {
    whereClause.OR = [
      { BranchID: branchId },
      { BranchID: null }
    ];
  }

  return await prisma.promotions.findMany({
    where: whereClause,
    orderBy: { StartDate: 'desc' }
  });
};

const getActivePromotions = async () => {
  const now = new Date();
  const promotions = await prisma.promotions.findMany({
    where: {
      Status: "Active",
      AND: [
        { OR: [{ StartDate: null }, { StartDate: { lte: now } }] },
        { OR: [{ EndDate: null }, { EndDate: { gte: now } }] },
      ],
    },
    include: {
      _count: { select: { TransactionDiscounts: true } },
    },
    orderBy: { EndDate: 'asc' }
  });

  return promotions.filter(
    (promotion) =>
      !promotion.UsageLimit ||
      promotion._count.TransactionDiscounts < promotion.UsageLimit,
  );
};

const getPromotionById = async (promotionId) => {
  const promo = await prisma.promotions.findUnique({
    where: { PromotionID: promotionId }
  });
  if (!promo) throw new Error("Không tìm thấy mã khuyến mãi");
  return promo;
};

const createPromotion = async (data) => {
  return await prisma.promotions.create({
    data: {
      PromotionName: data.PromotionName,
      BranchID: data.BranchID || null,
      DiscountType: data.DiscountType,
      DiscountValue: data.DiscountValue,
      StartDate: data.StartDate ? new Date(data.StartDate) : new Date(),
      EndDate: data.EndDate ? new Date(data.EndDate) : null,
      UsageLimit: data.UsageLimit || null,
      Status: "Active"
    }
  });
};

const updatePromotion = async (promotionId, data) => {
  await getPromotionById(promotionId);

  return await prisma.promotions.update({
    where: { PromotionID: promotionId },
    data: {
      PromotionName: data.PromotionName,
      BranchID: data.BranchID,
      DiscountType: data.DiscountType,
      DiscountValue: data.DiscountValue,
      StartDate: data.StartDate ? new Date(data.StartDate) : undefined,
      EndDate: data.EndDate ? new Date(data.EndDate) : undefined,
      UsageLimit: data.UsageLimit,
      Status: data.Status
    }
  });
};

const deletePromotion = async (promotionId) => {
  await getPromotionById(promotionId);
  return await prisma.promotions.update({
    where: { PromotionID: promotionId },
    data: { Status: "Inactive" }
  });
};

export default {
  getAllPromotions,
  getActivePromotions,
  getPromotionById,
  createPromotion,
  updatePromotion,
  deletePromotion
};
