import prisma from "../config/prisma.js";

const autoCancelNoShowBookings = async () => {
  try {
    const pendingBookings = await prisma.bookingGroups.findMany({
      where: {
        Status: { in: ["Pending", "Confirmed"] },
      },
      include: { BookingItems: true },
    });

    const now = new Date();
    let cancelledCount = 0;

    for (const booking of pendingBookings) {
      if (!booking.BookingDate || !booking.StartTime) continue;

      const bookingDateTime = new Date(booking.BookingDate);
      const [hours, mins] = booking.StartTime.toISOString()
        .substring(11, 16)
        .split(":");
      bookingDateTime.setHours(parseInt(hours), parseInt(mins), 0, 0);

      // Nếu đã trễ quá 60 phút mà khách chưa tới (chưa CheckIn)
      const diffMinutes = (now - bookingDateTime) / (1000 * 60);

      if (diffMinutes >= 60) {
        await prisma.$transaction(async (tx) => {
          await tx.bookingGroups.update({
            where: { BookingGroupID: booking.BookingGroupID },
            data: { Status: "Cancelled" }, // Có thể đổi thành NoShow nếu muốn phân biệt
          });

          for (const item of booking.BookingItems) {
            await tx.bookingItems.update({
              where: { BookingItemID: item.BookingItemID },
              data: { Status: "Cancelled" },
            });
          }
        });
        cancelledCount++;
      }
    }

    if (cancelledCount > 0) {
      console.log(`[Cronjob] Đã tự động hủy ${cancelledCount} đơn đặt lịch quá hạn (No Show).`);
    }
  } catch (error) {
    console.error("[Cronjob] Lỗi khi chạy autoCancelNoShowBookings:", error);
  }
};

const autoExpirePromotions = async () => {
  try {
    const now = new Date();

    const result = await prisma.promotions.updateMany({
      where: {
        Status: "Active",
        EndDate: { lt: now },
      },
      data: {
        Status: "Inactive",
      },
    });

    if (result.count > 0) {
      console.log(`[Cronjob] Đã tự động khóa ${result.count} mã khuyến mãi hết hạn.`);
    }
  } catch (error) {
    console.error("[Cronjob] Lỗi khi chạy autoExpirePromotions:", error);
  }
};

export default {
  autoCancelNoShowBookings,
  autoExpirePromotions,
};
