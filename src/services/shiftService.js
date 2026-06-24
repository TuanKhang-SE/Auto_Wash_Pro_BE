import prisma from "../config/prisma.js";

const getAll = async (filters) => {
  return await prisma.shifts.findMany({
    where: filters,
    orderBy: {
      StartTime: "asc",
    },
  });
};

const getById = async (id) => {
  return await prisma.shifts.findUnique({
    where: { ShiftID: id },
  });
};

const create = async (data) => {
  const existing = await prisma.shifts.findFirst({
    where: { ShiftName: data.ShiftName },
  });
  if (existing) {
    throw new Error("Tên ca làm việc đã tồn tại");
  }

  return await prisma.shifts.create({
    data,
  });
};

const update = async (id, data) => {
  return await prisma.shifts.update({
    where: { ShiftID: id },
    data,
  });
};

const deleteSoft = async (id) => {
  return await prisma.shifts.update({
    where: { ShiftID: id },
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
