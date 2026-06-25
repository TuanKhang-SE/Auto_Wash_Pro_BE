import tierConfigService from "../services/tierConfigService.js";

const getAll = async (req, res) => {
  try {
    const tiers = await tierConfigService.getAll();
    res.json({ success: true, data: tiers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const getById = async (req, res) => {
  try {
    const tier = await tierConfigService.getById(parseInt(req.params.id));
    if (!tier) {
      return res.status(404).json({ success: false, message: "Không tìm thấy hạng thành viên" });
    }
    res.json({ success: true, data: tier });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const create = async (req, res) => {
  try {
    const tier = await tierConfigService.create(req.body);
    res.status(201).json({ success: true, message: "Tạo hạng thành viên thành công", data: tier });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const update = async (req, res) => {
  try {
    const tier = await tierConfigService.update(parseInt(req.params.id), req.body);
    res.json({ success: true, message: "Cập nhật hạng thành viên thành công", data: tier });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const remove = async (req, res) => {
  try {
    await tierConfigService.remove(parseInt(req.params.id));
    res.json({ success: true, message: "Đã vô hiệu hóa hạng thành viên" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export default {
  getAll,
  getById,
  create,
  update,
  remove
};
