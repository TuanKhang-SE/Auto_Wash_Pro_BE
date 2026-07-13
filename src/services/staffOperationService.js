import prisma from "../config/prisma.js";

const getTodayBookings = async (branchId, customerName, status, bookingDate) => {
  const today = bookingDate
    ? new Date(`${bookingDate}T00:00:00`)
    : new Date();

  if (Number.isNaN(today.getTime())) {
    throw new Error("Ngày xem booking không hợp lệ");
  }

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
          Vehicles: { select: { LicensePlate: true, Brand: true, Model: true } },
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
  } else if (status === "Completed") {
    updateData.CompletedAt = new Date();
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
  if (item.Status !== "CheckedIn")
    throw new Error("Chỉ có thể thêm dịch vụ khi xe đang ở bước Check-in");

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

      const price = bs.PriceOverride ?? bs.Services.BasePrice;
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

const updateServicesToItem = async (bookingItemId, branchId, serviceIds) => {
  const item = await prisma.bookingItems.findUnique({
    where: { BookingItemID: bookingItemId },
    include: { BookingGroups: true, ServiceLineItems: true },
  });

  if (!item) throw new Error("Không tìm thấy xe này trong đơn đặt lịch");
  if (item.BookingGroups.BranchID !== branchId)
    throw new Error("Xe này không thuộc chi nhánh của bạn");
  if (item.Status !== "CheckedIn")
    throw new Error("Chỉ có thể sửa hoặc xóa dịch vụ khi xe đang ở bước Check-in");

  if (serviceIds.length < 1) {
    throw new Error("Mỗi xe phải có ít nhất một dịch vụ");
  }

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
  const servicesToRemove = existingServiceIds.filter(id => !serviceIds.includes(id));
  const servicesToAdd = serviceIds.filter(id => !existingServiceIds.includes(id));

  await prisma.$transaction(async (tx) => {
    if (servicesToRemove.length > 0) {
      await tx.serviceLineItems.deleteMany({
        where: {
          BookingItemID: bookingItemId,
          ServiceID: { in: servicesToRemove }
        }
      });
    }

    for (const bs of branchServices) {
      if (servicesToAdd.includes(bs.ServiceID)) {
        const price = bs.PriceOverride ?? bs.Services.BasePrice;
        await tx.serviceLineItems.create({
          data: {
            BookingItemID: bookingItemId,
            ServiceID: bs.ServiceID,
            Quantity: 1,
            UnitPrice: price,
            LineTotal: price,
            Note: "Sửa/Đổi tại quán",
          },
        });
      }
    }
  });

  return { message: "Cập nhật dịch vụ thành công" };
};

const createWalkInBooking = async (branchId, phone, items) => {
  return await prisma.$transaction(async (tx) => {
    let customerId = null;


    if (phone) {
      const user = await tx.users.findUnique({
        where: { Phone: phone }
      });
      if (user) {
        const customer = await tx.customers.findFirst({
          where: { UserID: user.UserID }
        });
        if (customer) {
          customerId = customer.CustomerID;
        }
      }
    }


    if (!customerId) {
      for (const item of items) {
        const vehicle = await tx.vehicles.findFirst({
          where: { LicensePlate: item.LicensePlate, Status: "Active" }
        });
        if (vehicle) {
          customerId = vehicle.CustomerID;
          break;
        }
      }
    }


    if (!customerId) {
      const newCustomer = await tx.customers.create({
        data: {
          UserID: null,
          TotalVisits: 0,
          TotalSpent: 0,
        }
      });
      customerId = newCustomer.CustomerID;
    }


    const newBooking = await tx.bookingGroups.create({
      data: {
        CustomerID: customerId,
        BranchID: branchId,
        BookingDate: new Date(),
        StartTime: new Date(),
        Status: "Pending",
        Notes: "Khách vãng lai (Walk-in)"
      }
    });

    for (const item of items) {

      let vehicle = await tx.vehicles.findFirst({
        where: { LicensePlate: item.LicensePlate, Status: "Active" }
      });

      if (!vehicle) {
        vehicle = await tx.vehicles.create({
          data: {
            CustomerID: customerId,
            LicensePlate: item.LicensePlate,
            VehicleType: item.VehicleType || "Sedan",
            Brand: item.Brand || "Khác",
            Model: item.Model || "Khác",
            Status: "Active"
          }
        });
      }


      const bookingItem = await tx.bookingItems.create({
        data: {
          BookingGroupID: newBooking.BookingGroupID,
          VehicleID: vehicle.VehicleID,
          Status: "Pending"
        }
      });


      const branchServices = await tx.branchServices.findMany({
        where: {
          BranchID: branchId,
          ServiceID: { in: item.Services },
          Status: "Active"
        },
        include: { Services: true }
      });

      if (branchServices.length !== item.Services.length) {
        throw new Error(`Một số dịch vụ cho xe ${item.LicensePlate} không hợp lệ tại chi nhánh này`);
      }

      for (const bs of branchServices) {
        const price = bs.PriceOverride ?? bs.Services.BasePrice;
        await tx.serviceLineItems.create({
          data: {
            BookingItemID: bookingItem.BookingItemID,
            ServiceID: bs.ServiceID,
            Quantity: 1,
            UnitPrice: price,
            LineTotal: price
          }
        });
      }
    }

    return newBooking;
  });
};

export default {
  getTodayBookings,
  updateBookingItemStatus,
  addServicesToItem,
  updateServicesToItem,
  createWalkInBooking,
};
