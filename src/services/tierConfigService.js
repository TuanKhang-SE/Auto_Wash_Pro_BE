import prisma from "../config/prisma.js";

const getAll = async () => {
  return await prisma.tier_configs.findMany({
    orderBy: { MinSpent: 'asc' }
  });
};

const getById = async (id) => {
  return await prisma.tier_configs.findUnique({
    where: { TierID: id }
  });
};

const create = async (data) => {
  return await prisma.tier_configs.create({
    data: {
      TierName: data.TierName,
      MinSpent: data.MinSpent || 0,
      DiscountPercent: data.DiscountPercent || 0,
      PointMultiplier: data.PointMultiplier || 1,
      Status: data.Status || "Active",
    }
  });
};

const update = async (id, data) => {
  const validData = { UpdateAt: new Date() };
  if (data.TierName !== undefined) validData.TierName = data.TierName;
  if (data.MinSpent !== undefined) validData.MinSpent = data.MinSpent;
  if (data.DiscountPercent !== undefined) validData.DiscountPercent = data.DiscountPercent;
  if (data.PointMultiplier !== undefined) validData.PointMultiplier = data.PointMultiplier;
  if (data.Status !== undefined) validData.Status = data.Status;

  return await prisma.tier_configs.update({
    where: { TierID: id },
    data: validData
  });
};

const remove = async (id) => {
  return await prisma.tier_configs.update({
    where: { TierID: id },
    data: { Status: "Inactive", UpdateAt: new Date() }
  });
};

export default {
  getAll,
  getById,
  create,
  update,
  remove
};
