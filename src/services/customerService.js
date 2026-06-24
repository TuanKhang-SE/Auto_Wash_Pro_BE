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

export default {
  getProfile,
  updateProfile,
};
