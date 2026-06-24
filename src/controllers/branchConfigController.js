import branchConfigService from "../services/branchConfigService.js";

const getConfig = async (req, res) => {
  try {
    const branchId = parseInt(req.query.BranchID) || req.user.branchId;
    
    if (req.user.role === "Manager" && branchId !== req.user.branchId) {
        return res.status(403).json({ success: false, message: "Không có quyền xem cấu hình chi nhánh khác" });
    }

    const config = await branchConfigService.getByBranchId(branchId);
    res.json({ success: true, data: config || {} });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const upsertConfig = async (req, res) => {
  try {
    const branchId = parseInt(req.body.BranchID);
    
    if (req.user.role === "Manager" && branchId !== req.user.branchId) {
        return res.status(403).json({ success: false, message: "Không có quyền sửa cấu hình chi nhánh khác" });
    }

    const config = await branchConfigService.upsert(branchId, req.body);
    res.json({ success: true, message: "Cập nhật cấu hình thành công", data: config });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export default {
  getConfig,
  upsertConfig,
};
