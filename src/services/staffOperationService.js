import prisma from "../config/prisma.js";

const VIETNAM_TIME_ZONE = "Asia/Ho_Chi_Minh";

const getVietnamNowParts = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: VIETNAM_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );

  return {
    date: `${values.year}-${values.month}-${values.day}`,
    minutes: Number(values.hour) * 60 + Number(values.minute),
  };
};

const getTimeMinutes = (value) => {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.getUTCHours() * 60 + date.getUTCMinutes();
};

const isMinuteInsideShift = (current, start, end) => {
  if (start === null || end === null) return false;

  if (start <= end) {
    return current >= start && current <= end;
  }

  // Hỗ trợ ca qua đêm, ví dụ 22:00 - 06:00.
  return current >= start || current <= end;
};

const assertStaffCanOperateNow = async (staffId, role = "Staff") => {
  // Manager/Admin có thể xử lý ngoại lệ và không bị giới hạn theo ca.
  if (role !== "Staff") return;

  const numericStaffId = Number(staffId);
  if (!Number.isInteger(numericStaffId) || numericStaffId <= 0) {
    throw new Error("Nhân viên không hợp lệ");
  }

  const { date, minutes } = getVietnamNowParts();
  const dayStart = new Date(`${date}T00:00:00.000Z`);
  const dayEnd = new Date(dayStart);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

  const schedules = await prisma.staffSchedules.findMany({
    where: {
      UserID: numericStaffId,
      Status: "Active",
      WorkDate: {
        gte: dayStart,
        lt: dayEnd,
      },
    },
    include: {
      Shifts: true,
    },
  });

  const activeSchedule = schedules.find((schedule) =>
    isMinuteInsideShift(
      minutes,
      getTimeMinutes(schedule.Shifts?.StartTime),
      getTimeMinutes(schedule.Shifts?.EndTime)
    )
  );

  if (!activeSchedule) {
    throw new Error(
      schedules.length === 0
        ? "Bạn chưa được xếp ca làm hôm nay"
        : "Bạn chỉ được thao tác trong đúng khung giờ ca làm được phân công"
    );
  }
};

const assertBookingIsToday = (
  bookingDate,
  role = "Staff",
  now = new Date()
) => {
  // Manager/Admin có thể xử lý ngoại lệ ở các ngày khác.
  if (role !== "Staff") return;

  if (!bookingDate) {
    throw new Error("Không xác định được ngày của booking");
  }

  const booking = new Date(bookingDate);
  if (Number.isNaN(booking.getTime())) {
    throw new Error("Ngày booking không hợp lệ");
  }

  const bookingParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: VIETNAM_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(booking);

  const values = Object.fromEntries(
    bookingParts.map((part) => [part.type, part.value])
  );
  const bookingDay = `${values.year}-${values.month}-${values.day}`;
  const { date: today } = getVietnamNowParts(now);

  if (bookingDay !== today) {
    throw new Error("Staff chỉ được thao tác booking trong ngày hiện tại");
  }
};

const getTodayBookings = async (
  branchId,
  customerName,
  status,
  bookingDate
) => {
  const numericBranchId = Number(branchId);

  if (
    !Number.isInteger(numericBranchId) ||
    numericBranchId <= 0
  ) {
    throw new Error("Chi nhánh không hợp lệ");
  }

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
    BranchID: numericBranchId,

    BookingDate: {
      gte: today,
      lt: tomorrow,
    },

    /*
     * Không trả về những booking đã thanh toán thành công.
     *
     * Booking, Transaction và Invoice vẫn được giữ nguyên
     * trong database để trang lịch sử tiếp tục sử dụng.
     */
    Transactions: {
      none: {
        Status: "Paid",
      },
    },
  };

  if (status) {
    whereClause.Status = status;
  }

  if (customerName) {
    whereClause.Customers = {
      Users: {
        FullName: {
          contains: customerName,
        },
      },
    };
  }

  const bookings =
    await prisma.bookingGroups.findMany({
      where: whereClause,

      include: {
        Customers: {
          include: {
            Users: {
              select: {
                FullName: true,
                Phone: true,
              },
            },
          },
        },

        BookingItems: {
          include: {
            Vehicles: {
              select: {
                LicensePlate: true,
                Brand: true,
                Model: true,
              },
            },

            ServiceLineItems: {
              include: {
                Services: {
                  select: {
                    ServiceName: true,
                  },
                },
              },
            },
          },
        },

        /*
         * Trả thêm thông tin giao dịch để Frontend
         * vẫn có dữ liệu phục vụ luồng thanh toán.
         */
        Transactions: {
          orderBy: {
            TransactionID: "desc",
          },
        },
      },

      orderBy: {
        StartTime: "asc",
      },
    });

  return bookings;
};

const updateBookingItemStatus = async (
  bookingItemId,
  status,
  staffId,
  role = "Staff"
) => {
  await assertStaffCanOperateNow(staffId, role);

  const item = await prisma.bookingItems.findUnique({
    where: {
      BookingItemID: bookingItemId,
    },

    include: {
      BookingGroups: true,
    },
  });

  if (!item) {
    throw new Error(
      "Không tìm thấy xe trong đơn đặt lịch"
    );
  }

  assertBookingIsToday(item.BookingGroups?.BookingDate, role);

  const nextStatusMap = {
    Pending: "CheckedIn",
    CheckedIn: "InProgress",
    InProgress: "Completed",
  };

  if (item.Status === status) {
    return {
      message: `Xe đã ở trạng thái ${status}`,
    };
  }

  const expectedStatus = nextStatusMap[item.Status];

  if (expectedStatus !== status) {
    throw new Error(
      `Không thể chuyển trạng thái từ ${item.Status} sang ${status}`
    );
  }

  const updateData = {
    Status: status,
  };

  const currentTime = new Date();

  if (status === "CheckedIn") {
    updateData.CheckInAt = currentTime;
  }

  if (status === "InProgress") {
    updateData.WashStartAt = currentTime;
  }

  if (status === "Completed") {
    updateData.CompletedAt = currentTime;
    updateData.ReadyForPaymentAt = currentTime;
  }

  const result = await prisma.$transaction(
    async (tx) => {
      const updatedItem =
        await tx.bookingItems.update({
          where: {
            BookingItemID: bookingItemId,
          },

          data: updateData,
        });

      const allItems =
        await tx.bookingItems.findMany({
          where: {
            BookingGroupID: item.BookingGroupID,
          },
        });

      const activeItems = allItems.filter(
        (bookingItem) =>
          bookingItem.Status !== "Cancelled"
      );

      let groupStatus = "Pending";

      if (activeItems.length === 0) {
        groupStatus = "Cancelled";
      } else {
        const isAllCompleted = activeItems.every(
          (bookingItem) =>
            bookingItem.Status === "Completed"
        );

        const hasInProgress = activeItems.some(
          (bookingItem) =>
            bookingItem.Status === "InProgress" ||
            bookingItem.Status === "Completed"
        );

        const hasCheckedIn = activeItems.some(
          (bookingItem) =>
            bookingItem.Status === "CheckedIn"
        );

        if (isAllCompleted) {
          groupStatus = "Completed";
        } else if (hasInProgress) {
          groupStatus = "InProgress";
        } else if (hasCheckedIn) {
          groupStatus = "CheckedIn";
        } else {
          groupStatus = "Pending";
        }
      }

      await tx.bookingGroups.update({
        where: {
          BookingGroupID: item.BookingGroupID,
        },

        data: {
          Status: groupStatus,
        },
      });

      return {
        updatedItem,
        groupStatus,
      };
    }
  );

  return {
    message: `Cập nhật trạng thái xe thành ${status} thành công`,
    data: result,
  };
};

const addServicesToItem = async (
  bookingItemId,
  branchId,
  serviceIds,
  staffId,
  role = "Staff"
) => {
  await assertStaffCanOperateNow(staffId, role);

  const item = await prisma.bookingItems.findUnique({
    where: {
      BookingItemID: bookingItemId,
    },

    include: {
      BookingGroups: true,
      ServiceLineItems: true,
    },
  });

  if (!item) {
    throw new Error(
      "Không tìm thấy xe này trong đơn đặt lịch"
    );
  }

  assertBookingIsToday(item.BookingGroups?.BookingDate, role);

  if (item.BookingGroups.BranchID !== branchId) {
    throw new Error(
      "Xe này không thuộc chi nhánh của bạn"
    );
  }

  if (item.Status !== "CheckedIn") {
    throw new Error(
      "Chỉ có thể thêm dịch vụ khi xe đang ở bước Check-in"
    );
  }

  const branchServices =
    await prisma.branchServices.findMany({
      where: {
        BranchID: branchId,

        ServiceID: {
          in: serviceIds,
        },

        Status: "Active",
      },

      include: {
        Services: true,
      },
    });

  if (
    branchServices.length !== serviceIds.length
  ) {
    throw new Error(
      "Một số dịch vụ không hợp lệ hoặc không hỗ trợ tại chi nhánh này"
    );
  }

  const existingServiceIds =
    item.ServiceLineItems.map(
      (serviceLineItem) =>
        serviceLineItem.ServiceID
    );

  await prisma.$transaction(async (tx) => {
    for (const branchService of branchServices) {
      if (
        existingServiceIds.includes(
          branchService.ServiceID
        )
      ) {
        continue;
      }

      const price =
        branchService.PriceOverride ??
        branchService.Services.BasePrice;

      await tx.serviceLineItems.create({
        data: {
          BookingItemID: bookingItemId,
          ServiceID: branchService.ServiceID,
          Quantity: 1,
          UnitPrice: price,
          LineTotal: price,
          Note: "Phát sinh tại quán",
        },
      });
    }
  });

  return {
    message: "Thêm dịch vụ phát sinh thành công",
  };
};

const updateServicesToItem = async (
  bookingItemId,
  branchId,
  serviceIds,
  staffId,
  role = "Staff"
) => {
  await assertStaffCanOperateNow(staffId, role);

  const item = await prisma.bookingItems.findUnique({
    where: {
      BookingItemID: bookingItemId,
    },

    include: {
      BookingGroups: true,
      ServiceLineItems: true,
    },
  });

  if (!item) {
    throw new Error(
      "Không tìm thấy xe này trong đơn đặt lịch"
    );
  }

  assertBookingIsToday(item.BookingGroups?.BookingDate, role);

  if (item.BookingGroups.BranchID !== branchId) {
    throw new Error(
      "Xe này không thuộc chi nhánh của bạn"
    );
  }

  if (item.Status !== "CheckedIn") {
    throw new Error(
      "Chỉ có thể sửa hoặc xóa dịch vụ khi xe đang ở bước Check-in"
    );
  }

  if (serviceIds.length < 1) {
    throw new Error(
      "Mỗi xe phải có ít nhất một dịch vụ"
    );
  }

  const branchServices =
    await prisma.branchServices.findMany({
      where: {
        BranchID: branchId,

        ServiceID: {
          in: serviceIds,
        },

        Status: "Active",
      },

      include: {
        Services: true,
      },
    });

  if (
    branchServices.length !== serviceIds.length
  ) {
    throw new Error(
      "Một số dịch vụ không hợp lệ hoặc không hỗ trợ tại chi nhánh này"
    );
  }

  const existingServiceIds =
    item.ServiceLineItems.map(
      (serviceLineItem) =>
        serviceLineItem.ServiceID
    );

  const servicesToRemove =
    existingServiceIds.filter(
      (serviceId) =>
        !serviceIds.includes(serviceId)
    );

  const servicesToAdd = serviceIds.filter(
    (serviceId) =>
      !existingServiceIds.includes(serviceId)
  );

  await prisma.$transaction(async (tx) => {
    if (servicesToRemove.length > 0) {
      await tx.serviceLineItems.deleteMany({
        where: {
          BookingItemID: bookingItemId,

          ServiceID: {
            in: servicesToRemove,
          },
        },
      });
    }

    for (const branchService of branchServices) {
      if (
        !servicesToAdd.includes(
          branchService.ServiceID
        )
      ) {
        continue;
      }

      const price =
        branchService.PriceOverride ??
        branchService.Services.BasePrice;

      await tx.serviceLineItems.create({
        data: {
          BookingItemID: bookingItemId,
          ServiceID: branchService.ServiceID,
          Quantity: 1,
          UnitPrice: price,
          LineTotal: price,
          Note: "Sửa/Đổi tại quán",
        },
      });
    }
  });

  return {
    message: "Cập nhật dịch vụ thành công",
  };
};

const createWalkInBooking = async (
  branchId,
  phone,
  items
) => {
  return await prisma.$transaction(
    async (tx) => {
      let customerId = null;

      if (phone) {
        const user = await tx.users.findUnique({
          where: {
            Phone: phone,
          },
        });

        if (user) {
          const customer =
            await tx.customers.findFirst({
              where: {
                UserID: user.UserID,
              },
            });

          if (customer) {
            customerId = customer.CustomerID;
          }
        }
      }

      if (!customerId) {
        for (const item of items) {
          const vehicle =
            await tx.vehicles.findFirst({
              where: {
                LicensePlate: item.LicensePlate,
                Status: "Active",
              },
            });

          if (vehicle) {
            customerId = vehicle.CustomerID;
            break;
          }
        }
      }

      if (!customerId) {
        const newCustomer =
          await tx.customers.create({
            data: {
              UserID: null,
              TotalVisits: 0,
              TotalSpent: 0,
            },
          });

        customerId = newCustomer.CustomerID;
      }

      const newBooking =
        await tx.bookingGroups.create({
          data: {
            CustomerID: customerId,
            BranchID: branchId,
            BookingDate: new Date(),
            StartTime: new Date(),
            Status: "Pending",
            Notes: "Khách vãng lai (Walk-in)",
          },
        });

      for (const item of items) {
        let vehicle =
          await tx.vehicles.findFirst({
            where: {
              LicensePlate: item.LicensePlate,
              Status: "Active",
            },
          });

        if (!vehicle) {
          vehicle = await tx.vehicles.create({
            data: {
              CustomerID: customerId,
              LicensePlate: item.LicensePlate,

              VehicleType:
                item.VehicleType || "Sedan",

              Brand: item.Brand || "Khác",
              Model: item.Model || "Khác",
              Status: "Active",
            },
          });
        }

        const bookingItem =
          await tx.bookingItems.create({
            data: {
              BookingGroupID:
                newBooking.BookingGroupID,

              VehicleID: vehicle.VehicleID,
              Status: "Pending",
            },
          });

        const branchServices =
          await tx.branchServices.findMany({
            where: {
              BranchID: branchId,

              ServiceID: {
                in: item.Services,
              },

              Status: "Active",
            },

            include: {
              Services: true,
            },
          });

        if (
          branchServices.length !==
          item.Services.length
        ) {
          throw new Error(
            `Một số dịch vụ cho xe ${item.LicensePlate} không hợp lệ tại chi nhánh này`
          );
        }

        for (
          const branchService of branchServices
        ) {
          const price =
            branchService.PriceOverride ??
            branchService.Services.BasePrice;

          await tx.serviceLineItems.create({
            data: {
              BookingItemID:
                bookingItem.BookingItemID,

              ServiceID:
                branchService.ServiceID,

              Quantity: 1,
              UnitPrice: price,
              LineTotal: price,
            },
          });
        }
      }

      return newBooking;
    }
  );
};

export default {
  getTodayBookings,
  updateBookingItemStatus,
  addServicesToItem,
  updateServicesToItem,
  createWalkInBooking,
};

export {
  assertBookingIsToday,
  getVietnamNowParts,
  isMinuteInsideShift,
};
