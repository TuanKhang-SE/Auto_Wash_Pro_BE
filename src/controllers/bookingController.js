import bookingService from "../services/bookingService.js";
import prisma from "../config/prisma.js";
import bookingOtpService from "../services/bookingOtpService.js";
import smsService from "../services/smsService.js";

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

    const user = await prisma.users.findUnique({
      where: { UserID: userId },
      select: {
        Phone: true,
        Customers: {
          select: { CustomerID: true },
        },
      },
    });

    const customer = user?.Customers?.[0];

    if (!customer) {
      return res.status(400).json({
        success: false,
        message: "Tài khoản chưa có hồ sơ khách hàng",
      });
    }

    if (!user?.Phone) {
      return res.status(400).json({
        success: false,
        message: "Tài khoản chưa đăng ký số điện thoại",
      });
    }

    const otpResult = bookingOtpService.verifyOtp(
      userId,
      user.Phone,
      req.body.Otp,
      false,
    );

    if (!otpResult.success) {
      return res.status(400).json({
        success: false,
        message: otpResult.message,
      });
    }

    const { Otp, ...bookingData } = req.body;

    const booking = await bookingService.createBooking(
      customer.CustomerID,
      bookingData,
    );

    // Chỉ xóa OTP sau khi booking tạo thành công.
    bookingOtpService.clearOtp(userId, user.Phone);

    res.status(201).json({
      success: true,
      message: "Đặt lịch thành công",
      data: booking,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
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
        Transactions: {
          select: {
            TransactionID: true,
            Subtotal: true,
            DiscountAmount: true,
            FinalAmount: true,
            Status: true,
            CreatedAt: true,
            PaymentRecords: {
              select: {
                PaymentID: true,
                Method: true,
                Status: true,
                ConfirmedAt: true,
              },
              orderBy: {
                ConfirmedAt: "desc",
              },
              take: 1,
            },
          },
          orderBy: { CreatedAt: "desc" },
          take: 1,
        },
        Reviews: {
          select: {
            ReviewID: true,
            Rating: true,
            Comment: true,
            CreatedAt: true,
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

const sendBookingOtp = async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await prisma.users.findUnique({
      where: { UserID: userId },
      select: { Phone: true },
    });

    if (!user?.Phone) {
      return res.status(400).json({
        success: false,
        message: "Tài khoản chưa đăng ký số điện thoại",
      });
    }

    if (!/^0\d{9}$/.test(user.Phone)) {
      return res.status(400).json({
        success: false,
        message: "Số điện thoại đăng ký không hợp lệ",
      });
    }

    const otpData = bookingOtpService.createOtp(userId, user.Phone);
    try {
      await smsService.sendBookingOtp(user.Phone, otpData.code);
    } catch (error) {
      bookingOtpService.clearOtp(userId, user.Phone);
      throw error;
    }

    res.json({
      success: true,
      message: "Đã gửi OTP đến số điện thoại đăng ký",
      data: {
        expiresInSeconds: otpData.expiresInSeconds,
        retryAfterSeconds: otpData.retryAfterSeconds,
        ...(smsService.isMockMode() && { demoOtp: otpData.code }),
      },
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
      retryAfterSeconds: error.retryAfterSeconds,
    });
  }
};

const getAllBookings = async (req, res) => {
  try {
    const user = {
      userId: req.user.userId,
      role: req.user.role,
      branchId: req.user.branchId,
    };
    const result = await bookingService.getAllBookings(req.query, user);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export default {
  getAvailableSlots,
  createBooking,
  cancelBooking,
  getMyBookings,
  sendBookingOtp,
  getAllBookings,
};
