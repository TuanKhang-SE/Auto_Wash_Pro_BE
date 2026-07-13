import prisma from "../config/prisma.js";

const timeStrToDate = (timeStr) => {
  const [hours, minutes] = timeStr.split(":");
  const date = new Date(Date.UTC(1970, 0, 1, parseInt(hours), parseInt(minutes)));

  return date;
};

const dateToTimeStr = (date) => {
  return date.toISOString().substring(11, 16);
};

const getAvailableSlots = async (branchId, bookingDateStr) => {
  const bookingDate = new Date(bookingDateStr);

  const config = await prisma.branch_configs.findFirst({
    where: { BranchID: branchId },
  });
  if (!config) throw new Error("Chi nhánh chưa được thiết lập cấu hình");

  const slotDuration = config.SlotDuration || 30;
  const totalBays = config.TotalWashBays || 8;
  const buffer = config.BufferMinutes || 5;

  const schedules = await prisma.staffSchedules.findMany({
    where: {
      WorkDate: bookingDate,
      Status: "Active",
      Users: { BranchID: branchId, Status: "Active" },
      Shifts: { Status: "Active" },
    },
    include: { Shifts: true },
  });

  const staffPerShift = {};
  schedules.forEach((schedule) => {
    const shiftId = schedule.ShiftID;
    if (!staffPerShift[shiftId]) {
      staffPerShift[shiftId] = { shift: schedule.Shifts, count: 0 };
    }
    staffPerShift[shiftId].count += 1;
  });

  const bookings = await prisma.bookingGroups.findMany({
    where: {
      BranchID: branchId,
      BookingDate: bookingDate,
      Status: { in: ["Pending", "Confirmed", "CheckedIn", "InProgress"] },
    },
    include: { BookingItems: { where: { Status: { not: "Cancelled" } } } },
  });

  const bookedPerTime = {};
  bookings.forEach((group) => {
    const timeStr = dateToTimeStr(group.StartTime);
    if (!bookedPerTime[timeStr]) bookedPerTime[timeStr] = 0;
    bookedPerTime[timeStr] += group.BookingItems.length;
  });

  const availableSlots = [];

  for (const shiftId in staffPerShift) {
    const { shift, count } = staffPerShift[shiftId];

    const capacity = totalBays;

    let current = new Date(shift.StartTime);
    const end = new Date(shift.EndTime);

    while (current < end) {
      const startStr = dateToTimeStr(current);

      const slotEnd = new Date(current.getTime() + slotDuration * 60000);
      if (slotEnd > end) break;

      const slotDateTime = new Date(bookingDate);
      const [hours, mins] = startStr.split(":");
      slotDateTime.setHours(parseInt(hours), parseInt(mins), 0, 0);

      if (slotDateTime < new Date()) {
        current = new Date(current.getTime() + (slotDuration + buffer) * 60000);
        continue;
      }

      const booked = bookedPerTime[startStr] || 0;
      const available = Math.max(0, capacity - booked);

      availableSlots.push({
        StartTime: startStr,
        EndTime: dateToTimeStr(slotEnd),
        ShiftName: shift.ShiftName,
        StaffCount: count,
        MaxCapacity: capacity,
        Booked: booked,
        Available: available,
        Status: available > 0 ? "Available" : "Full",
      });

      current = new Date(current.getTime() + (slotDuration + buffer) * 60000);
    }
  }

  availableSlots.sort((a, b) => a.StartTime.localeCompare(b.StartTime));

  return {
    BranchID: branchId,
    BookingDate: bookingDateStr,
    TotalWashBays: totalBays,
    SlotDuration: slotDuration,
    BufferMinutes: buffer,
    Slots: availableSlots,
  };
};

const createBooking = async (customerId, data) => {
  const { BranchID, BookingDate, StartTime, Items } = data;

  const availableData = await getAvailableSlots(BranchID, BookingDate);
  const targetSlot = availableData.Slots.find((s) => s.StartTime === StartTime);

  if (!targetSlot) throw new Error("Khung giờ không tồn tại trong ca làm việc");
  if (targetSlot.Available < Items.length)
    throw new Error(`Khung giờ này chỉ còn ${targetSlot.Available} chỗ trống`);

  const vehicleIds = Items.map((i) => i.VehicleID);
  const vehicles = await prisma.vehicles.findMany({
    where: {
      VehicleID: { in: vehicleIds },
      CustomerID: customerId,
      Status: "Active",
    },
  });
  if (vehicles.length !== vehicleIds.length) {
    throw new Error("Một số xe không tồn tại hoặc không thuộc sở hữu của bạn");
  }

  const allServiceIds = Items.flatMap((i) =>
    i.Services.map((s) => s.ServiceID),
  );
  const branchServices = await prisma.branchServices.findMany({
    where: {
      BranchID: BranchID,
      ServiceID: { in: allServiceIds },
      Status: "Active",
    },
    include: { Services: true },
  });

  const validServiceMap = new Map();
  branchServices.forEach((bs) => validServiceMap.set(bs.ServiceID, bs));

  for (const item of Items) {
    for (const s of item.Services) {
      if (!validServiceMap.has(s.ServiceID)) {
        throw new Error(
          `Dịch vụ ID ${s.ServiceID} không được hỗ trợ tại chi nhánh này`,
        );
      }
    }
  }

  const randomSuffix = Math.floor(10000 + Math.random() * 90000);
  const bookingCode = `BK-${BookingDate.replace(/-/g, "")}-${randomSuffix}`;

  const result = await prisma.$transaction(async (tx) => {
    const group = await tx.bookingGroups.create({
      data: {
        CustomerID: customerId,
        BranchID: BranchID,
        BookingCode: bookingCode,
        BookingDate: new Date(BookingDate),
        StartTime: timeStrToDate(StartTime),
        Status: "Pending",
      },
    });

    for (const item of Items) {
      const bookingItem = await tx.bookingItems.create({
        data: {
          BookingGroupID: group.BookingGroupID,
          VehicleID: item.VehicleID,
          Status: "Pending",
        },
      });

      for (const s of item.Services) {
        const bs = validServiceMap.get(s.ServiceID);

        const price = bs.PriceOverride || bs.Services.BasePrice;

        await tx.serviceLineItems.create({
          data: {
            BookingItemID: bookingItem.BookingItemID,
            ServiceID: s.ServiceID,
            Quantity: 1,
            UnitPrice: price,
            LineTotal: price,
          },
        });
      }
    }

    return group;
  });

  return result;
};

const cancelBooking = async (bookingId, customerId) => {
  const booking = await prisma.bookingGroups.findUnique({
    where: { BookingGroupID: bookingId },
    include: { BookingItems: true },
  });

  if (!booking) throw new Error("Không tìm thấy đơn đặt lịch");
  if (booking.CustomerID !== customerId)
    throw new Error("Bạn không có quyền hủy đơn này");
  if (booking.Status !== "Pending" && booking.Status !== "Confirmed") {
    throw new Error(
      "Chỉ có thể hủy đơn đang ở trạng thái Pending hoặc Confirmed",
    );
  }

  const config = await prisma.branch_configs.findFirst({
    where: { BranchID: booking.BranchID },
  });
  if (config && config.CancelWindowHours) {
    const bookingDateTime = new Date(booking.BookingDate);
    const [hours, mins] = booking.StartTime.toISOString()
      .substring(11, 16)
      .split(":");
    bookingDateTime.setHours(parseInt(hours), parseInt(mins), 0, 0);

    const hoursUntilBooking = (bookingDateTime - new Date()) / (1000 * 60 * 60);
    if (hoursUntilBooking < config.CancelWindowHours) {
      throw new Error(
        `Bạn chỉ có thể hủy trước ${config.CancelWindowHours} giờ`,
      );
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.bookingGroups.update({
      where: { BookingGroupID: bookingId },
      data: { Status: "Cancelled" },
    });

    for (const item of booking.BookingItems) {
      await tx.bookingItems.update({
        where: { BookingItemID: item.BookingItemID },
        data: { Status: "Cancelled" },
      });
    }
  });

  return { message: "Hủy lịch thành công" };
};

export default {
  getAvailableSlots,
  createBooking,
  cancelBooking,
};
