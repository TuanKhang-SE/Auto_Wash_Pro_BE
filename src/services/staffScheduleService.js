import prisma from "../config/prisma.js";

const getAll = async (filters) => {
  return await prisma.staffSchedules.findMany({
    where: filters,
    include: {
      Users: {
        select: {
          FullName: true,
          Phone: true,
          BranchID: true,
        },
      },
      Shifts: {
        select: {
          ShiftName: true,
          StartTime: true,
          EndTime: true,
        },
      },
    },
    orderBy: {
      WorkDate: "desc",
    },
  });
};

const getById = async (id) => {
  return await prisma.staffSchedules.findUnique({
    where: { ScheduleID: id },
    include: {
      Users: {
        select: {
          FullName: true,
          Phone: true,
          BranchID: true,
        },
      },
      Shifts: {
        select: {
          ShiftName: true,
          StartTime: true,
          EndTime: true,
        },
      },
    },
  });
};

const create = async (data) => {
  const user = await prisma.users.findUnique({
    where: { UserID: data.UserID },
  });
  if (!user || user.Status !== "Active" || user.Role !== "Staff") {
    throw new Error("Nhân viên không hợp lệ hoặc không phải là Staff");
  }

  const shift = await prisma.shifts.findUnique({
    where: { ShiftID: data.ShiftID },
  });
  if (!shift || shift.Status !== "Active") {
    throw new Error("Ca làm việc không hợp lệ hoặc đã bị vô hiệu hóa");
  }

  const duplicate = await prisma.staffSchedules.findFirst({
    where: {
      UserID: data.UserID,
      WorkDate: new Date(data.WorkDate),
      ShiftID: data.ShiftID,
      Status: "Active",
    },
  });
  if (duplicate) {
    throw new Error("Nhân viên đã được xếp ca này vào ngày này rồi");
  }

  return await prisma.staffSchedules.create({
    data: {
      ...data,
      WorkDate: new Date(data.WorkDate),
      CapacityWeight: data.CapacityWeight || 1.0,
    },
    include: {
      Users: { select: { FullName: true, Phone: true, BranchID: true } },
      Shifts: { select: { ShiftName: true, StartTime: true, EndTime: true } },
    },
  });
};

const update = async (id, data) => {
  const existing = await prisma.staffSchedules.findUnique({
    where: { ScheduleID: id },
  });

  if (!existing) {
    throw new Error("Không tìm thấy lịch làm việc");
  }

  let workDate = data.WorkDate ? new Date(data.WorkDate) : existing.WorkDate;
  let shiftId = data.ShiftID || existing.ShiftID;

  if (data.WorkDate || data.ShiftID) {
    const duplicate = await prisma.staffSchedules.findFirst({
      where: {
        UserID: existing.UserID,
        WorkDate: workDate,
        ShiftID: shiftId,
        Status: "Active",
        NOT: { ScheduleID: id },
      },
    });
    if (duplicate) {
      throw new Error("Nhân viên đã được xếp ca này vào ngày này rồi");
    }
  }

  if (data.ShiftID) {
    const shift = await prisma.shifts.findUnique({
      where: { ShiftID: data.ShiftID },
    });
    if (!shift || shift.Status !== "Active") {
      throw new Error("Ca làm việc không hợp lệ hoặc đã bị vô hiệu hóa");
    }
  }

  return await prisma.staffSchedules.update({
    where: { ScheduleID: id },
    data: {
      ...data,
      WorkDate: data.WorkDate ? new Date(data.WorkDate) : undefined,
    },
    include: {
      Users: { select: { FullName: true, Phone: true, BranchID: true } },
      Shifts: { select: { ShiftName: true, StartTime: true, EndTime: true } },
    },
  });
};

const deleteSoft = async (id) => {
  return await prisma.staffSchedules.update({
    where: { ScheduleID: id },
    data: { Status: "Inactive" },
  });
};

export default {
  getAll,
  getById,
  create,
  update,
  deleteSoft,
};
