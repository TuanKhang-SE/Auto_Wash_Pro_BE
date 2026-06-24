import prisma from "../config/prisma.js";

const getTodayBookings = async (branchId, customerName, status) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const whereClause = {
    BranchID: branchId,
    BookingDate: {
      gte: today,
      lt: tomorrow,
    },
  };

  if (status) {
    whereClause.Status = status;
  }

  if (customerName) {
    whereClause.Customers = {
      Users: {
        FullName: { contains: customerName },
      },
    };
  }

  const bookings = await prisma.bookingGroups.findMany({
    where: whereClause,
    include: {
      Customers: {
        include: {
          Users: { select: { FullName: true, Phone: true } },
        },
      },
      BookingItems: {
        include: {
          Vehicles: { select: { LicensePlate: true, Make: true, Model: true } },
          Users: { select: { FullName: true } }, // The ProcessedBy user
          ServiceLineItems: {
            include: { Services: { select: { ServiceName: true } } },
          },
        },
      },
    },
    orderBy: { StartTime: "asc" },
  });

  return bookings;
};

const updateBookingItemStatus = async (bookingItemId, status, staffId) => {
  const item = await prisma.bookingItems.findUnique({
    where: { BookingItemID: bookingItemId },
    include: { BookingGroups: true },
  });

  if (!item) throw new Error("Không tìm thấy Booking Item");

  const updateData = { Status: status };

  if (status === "CheckedIn") {
    updateData.CheckInAt = new Date();
  } else if (status === "InProgress") {
    updateData.WashStartAt = new Date();
    updateData.ProcessedBy = staffId;
  } else if (status === "Completed") {
    updateData.CompletedAt = new Date();
    if (!item.ProcessedBy) updateData.ProcessedBy = staffId;
  }

  await prisma.$transaction(async (tx) => {
    const updatedItem = await tx.bookingItems.update({
      where: { BookingItemID: bookingItemId },
      data: updateData,
    });

    const allItems = await tx.bookingItems.findMany({
      where: { BookingGroupID: item.BookingGroupID },
    });

    const isAllCompleted = allItems.every((i) => i.Status === "Completed");
    const isAnyInProgress = allItems.some(
      (i) => i.Status === "InProgress" || i.Status === "CheckedIn",
    );

    let groupStatus = item.BookingGroups.Status;

    if (isAllCompleted) {
      groupStatus = "Completed";
    } else if (isAnyInProgress && groupStatus === "Pending") {
      groupStatus = "InProgress";
    }

    if (groupStatus !== item.BookingGroups.Status) {
      await tx.bookingGroups.update({
        where: { BookingGroupID: item.BookingGroupID },
        data: { Status: groupStatus },
      });
    }
  });

  return { message: `Cập nhật trạng thái xe thành ${status} thành công` };
};

const addServicesToItem = async (bookingItemId, branchId, serviceIds) => {
  const item = await prisma.bookingItems.findUnique({
    where: { BookingItemID: bookingItemId },
    include: { BookingGroups: true, ServiceLineItems: true },
  });

  if (!item) throw new Error("Không tìm thấy xe này trong đơn đặt lịch");
  if (item.BookingGroups.BranchID !== branchId)
    throw new Error("Xe này không thuộc chi nhánh của bạn");
  if (item.Status === "Completed")
    throw new Error("Xe đã rửa xong, không thể thêm dịch vụ");

  const branchServices = await prisma.branchServices.findMany({
    where: {
      BranchID: branchId,
      ServiceID: { in: serviceIds },
      Status: "Active",
    },
    include: { Services: true },
  });

  if (branchServices.length !== serviceIds.length) {
    throw new Error(
      "Một số dịch vụ không hợp lệ hoặc không hỗ trợ tại chi nhánh này",
    );
  }

  const existingServiceIds = item.ServiceLineItems.map((s) => s.ServiceID);

  await prisma.$transaction(async (tx) => {
    for (const bs of branchServices) {
      if (existingServiceIds.includes(bs.ServiceID)) continue;

      const price = bs.CustomPrice || bs.Services.BasePrice;
      await tx.serviceLineItems.create({
        data: {
          BookingItemID: bookingItemId,
          ServiceID: bs.ServiceID,
          Quantity: 1,
          UnitPrice: price,
          LineTotal: price,
          Note: "Phát sinh tại quán",
        },
      });
    }
  });

  return { message: "Thêm dịch vụ phát sinh thành công" };
};

export default {
  getTodayBookings,
  updateBookingItemStatus,
  addServicesToItem,
};
