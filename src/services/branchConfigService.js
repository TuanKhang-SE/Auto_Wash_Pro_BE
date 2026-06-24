import prisma from "../config/prisma.js";

const getByBranchId = async (branchId) => {
  return await prisma.branch_configs.findFirst({
    where: { BranchID: branchId },
  });
};

const upsert = async (branchId, data) => {
  const validData = {};
  if (data.SlotDuration !== undefined)
    validData.SlotDuration = data.SlotDuration;
  if (data.TotalWashBays !== undefined)
    validData.TotalWashBays = data.TotalWashBays;
  if (data.BufferMinutes !== undefined)
    validData.BufferMinutes = data.BufferMinutes;
  if (data.MaxCarsPerBooking !== undefined)
    validData.MaxCarsPerBooking = data.MaxCarsPerBooking;
  if (data.CancelWindowHours !== undefined)
    validData.CancelWindowHours = data.CancelWindowHours;

  const existing = await prisma.branch_configs.findFirst({
    where: { BranchID: branchId },
  });

  if (existing) {
    if (
      (validData.SlotDuration !== undefined &&
        validData.SlotDuration !== existing.SlotDuration) ||
      (validData.BufferMinutes !== undefined &&
        validData.BufferMinutes !== existing.BufferMinutes)
    ) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const futureBookings = await prisma.bookingGroups.findFirst({
        where: {
          BranchID: branchId,
          BookingDate: { gte: today },
          Status: { in: ["Pending", "Confirmed", "CheckedIn"] },
        },
      });

      if (futureBookings) {
        throw new Error(
          "Không thể đổi SlotDuration hoặc BufferMinutes vì chi nhánh đang có lịch đặt trong tương lai.",
        );
      }
    }

    return await prisma.branch_configs.update({
      where: { ConfigID: existing.ConfigID },
      data: validData,
    });
  } else {
    return await prisma.branch_configs.create({
      data: {
        BranchID: branchId,
        ...validData,
      },
    });
  }
};

export default {
  getByBranchId,
  upsert,
};
