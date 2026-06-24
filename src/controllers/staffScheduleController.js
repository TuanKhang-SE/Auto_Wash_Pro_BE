import staffScheduleService from "../services/staffScheduleService.js";
import userService from "../services/userService.js";

const getAllSchedules = async (req, res) => {
  try {
    const { role, branchId, userId } = req.user;
    const filters = {};

    // 1. Filter Status
    if (req.query.Status) {
      filters.Status = req.query.Status;
    } else {
      filters.Status = "Active";
    }

    // 2. Role-based filtering
    if (role === "Manager") {
      // Manager only sees schedules for their branch
      filters.Users = { BranchID: branchId };
    } else if (role === "Staff") {
      // Staff only sees their own schedule
      filters.UserID = userId;
    } else if (role === "Admin" && req.query.UserID) {
        filters.UserID = parseInt(req.query.UserID);
    }
    
    // Allow Manager to filter by a specific UserID if provided
    if (role === "Manager" && req.query.UserID) {
        filters.UserID = parseInt(req.query.UserID);
    }

    // 3. Filter by ShiftID
    if (req.query.ShiftID) {
      filters.ShiftID = parseInt(req.query.ShiftID);
    }

    // 4. Filter by Date range
    if (req.query.from || req.query.to) {
      filters.WorkDate = {};
      if (req.query.from) {
        filters.WorkDate.gte = new Date(req.query.from);
      }
      if (req.query.to) {
        filters.WorkDate.lte = new Date(req.query.to);
      }
    }

    const schedules = await staffScheduleService.getAll(filters);
    res.json({ success: true, data: schedules });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getScheduleById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const schedule = await staffScheduleService.getById(id);

    if (!schedule) {
      return res.status(404).json({ success: false, message: "Không tìm thấy lịch làm việc" });
    }

    const { role, branchId, userId } = req.user;

    if (role === "Manager" && schedule.Users.BranchID !== branchId) {
      return res.status(403).json({ success: false, message: "Không có quyền xem lịch của chi nhánh khác" });
    }

    if (role === "Staff" && schedule.UserID !== userId) {
      return res.status(403).json({ success: false, message: "Chỉ có thể xem lịch của bản thân" });
    }

    res.json({ success: true, data: schedule });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createSchedule = async (req, res) => {
  try {
    const { role, branchId } = req.user;
    const { UserID } = req.body;

    if (role === "Manager") {
      const targetUser = await userService.getUserById(UserID);
      if (!targetUser || targetUser.BranchID !== branchId) {
        return res.status(403).json({ success: false, message: "Chỉ được xếp lịch cho nhân viên thuộc chi nhánh của mình" });
      }
    }

    const schedule = await staffScheduleService.create(req.body);
    res.status(201).json({ success: true, message: "Tạo lịch làm việc thành công", data: schedule });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const updateSchedule = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { role, branchId } = req.user;

    const existing = await staffScheduleService.getById(id);
    if (!existing) {
        return res.status(404).json({ success: false, message: "Không tìm thấy lịch làm việc" });
    }

    if (role === "Manager") {
      if (existing.Users.BranchID !== branchId) {
        return res.status(403).json({ success: false, message: "Không có quyền sửa lịch của nhân viên chi nhánh khác" });
      }
    }

    const schedule = await staffScheduleService.update(id, req.body);
    res.json({ success: true, message: "Cập nhật thành công", data: schedule });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const deleteSchedule = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { role, branchId } = req.user;

    const existing = await staffScheduleService.getById(id);
    if (!existing) {
        return res.status(404).json({ success: false, message: "Không tìm thấy lịch làm việc" });
    }

    if (role === "Manager") {
      if (existing.Users.BranchID !== branchId) {
        return res.status(403).json({ success: false, message: "Không có quyền xóa lịch của nhân viên chi nhánh khác" });
      }
    }

    await staffScheduleService.deleteSoft(id);
    res.json({ success: true, message: "Xóa lịch làm việc thành công (Soft delete)" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export default {
  getAllSchedules,
  getScheduleById,
  createSchedule,
  updateSchedule,
  deleteSchedule,
};
