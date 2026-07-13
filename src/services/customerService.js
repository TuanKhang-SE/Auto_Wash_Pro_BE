import prisma from "../config/prisma.js";

const getProfile = async (userId) => {
  let customer = await prisma.customers.findFirst({
    where: { UserID: userId },
    include: {
      Users: {
        select: {
          FullName: true,
          Phone: true,
          Email: true,
          CreatedAt: true,
        },
      },
      Vehicles: {
        where: { Status: "Active" },
      },
      LoyaltyAccounts: {
        include: {
          tier_configs: true,
        },
      },
    },
  });

  if (!customer) {
    const user = await prisma.users.findUnique({
      where: { UserID: userId },
      select: {
        FullName: true,
        Phone: true,
        Email: true,
        CreatedAt: true,
      },
    });

    return {
      IsNewCustomer: true,
      Users: user,
      TotalVisits: 0,
      TotalSpent: 0,
      Vehicles: [],
      LoyaltyAccounts: [],
    };
  }

  return customer;
};

const updateProfile = async (userId, data) => {
  const { FullName, Phone } = data;

  const updatedUser = await prisma.users.update({
    where: { UserID: userId },
    data: {
      FullName,
      Phone,
      UpdatedAt: new Date(),
    },
    select: {
      FullName: true,
      Phone: true,
      Email: true,
    },
  });

  return updatedUser;
};

const getAllCustomers = async () => {
  const users = await prisma.users.findMany({
    where: { Role: "Customer" },
    include: {
      Customers: {
        include: {
          LoyaltyAccounts: { include: { tier_configs: true } },
        },
      },
    },
    orderBy: { CreatedAt: "desc" },
  });

  return users.map((user) => {
    const customer = user.Customers[0];
    const account = customer?.LoyaltyAccounts?.[0];
    return {
      userId: user.UserID,
      customerId: customer?.CustomerID || null,
      fullName: user.FullName,
      email: user.Email,
      phone: user.Phone,
      status: user.Status,
      createdAt: user.CreatedAt,
      totalVisits: customer?.TotalVisits || 0,
      totalSpent: customer?.TotalSpent || 0,
      loyalty: {
        accountId: account?.AccountID || null,
        currentPoints: account?.CurrentPoints || 0,
        lifetimePoints: account?.LifetimePoints || 0,
        tierId: account?.TierID || null,
        tierName: account?.tier_configs?.TierName || "Chưa có hạng",
        tierConfig: account?.tier_configs || null,
      },
    };
  });
};

export default {
  getProfile,
  updateProfile,
  getAllCustomers,
};
