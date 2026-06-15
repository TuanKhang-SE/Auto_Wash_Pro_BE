import userService from "../services/userService.js";


const getAllUsers = async (req, res) => {
  try {
    const { role, branchId } = req.user;
    const filters = {};

    if (role === "Manager") {

      filters.BranchID = branchId;
      filters.Role = "Staff";
    } else {

      if (req.query.Role) filters.Role = req.query.Role;
      if (req.query.BranchID) filters.BranchID = parseInt(req.query.BranchID);
    }


    if (req.query.Status) {
      filters.Status = req.query.Status;
    } else {

      filters.Status = "Active";
    }

    const users = await userService.getAllUsers(filters);
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


const getUserById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: "ID không hợp lệ" });
    }

    const user = await userService.getUserById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "Không tìm thấy người dùng" });
    }


    const { role, branchId } = req.user;
    if (role === "Manager") {
      if (user.BranchID !== branchId || user.Role !== "Staff") {
        return res.status(403).json({ success: false, message: "Bạn không có quyền xem thông tin người dùng này" });
      }
    }

    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


const createUser = async (req, res) => {
  try {
    const { role, branchId } = req.user;
    const data = req.body;

    if (role === "Manager") {

      if (data.Role && data.Role !== "Staff") {
        return res.status(403).json({
          success: false,
          message: "Manager chỉ được phép tạo tài khoản Staff",
        });
      }

      data.Role = "Staff";
      data.BranchID = branchId;
    }

    const user = await userService.createUser(data);
    res.status(201).json({
      success: true,
      message: "Tạo tài khoản thành công",
      data: user,
    });
  } catch (error) {

    if (error.message.includes("đã tồn tại")) {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};


const updateUser = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: "ID không hợp lệ" });
    }


    const existingUser = await userService.getUserById(id);
    if (!existingUser) {
      return res.status(404).json({ success: false, message: "Không tìm thấy người dùng" });
    }


    const { role, branchId } = req.user;
    if (role === "Manager") {
      if (existingUser.BranchID !== branchId || existingUser.Role !== "Staff") {
        return res.status(403).json({
          success: false,
          message: "Bạn chỉ được sửa thông tin Staff thuộc chi nhánh của mình",
        });
      }

      delete req.body.Role;
      delete req.body.BranchID;
    }

    const user = await userService.updateUser(id, req.body);
    res.json({
      success: true,
      message: "Cập nhật thành công",
      data: user,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


const deleteUser = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: "ID không hợp lệ" });
    }


    const existingUser = await userService.getUserById(id);
    if (!existingUser) {
      return res.status(404).json({ success: false, message: "Không tìm thấy người dùng" });
    }


    const { role, branchId } = req.user;
    if (role === "Manager") {
      if (existingUser.BranchID !== branchId || existingUser.Role !== "Staff") {
        return res.status(403).json({
          success: false,
          message: "Bạn chỉ được xóa Staff thuộc chi nhánh của mình",
        });
      }
    }

    await userService.deleteUser(id);
    res.json({
      success: true,
      message: "Xóa người dùng thành công (Soft delete)",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export default {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
};
