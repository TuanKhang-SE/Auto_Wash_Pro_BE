import prisma from "../config/prisma.js";

const getDailyCashflow = async (branchId, role, startDate, endDate) => {
  let dateFilter = {};
  if (startDate && endDate) {
    // Parse ngày bắt đầu từ 00:00:00 và ngày kết thúc đến 23:59:59
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    dateFilter = {
      ConfirmedAt: {
        gte: start,
        lte: end,
      },
    };
  } else {
    // Mặc định lấy dữ liệu hôm nay
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    dateFilter = {
      ConfirmedAt: {
        gte: today,
        lte: endOfToday,
      },
    };
  }

  let branchFilter = {};
  if (role === "Manager" && branchId) {
    branchFilter = {
      Transactions: {
        BookingGroups: {
          BranchID: branchId,
        },
      },
    };
  } else if (role === "Admin" && branchId) { // Admin lọc chi nhánh cụ thể
    branchFilter = {
      Transactions: {
        BookingGroups: {
          BranchID: parseInt(branchId),
        },
      },
    };
  }

  const records = await prisma.paymentRecords.findMany({
    where: {
      Status: "Success",
      ...dateFilter,
      ...branchFilter,
    },
    select: {
      Method: true,
      Amount: true,
      ConfirmedAt: true,
    },
  });

  let totalRevenue = 0;
  const breakdown = {
    CASH: 0,
    BANK_TRANSFER: 0,
    VNPAY: 0,
  };

  records.forEach((record) => {
    const amount = parseFloat(record.Amount || 0);
    totalRevenue += amount;
    
    if (breakdown[record.Method] !== undefined) {
      breakdown[record.Method] += amount;
    } else {
      breakdown[record.Method] = amount;
    }
  });

  const dailyMap = new Map();
  records.forEach((record) => {
    if (!record.ConfirmedAt) return;
    const date = record.ConfirmedAt;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const current = dailyMap.get(key) || { date: key, cash: 0, transfer: 0, other: 0, total: 0 };
    const amount = parseFloat(record.Amount || 0);
    if (record.Method === "CASH") current.cash += amount;
    else if (record.Method === "BANK_TRANSFER" || record.Method === "VNPAY") current.transfer += amount;
    else current.other += amount;
    current.total += amount;
    dailyMap.set(key, current);
  });

  const dailyData = Array.from(dailyMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  return {
    totalRevenue,
    breakdown,
    dailyData,
    summary: {
      totalCash: breakdown.CASH || 0,
      totalTransfer: (breakdown.BANK_TRANSFER || 0) + (breakdown.VNPAY || 0),
      total: totalRevenue,
    },
  };
};

const getBranchOverview = async (role, userBranchId) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const branches = await prisma.branches.findMany({
    where: role === "Manager" && userBranchId ? { BranchID: userBranchId } : {},
    include: {
      Users: {
        where: { Role: "Staff", Status: "Active" },
        select: { UserID: true },
      },
      branch_configs: true,
      Reviews: { select: { Rating: true } },
      BookingGroups: {
        where: {
          BookingDate: { gte: monthStart, lt: nextMonthStart },
          Status: { not: "Cancelled" },
        },
        include: {
          BookingItems: {
            where: { Status: { not: "Cancelled" } },
            select: { BookingItemID: true },
          },
          Transactions: {
            include: {
              PaymentRecords: {
                where: {
                  Status: "Success",
                  ConfirmedAt: { gte: monthStart, lt: nextMonthStart },
                },
                select: { Amount: true },
              },
            },
          },
        },
      },
    },
    orderBy: { BranchID: "asc" },
  });

  return branches.map((branch) => {
    const todayBookings = branch.BookingGroups.filter(
      (booking) =>
        booking.BookingDate &&
        booking.BookingDate >= todayStart &&
        booking.BookingDate < tomorrowStart,
    );
    const revenue = branch.BookingGroups.reduce(
      (sum, booking) =>
        sum +
        booking.Transactions.reduce(
          (txSum, transaction) =>
            txSum +
            transaction.PaymentRecords.reduce(
              (paymentSum, payment) => paymentSum + parseFloat(payment.Amount || 0),
              0,
            ),
          0,
        ),
      0,
    );
    const rating = branch.Reviews.length
      ? branch.Reviews.reduce((sum, review) => sum + review.Rating, 0) /
        branch.Reviews.length
      : 0;

    const config = branch.branch_configs[0];
    const openMinutes = branch.OpenTime
      ? branch.OpenTime.getUTCHours() * 60 + branch.OpenTime.getUTCMinutes()
      : 7 * 60;
    const closeMinutes = branch.CloseTime
      ? branch.CloseTime.getUTCHours() * 60 + branch.CloseTime.getUTCMinutes()
      : 20 * 60;
    const slotStep = Math.max(1, (config?.SlotDuration || 30) + (config?.BufferMinutes || 0));
    const dailyCapacity =
      Math.max(0, Math.floor((closeMinutes - openMinutes) / slotStep)) *
      Math.max(1, config?.TotalWashBays || 1);
    const todayVehicleCount = todayBookings.reduce(
      (sum, booking) => sum + booking.BookingItems.length,
      0,
    );

    return {
      branchId: branch.BranchID,
      branchName: branch.BranchName,
      totalStaff: branch.Users.length,
      todayBookings: todayBookings.length,
      monthBookings: branch.BookingGroups.length,
      revenue,
      rating: Number(rating.toFixed(1)),
      reviewCount: branch.Reviews.length,
      occupancy: dailyCapacity
        ? Math.min(100, Math.round((todayVehicleCount / dailyCapacity) * 100))
        : 0,
    };
  });
};

const getRevenueByBranch = async (role, userBranchId, startDate, endDate) => {
  let dateFilter = {};
  if (startDate && endDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    dateFilter = { ConfirmedAt: { gte: start, lte: end } };
  }

  let branchFilter = {};
  if (role === "Manager" && userBranchId) {
    branchFilter = { BranchID: userBranchId };
  }

  const branches = await prisma.branches.findMany({
    where: branchFilter,
    select: {
      BranchID: true,
      BranchName: true,
      BookingGroups: {
        select: {
          Transactions: {
            select: {
              PaymentRecords: {
                where: { Status: "Success", ...dateFilter },
                select: { Amount: true }
              }
            }
          }
        }
      }
    }
  });

  let totalRevenueAll = 0;
  let totalBookingsAll = 0;
  const branchRevenues = branches.map(branch => {
    let branchTotal = 0;
    let branchBookings = 0;
    branch.BookingGroups.forEach(group => {
      let hasValidPayment = false;
      group.Transactions.forEach(tx => {
        tx.PaymentRecords.forEach(payment => {
          branchTotal += parseFloat(payment.Amount || 0);
          hasValidPayment = true;
        });
      });
      if (hasValidPayment) {
        branchBookings++;
      }
    });

    totalRevenueAll += branchTotal;
    totalBookingsAll += branchBookings;

    return {
      branchId: branch.BranchID,
      branchName: branch.BranchName,
      totalRevenue: branchTotal,
      totalBookings: branchBookings
    };
  });

  return {
    totalRevenueAll,
    totalBookingsAll,
    branches: branchRevenues
  };
};

export default {
  getDailyCashflow,
  getRevenueByBranch,
  getBranchOverview,
};
