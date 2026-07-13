import prisma from "../config/prisma.js";

const createReview = async (actor, bookingGroupId, rating, comment) => {
  const booking = await prisma.bookingGroups.findUnique({
    where: { BookingGroupID: bookingGroupId },
    include: { Transactions: true }
  });

  if (!booking) {
    throw new Error("Không tìm thấy hóa đơn đặt lịch");
  }

  let customerId = booking.CustomerID;

  if (actor.role === "Customer") {
    const customer = await prisma.customers.findFirst({
      where: { UserID: actor.userId },
    });

    if (!customer) {
      throw new Error("Không tìm thấy hồ sơ khách hàng của bạn");
    }
    if (booking.CustomerID !== customer.CustomerID) {
      throw new Error("Bạn không có quyền đánh giá hóa đơn của người khác");
    }
    customerId = customer.CustomerID;
  } else if (actor.role === "Staff") {
    if (!actor.branchId || booking.BranchID !== actor.branchId) {
      throw new Error("Bạn không có quyền đánh giá booking của chi nhánh khác");
    }
  }

  if (booking.Status !== "Completed") {
    throw new Error("Chỉ có thể đánh giá sau khi xe đã rửa xong (Completed)");
  }

  const transaction = booking.Transactions.find(tx => tx.Status === "Paid");
  if (!transaction) {
    throw new Error("Chỉ có thể đánh giá sau khi hóa đơn đã thanh toán xong (Paid)");
  }

  const existingReview = await prisma.reviews.findUnique({
    where: { BookingGroupID: bookingGroupId }
  });

  if (existingReview) {
    throw new Error("Bạn đã đánh giá cho hóa đơn này rồi");
  }

  const review = await prisma.reviews.create({
    data: {
      BookingGroupID: bookingGroupId,
      CustomerID: customerId,
      BranchID: booking.BranchID,
      Rating: rating,
      Comment: comment,
    }
  });

  return review;
};

const getBranchReviews = async (branchId) => {
  const reviews = await prisma.reviews.findMany({
    where: { BranchID: branchId },
    include: {
      Customers: {
        include: { Users: { select: { FullName: true } } }
      }
    },
    orderBy: { CreatedAt: 'desc' }
  });

  const aggregate = await prisma.reviews.aggregate({
    where: { BranchID: branchId },
    _avg: { Rating: true },
    _count: { Rating: true }
  });

  const formattedReviews = reviews.map(r => {

    let name = "Khách Hàng";
    if (r.Customers?.Users?.FullName) {
      name = r.Customers.Users.FullName;
      if (name.length > 5) {
        const parts = name.split(" ");
        if (parts.length > 1) {
          const lastName = parts.pop();
          name = parts.join(" ") + " " + lastName.charAt(0) + "***";
        } else {
          name = name.substring(0, 3) + "***";
        }
      }
    }
    return {
      ReviewID: r.ReviewID,
      Rating: r.Rating,
      Comment: r.Comment,
      CreatedAt: r.CreatedAt,
      CustomerName: name
    }
  });

  return {
    averageRating: aggregate._avg.Rating ? parseFloat(aggregate._avg.Rating.toFixed(1)) : 0,
    totalReviews: aggregate._count.Rating,
    reviews: formattedReviews
  };
};

export default {
  createReview,
  getBranchReviews,
};
