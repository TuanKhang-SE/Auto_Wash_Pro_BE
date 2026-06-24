import staffOperationService from "../services/staffOperationService.js";

const getTodayBookings = async (req, res) => {
  try {
    const branchId = req.user.branchId;
    const { customerName, status } = req.query;

    const bookings = await staffOperationService.getTodayBookings(branchId, customerName, status);
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
      return res.status(400).json({ success: false, message: "Trạng thái không hợp lệ" });
    }

    const result = await staffOperationService.updateBookingItemStatus(itemId, status, staffId);
    res.json({ success: true, message: result.message });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const addServices = async (req, res) => {
  try {
    const itemId = parseInt(req.params.id);
    const branchId = req.user.branchId;
    const { serviceIds } = req.body; // Array of IDs

    if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
      return res.status(400).json({ success: false, message: "Danh sách dịch vụ không hợp lệ" });
    }

    const result = await staffOperationService.addServicesToItem(itemId, branchId, serviceIds);
    res.json({ success: true, message: result.message });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export default {
  getTodayBookings,
  updateItemStatus,
  addServices
};
