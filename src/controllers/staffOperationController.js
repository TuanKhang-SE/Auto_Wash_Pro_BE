import staffOperationService from "../services/staffOperationService.js";

const getTodayBookings = async (req, res) => {
  try {
    const branchId = req.user.branchId;
    const { customerName, status, bookingDate } = req.query;

    const bookings = await staffOperationService.getTodayBookings(
      branchId,
      customerName,
      status,
      bookingDate,
    );
    res.json({ success: true, data: bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateItemStatus = async (req, res) => {
  try {
    const itemId = parseInt(req.params.id);
    const { status } = req.body;
    const staffId = req.user.userId;

    const validStatuses = ["CheckedIn", "InProgress", "Completed"];
    if (!validStatuses.includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Trạng thái không hợp lệ" });
    }

    const result = await staffOperationService.updateBookingItemStatus(
      itemId,
      status,
      staffId,
    );
    res.json({ success: true, message: result.message });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const addServices = async (req, res) => {
  try {
    const itemId = parseInt(req.params.id);
    const branchId = req.user.branchId;
    const { serviceIds } = req.body;
    if (
      !Array.isArray(serviceIds) ||
      serviceIds.length === 0 ||
      serviceIds.some((id) => !Number.isInteger(id) || id <= 0)
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Danh sách dịch vụ không hợp lệ" });
    }

    const result = await staffOperationService.addServicesToItem(
      itemId,
      branchId,
      serviceIds,
    );
    res.json({ success: true, message: result.message });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const updateServices = async (req, res) => {
  try {
    const itemId = parseInt(req.params.id);
    const branchId = req.user.branchId;
    const { serviceIds } = req.body;
    if (
      !Array.isArray(serviceIds) ||
      serviceIds.length === 0 ||
      serviceIds.some((id) => !Number.isInteger(id) || id <= 0)
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Danh sách dịch vụ không hợp lệ" });
    }

    const result = await staffOperationService.updateServicesToItem(
      itemId,
      branchId,
      serviceIds,
    );
    res.json({ success: true, message: result.message });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const createWalkInBooking = async (req, res) => {
  try {
    const branchId = req.user.branchId;
    if (!branchId) {
      return res.status(400).json({ success: false, message: "Nhân viên chưa được phân bổ về chi nhánh nào" });
    }

    const { Phone, Items } = req.body;
    
    const result = await staffOperationService.createWalkInBooking(
      branchId,
      Phone,
      Items
    );
    
    res.status(201).json({ success: true, message: "Tạo đơn tại quầy thành công", data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export default {
  getTodayBookings,
  updateItemStatus,
  addServices,
  updateServices,
  createWalkInBooking,
};
