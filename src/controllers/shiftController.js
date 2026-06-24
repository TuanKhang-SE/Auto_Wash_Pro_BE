import shiftService from "../services/shiftService.js";

const getAllShifts = async (req, res) => {
  try {
    const filters = {};
    if (req.query.Status) {
      filters.Status = req.query.Status;
    } else {
      if (req.user && req.user.role !== "Admin") {
        filters.Status = "Active";
      }
    }

    const shifts = await shiftService.getAll(filters);
    res.json({ success: true, data: shifts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getShiftById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const shift = await shiftService.getById(id);

    if (!shift) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy ca làm việc" });
    }

    if (req.user && req.user.role !== "Admin" && shift.Status === "Inactive") {
      return res
        .status(403)
        .json({ success: false, message: "Ca làm việc này đã bị ẩn" });
    }

    res.json({ success: true, data: shift });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createShift = async (req, res) => {
  try {
    const shift = await shiftService.create(req.body);
    res
      .status(201)
      .json({
        success: true,
        message: "Thêm ca làm việc thành công",
        data: shift,
      });
  } catch (error) {
    if (error.message.includes("tồn tại")) {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateShift = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await shiftService.getById(id);

    if (!existing) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy ca làm việc" });
    }

    const shift = await shiftService.update(id, req.body);
    res.json({ success: true, message: "Cập nhật thành công", data: shift });
  } catch (error) {
    if (error.message.includes("tồn tại")) {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteShift = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await shiftService.getById(id);

    if (!existing || existing.Status === "Inactive") {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy ca làm việc" });
    }

    await shiftService.deleteSoft(id);
    res.json({ success: true, message: "Đã xóa ca làm việc (Soft delete)" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export default {
  getAllShifts,
  getShiftById,
  createShift,
  updateShift,
  deleteShift,
};
