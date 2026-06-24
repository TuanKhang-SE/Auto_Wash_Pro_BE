import transactionService from "../services/transactionService.js";

const createFromBooking = async (req, res) => {
  try {
    const bookingId = parseInt(req.params.bookingId);
    if (isNaN(bookingId)) {
      return res.status(400).json({ error: "BookingID không hợp lệ" });
    }

    const transaction = await transactionService.createFromBooking(bookingId);
    res.status(201).json({
      message: "Tạo hóa đơn tạm tính thành công",
      data: transaction,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const payManual = async (req, res) => {
  try {
    const transactionId = parseInt(req.params.id);
    const { method } = req.body;
    const staffId = req.user.userId; // Lấy ID của nhân viên từ JWT Middleware

    if (isNaN(transactionId)) {
      return res.status(400).json({ error: "TransactionID không hợp lệ" });
    }
    if (!method) {
      return res.status(400).json({ error: "Thiếu trường method (CASH hoặc BANK_TRANSFER)" });
    }

    const result = await transactionService.payManual(transactionId, method, staffId);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const createVNPayUrl = async (req, res) => {
  try {
    const transactionId = parseInt(req.params.id);
    if (isNaN(transactionId)) {
      return res.status(400).json({ error: "TransactionID không hợp lệ" });
    }

    // Lấy IP của người dùng để truyền cho VNPay
    const ipAddr =
      req.headers["x-forwarded-for"] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      req.connection.socket.remoteAddress ||
      "127.0.0.1";

    const paymentUrl = await transactionService.createVNPayUrl(transactionId, ipAddr);

    res.status(200).json({
      message: "Tạo URL VNPay thành công",
      data: { url: paymentUrl },
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const vnpayReturn = (req, res) => {
  // Giao diện mà người dùng sẽ nhìn thấy sau khi quẹt thẻ xong ở cổng VNPay
  const { vnp_ResponseCode } = req.query;
  if (vnp_ResponseCode === "00") {
    res.send("<h1>Thanh toán thành công! Bạn có thể tắt tab này.</h1>");
  } else {
    res.send(`<h1>Thanh toán thất bại hoặc đã bị hủy (Mã lỗi: ${vnp_ResponseCode})</h1>`);
  }
};

const vnpayIPN = async (req, res) => {
  // VNPay Server sẽ gọi ngầm vào API này
  const query = req.query;
  const result = await transactionService.vnpayIPN(query);
  
  // Phải trả về đúng JSON theo Format của VNPay yêu cầu để VNPay biết ta đã nhận thành công
  res.status(200).json(result);
};

export default {
  createFromBooking,
  payManual,
  createVNPayUrl,
  vnpayReturn,
  vnpayIPN,
};
