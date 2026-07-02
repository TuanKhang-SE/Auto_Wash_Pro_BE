import bookingService from "../services/bookingService.js";
import prisma from "../config/prisma.js";

const getAvailableSlots = async (req, res) => {
  try {
    const branchId = parseInt(req.query.BranchID);
    const bookingDate = req.query.BookingDate;

    if (!branchId || !bookingDate) {
      return res
        .status(400)
        .json({ success: false, message: "Thiếu BranchID hoặc BookingDate" });
    }

    const data = await bookingService.getAvailableSlots(branchId, bookingDate);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createBooking = async (req, res) => {
  try {
    const userId = req.user.userId;

    const customer = await prisma.customers.findFirst({
      where: { UserID: userId },
    });
    if (!customer) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Tài khoản chưa được thiết lập hồ sơ Khách hàng. Vui lòng thêm xe trước.",
        });
    }

    const booking = await bookingService.createBooking(
      customer.CustomerID,
      req.body,
    );
    res
      .status(201)
      .json({ success: true, message: "Đặt lịch thành công", data: booking });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const cancelBooking = async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    const userId = req.user.userId;

    const customer = await prisma.customers.findFirst({
      where: { UserID: userId },
    });
    if (!customer) throw new Error("Tài khoản chưa có hồ sơ Khách hàng");

    await bookingService.cancelBooking(bookingId, customer.CustomerID);
    res.json({ success: true, message: "Hủy đơn thành công" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const getMyBookings = async (req, res) => {
  try {
    const userId = req.user.userId;
    const customer = await prisma.customers.findFirst({
      where: { UserID: userId },
    });
    if (!customer) return res.json({ success: true, data: [] });

    const bookings = await prisma.bookingGroups.findMany({
      where: { CustomerID: customer.CustomerID },
      include: {
        branches: { select: { BranchName: true, Address: true } },
        BookingItems: {
          include: {
            Vehicles: {
              select: { LicensePlate: true, Brand: true, Model: true },
            },
            ServiceLineItems: {
              include: { Services: { select: { ServiceName: true } } },
            },
          },
        },
      },
      orderBy: { CreatedAt: "desc" },
    });

    res.json({ success: true, data: bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export default {
  getAvailableSlots,
  createBooking,
  cancelBooking,
  getMyBookings,
};
