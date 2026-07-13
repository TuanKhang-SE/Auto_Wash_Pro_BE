import cron from "node-cron";
import cronService from "./cronService.js";

export const startCronJobs = () => {
  // Chạy mỗi 15 phút (để quét và hủy đơn đặt lịch quá hạn)
  cron.schedule("*/15 * * * *", () => {
    cronService.autoCancelNoShowBookings();
  });

  // Chạy vào 00:00 (nửa đêm) mỗi ngày (để đóng khuyến mãi hết hạn)
  cron.schedule("0 0 * * *", () => {
    cronService.autoExpirePromotions();
  });

  console.log(" Hệ thống Cronjobs đã khởi động thành công.");
};
