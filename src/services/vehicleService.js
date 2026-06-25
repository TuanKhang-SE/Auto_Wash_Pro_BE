import prisma from "../config/prisma.js";


const getOrCreateCustomer = async (userId) => {
  let customer = await prisma.customers.findFirst({
    where: { UserID: userId },
  });

  if (!customer) {

    const defaultTier = await prisma.tier_configs.findFirst({
      orderBy: { MinSpent: "asc" },
    });

    if (!defaultTier) {
      throw new Error("Hệ thống chưa được cấu hình hạng thành viên. Vui lòng liên hệ Admin.");
    }


    customer = await prisma.$transaction(async (tx) => {
      const newCustomer = await tx.customers.create({
        data: {
          UserID: userId,
          TotalVisits: 0,
          TotalSpent: 0,
        },
      });

      await tx.loyaltyAccounts.create({
        data: {
          CustomerID: newCustomer.CustomerID,
          TierID: defaultTier.TierID,
          CurrentPoints: 0,
          LifetimePoints: 0,
        },
      });

      return newCustomer;
    });
  }

  return customer.CustomerID;
};


const getAll = async (filters = {}) => {
  return await prisma.vehicles.findMany({
    where: {
      ...filters,
    },
    include: {
      Customers: {
        include: { Users: { select: { FullName: true, Phone: true } } },
      },
    },
    orderBy: { VehicleID: "asc" },
  });
};


const getById = async (id) => {
  return await prisma.vehicles.findUnique({
    where: { VehicleID: id },
  });
};


const create = async (data) => {

  const existing = await prisma.vehicles.findFirst({
    where: {
      LicensePlate: data.LicensePlate,
      Status: "Active",
    },
  });

  if (existing) {
    throw new Error("Biển số xe này đã được đăng ký trong hệ thống!");
  }

  return await prisma.vehicles.create({
    data,
  });
};


const update = async (id, data) => {

  if (data.LicensePlate) {
    const existing = await prisma.vehicles.findFirst({
      where: {
        LicensePlate: data.LicensePlate,
        Status: "Active",
        NOT: { VehicleID: id },
      },
    });
    if (existing) throw new Error("Biển số xe mới đã bị trùng với xe khác!");
  }

  return await prisma.vehicles.update({
    where: { VehicleID: id },
    data,
  });
};


const deleteSoft = async (id) => {
  return await prisma.vehicles.update({
    where: { VehicleID: id },
    data: { Status: "Inactive" },
  });
};

export default {
  getOrCreateCustomer,
  getAll,
  getById,
  create,
  update,
  deleteSoft,
};
