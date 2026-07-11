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

  return { totalRevenue, breakdown };
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
};
