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

export default {
  getDailyCashflow,
};
