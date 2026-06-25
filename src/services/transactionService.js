import prisma from "../config/prisma.js";
import vnpayConfig from "../config/vnpayConfig.js";

const handleLoyaltyAfterPayment = async (tx, transaction) => {
  const finalAmount = parseFloat(transaction.FinalAmount);
  if (finalAmount <= 0) return;

  const loyaltyAccount = await tx.loyaltyAccounts.findFirst({
    where: { CustomerID: transaction.CustomerID },
    include: { tier_configs: true }
  });

  if (!loyaltyAccount) return;

  const pointRate = parseInt(process.env.POINT_CONVERSION_RATE) || 10000;
  const multiplier = loyaltyAccount.tier_configs?.PointMultiplier ? parseFloat(loyaltyAccount.tier_configs.PointMultiplier) : 1;


  const earnedPoints = Math.floor(finalAmount / pointRate) * multiplier;


  const customer = await tx.customers.update({
    where: { CustomerID: transaction.CustomerID },
    data: {
      TotalSpent: { increment: finalAmount },
    }
  });


  let newTierId = loyaltyAccount.TierID;
  const newTotalSpent = parseFloat(customer.TotalSpent);
  const eligibleTiers = await tx.tier_configs.findMany({
    where: { MinSpent: { lte: newTotalSpent } },
    orderBy: { MinSpent: 'desc' }
  });

  if (eligibleTiers.length > 0) {
    newTierId = eligibleTiers[0].TierID;
  }


  await tx.loyaltyAccounts.update({
    where: { AccountID: loyaltyAccount.AccountID },
    data: {
      CurrentPoints: { increment: earnedPoints },
      LifetimePoints: { increment: earnedPoints },
      TierID: newTierId
    }
  });


  if (earnedPoints > 0) {
    await tx.pointTransactions.create({
      data: {
        AccountID: loyaltyAccount.AccountID,
        TransactionID: transaction.TransactionID,
        Type: "EARN",
        Points: earnedPoints,
      }
    });
  }
};

const createFromBooking = async (bookingId) => {
  const booking = await prisma.bookingGroups.findUnique({
    where: { BookingGroupID: bookingId },
    include: {
      BookingItems: {
        include: {
          ServiceLineItems: true,
        },
      },
    },
  });

  if (!booking) throw new Error("Không tìm thấy Booking");
  if (booking.Status !== "Completed") {
    throw new Error(
      "Chỉ có thể tạo hóa đơn khi đơn đặt lịch đã hoàn thành (Completed)",
    );
  }

  const existingTransaction = await prisma.transactions.findFirst({
    where: { BookingGroupID: bookingId },
  });

  if (existingTransaction) {
    if (existingTransaction.Status === "Paid") {
      throw new Error("Giao dịch này đã được thanh toán rồi");
    }
    return existingTransaction;
  }

  let subtotal = 0;
  booking.BookingItems.forEach((item) => {
    item.ServiceLineItems.forEach((lineItem) => {
      subtotal += parseFloat(lineItem.LineTotal || 0);
    });
  });


  const loyaltyAccount = await prisma.loyaltyAccounts.findFirst({
    where: { CustomerID: booking.CustomerID },
    include: { tier_configs: true }
  });

  const tierDiscountPercent = loyaltyAccount?.tier_configs?.DiscountPercent ? parseFloat(loyaltyAccount.tier_configs.DiscountPercent) : 0;
  const tierDiscountAmount = (subtotal * tierDiscountPercent) / 100;

  const finalAmount = subtotal - tierDiscountAmount;

  const transaction = await prisma.$transaction(async (tx) => {
    const newTx = await tx.transactions.create({
      data: {
        BookingGroupID: bookingId,
        CustomerID: booking.CustomerID,
        Subtotal: subtotal,
        DiscountAmount: tierDiscountAmount,
        FinalAmount: finalAmount,
        Status: "Pending",
      },
    });

    if (tierDiscountAmount > 0) {
      await tx.transactionDiscounts.create({
        data: {
          BookingGroupID: bookingId,
          CustomerID: booking.CustomerID,
          DiscountType: "TIER",
          DiscountAmount: tierDiscountAmount,
          DiscountName: `Giảm giá hạng ${loyaltyAccount.tier_configs.TierName}`
        }
      });
    }

    return newTx;
  });

  return transaction;
};

const payManual = async (transactionId, method, staffId) => {
  const validMethods = ["CASH", "BANK_TRANSFER"];
  if (!validMethods.includes(method)) {
    throw new Error(
      "Phương thức thanh toán thủ công chỉ hỗ trợ CASH hoặc BANK_TRANSFER",
    );
  }

  const transaction = await prisma.transactions.findUnique({
    where: { TransactionID: transactionId },
  });

  if (!transaction) throw new Error("Không tìm thấy Giao dịch");
  if (transaction.Status === "Paid") {
    throw new Error("Giao dịch này đã được thanh toán rồi");
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedTransaction = await tx.transactions.update({
      where: { TransactionID: transactionId },
      data: { Status: "Paid" },
    });

    await tx.paymentRecords.create({
      data: {
        TransactionID: transactionId,
        Method: method,
        Amount: transaction.FinalAmount,
        Status: "Success",
        ConfirmedBy: staffId,
        ConfirmedAt: new Date(),
      },
    });

    await handleLoyaltyAfterPayment(tx, updatedTransaction);

    return updatedTransaction;
  });

  return { message: "Xác nhận thanh toán thành công", data: result };
};

const createVNPayUrl = async (transactionId, ipAddr) => {
  const transaction = await prisma.transactions.findUnique({
    where: { TransactionID: transactionId },
  });

  if (!transaction) throw new Error("Không tìm thấy Giao dịch");
  if (transaction.Status !== "Pending") {
    throw new Error("Giao dịch này không ở trạng thái chờ thanh toán");
  }

  const txnRef = `${transactionId}_${Date.now()}`;

  const paymentUrl = vnpayConfig.buildPaymentUrl({
    vnp_Amount: parseFloat(transaction.FinalAmount),
    vnp_IpAddr: ipAddr || "127.0.0.1",
    vnp_TxnRef: txnRef,
    vnp_OrderInfo: `Thanh toan giao dich ${transactionId} tai AutoWashPro`,
    vnp_OrderType: "other",
    vnp_ReturnUrl: process.env.VNP_RETURN_URL,
  });

  return paymentUrl;
};

const vnpayIPN = async (query) => {
  try {
    const verify = vnpayConfig.verifyIpnCall(query);

    if (!verify.isVerified) {
      return { RspCode: "97", Message: "Invalid signature" };
    }

    const txnRef = query.vnp_TxnRef;
    const transactionId = parseInt(txnRef.split("_")[0]);

    const transaction = await prisma.transactions.findUnique({
      where: { TransactionID: transactionId },
    });

    if (!transaction) {
      return { RspCode: "01", Message: "Order not found" };
    }

    if (transaction.Status === "Paid") {
      return { RspCode: "02", Message: "Order already confirmed" };
    }

    if (!verify.isSuccess) {
      return { RspCode: "00", Message: "Confirm Success" };
    }

    await prisma.$transaction(async (tx) => {
      const updatedTx = await tx.transactions.update({
        where: { TransactionID: transactionId },
        data: { Status: "Paid" },
      });

      await tx.paymentRecords.create({
        data: {
          TransactionID: transactionId,
          Method: "VNPAY",
          Amount: transaction.FinalAmount,
          ReferenceCode: query.vnp_TransactionNo,
          Status: "Success",
          ConfirmedAt: new Date(),
        },
      });

      await handleLoyaltyAfterPayment(tx, updatedTx);
    });

    return { RspCode: "00", Message: "Confirm Success" };
  } catch (error) {
    console.error("Lỗi xử lý VNPay IPN:", error);
    return { RspCode: "99", Message: "Unknown error" };
  }
};

const applyDiscount = async (transactionId, promotionId) => {
  const transaction = await prisma.transactions.findUnique({
    where: { TransactionID: transactionId },
    include: { BookingGroups: true }
  });

  if (!transaction) throw new Error("Không tìm thấy hóa đơn");
  if (transaction.Status !== "Pending") {
    throw new Error("Chỉ có thể áp dụng mã giảm giá cho hóa đơn chưa thanh toán");
  }

  const promotion = await prisma.promotions.findUnique({
    where: { PromotionID: promotionId }
  });

  if (!promotion) throw new Error("Mã khuyến mãi không tồn tại");
  if (promotion.Status !== "Active") throw new Error("Mã khuyến mãi đã ngưng hoạt động");

  const now = new Date();
  if (promotion.StartDate && new Date(promotion.StartDate) > now) {
    throw new Error("Mã khuyến mãi chưa tới thời gian áp dụng");
  }
  if (promotion.EndDate && new Date(promotion.EndDate) < now) {
    throw new Error("Mã khuyến mãi đã hết hạn");
  }


  if (promotion.BranchID && transaction.BookingGroups?.BranchID !== promotion.BranchID) {
    throw new Error("Mã khuyến mãi không áp dụng cho chi nhánh này");
  }


  let promoDiscount = 0;
  const baseAmount = parseFloat(transaction.Subtotal);

  if (promotion.DiscountType === "PERCENTAGE") {
    promoDiscount = (baseAmount * parseFloat(promotion.DiscountValue)) / 100;
  } else if (promotion.DiscountType === "FIXED_AMOUNT") {
    promoDiscount = parseFloat(promotion.DiscountValue);
  }


  if (promoDiscount > baseAmount) {
    promoDiscount = baseAmount;
  }


  const amountAfterPromo = baseAmount - promoDiscount;

  const loyaltyAccount = await prisma.loyaltyAccounts.findFirst({
    where: { CustomerID: transaction.CustomerID },
    include: { tier_configs: true }
  });

  const tierDiscountPercent = loyaltyAccount?.tier_configs?.DiscountPercent ? parseFloat(loyaltyAccount.tier_configs.DiscountPercent) : 0;
  const tierDiscountAmount = (amountAfterPromo * tierDiscountPercent) / 100;

  const totalDiscount = promoDiscount + tierDiscountAmount;
  const newFinalAmount = baseAmount - totalDiscount;


  const result = await prisma.$transaction(async (tx) => {

    await tx.transactionDiscounts.deleteMany({
      where: {
        BookingGroupID: transaction.BookingGroupID,
        DiscountType: { in: ['PROMOTION', 'TIER', 'REWARD'] }
      }
    });


    const updatedTx = await tx.transactions.update({
      where: { TransactionID: transactionId },
      data: {
        DiscountAmount: totalDiscount,
        FinalAmount: newFinalAmount
      }
    });


    await tx.transactionDiscounts.create({
      data: {
        BookingGroupID: transaction.BookingGroupID,
        CustomerID: transaction.CustomerID,
        PromotionID: promotionId,
        DiscountType: 'PROMOTION',
        DiscountAmount: promoDiscount,
        DiscountName: promotion.PromotionName
      }
    });


    if (tierDiscountAmount > 0) {
      await tx.transactionDiscounts.create({
        data: {
          BookingGroupID: transaction.BookingGroupID,
          CustomerID: transaction.CustomerID,
          DiscountType: "TIER",
          DiscountAmount: tierDiscountAmount,
          DiscountName: `Giảm giá hạng ${loyaltyAccount.tier_configs.TierName}`
        }
      });
    }

    return updatedTx;
  });

  return result;
};

const applyReward = async (transactionId, redemptionId) => {
  const transaction = await prisma.transactions.findUnique({
    where: { TransactionID: transactionId },
    include: { BookingGroups: true }
  });

  if (!transaction) throw new Error("Không tìm thấy hóa đơn");
  if (transaction.Status !== "Pending") {
    throw new Error("Chỉ có thể áp dụng ưu đãi cho hóa đơn chưa thanh toán");
  }

  const redemption = await prisma.rewardRedemptions.findUnique({
    where: { RedemptionID: redemptionId },
    include: { Rewards: true }
  });

  if (!redemption) throw new Error("Mã phần quà không tồn tại");
  if (redemption.CustomerID !== transaction.CustomerID) {
    throw new Error("Phần quà này không thuộc về khách hàng hiện tại");
  }
  if (redemption.Status !== "UNUSED") {
    throw new Error("Phần quà này đã được sử dụng hoặc không hợp lệ");
  }

  let rewardDiscount = parseFloat(redemption.Rewards.DiscountValue || 0);
  const baseAmount = parseFloat(transaction.Subtotal);

  if (rewardDiscount > baseAmount) {
    rewardDiscount = baseAmount;
  }

  const amountAfterReward = baseAmount - rewardDiscount;

  const loyaltyAccount = await prisma.loyaltyAccounts.findFirst({
    where: { CustomerID: transaction.CustomerID },
    include: { tier_configs: true }
  });

  const tierDiscountPercent = loyaltyAccount?.tier_configs?.DiscountPercent ? parseFloat(loyaltyAccount.tier_configs.DiscountPercent) : 0;
  const tierDiscountAmount = (amountAfterReward * tierDiscountPercent) / 100;

  const totalDiscount = rewardDiscount + tierDiscountAmount;
  const newFinalAmount = baseAmount - totalDiscount;

  const result = await prisma.$transaction(async (tx) => {

    await tx.transactionDiscounts.deleteMany({
      where: {
        BookingGroupID: transaction.BookingGroupID,
        DiscountType: { in: ['PROMOTION', 'TIER', 'REWARD'] }
      }
    });

    const updatedTx = await tx.transactions.update({
      where: { TransactionID: transactionId },
      data: {
        DiscountAmount: totalDiscount,
        FinalAmount: newFinalAmount
      }
    });

    await tx.transactionDiscounts.create({
      data: {
        BookingGroupID: transaction.BookingGroupID,
        CustomerID: transaction.CustomerID,
        DiscountType: 'REWARD',
        ReferenceID: redemptionId,
        DiscountAmount: rewardDiscount,
        DiscountName: redemption.Rewards.RewardName
      }
    });

    if (tierDiscountAmount > 0) {
      await tx.transactionDiscounts.create({
        data: {
          BookingGroupID: transaction.BookingGroupID,
          CustomerID: transaction.CustomerID,
          DiscountType: "TIER",
          DiscountAmount: tierDiscountAmount,
          DiscountName: `Giảm giá hạng ${loyaltyAccount.tier_configs.TierName}`
        }
      });
    }


    await tx.rewardRedemptions.update({
      where: { RedemptionID: redemptionId },
      data: { Status: "USED" }
    });

    return updatedTx;
  });

  return result;
};

export default {
  createFromBooking,
  payManual,
  createVNPayUrl,
  vnpayIPN,
  applyDiscount,
  applyReward,
};
