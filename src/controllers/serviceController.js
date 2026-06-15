import serviceService from "../services/serviceService.js";


const getAllServices = async (req, res) => {
  try {
    const filters = {};

    if (req.query.Status) {
      filters.Status = req.query.Status;
    }
    if (req.query.Type) {
      filters.Type = req.query.Type;
    }

    const services = await serviceService.getAllServices(filters);
    res.json({ success: true, data: services });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


const getServiceById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: "ID không hợp lệ" });
    }

    const service = await serviceService.getServiceById(id);
    if (!service) {
      return res.status(404).json({ success: false, message: "Không tìm thấy dịch vụ" });
    }

    res.json({ success: true, data: service });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createService = async (req, res) => {
  try {
    const service = await serviceService.createService(req.body);
    res.status(201).json({
      success: true,
      message: "Tạo dịch vụ thành công",
      data: service,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


const updateService = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: "ID không hợp lệ" });
    }

    const existing = await serviceService.getServiceById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Không tìm thấy dịch vụ" });
    }

    const service = await serviceService.updateService(id, req.body);
    res.json({
      success: true,
      message: "Cập nhật dịch vụ thành công",
      data: service,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


const deleteService = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: "ID không hợp lệ" });
    }

    const existing = await serviceService.getServiceById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Không tìm thấy dịch vụ" });
    }

    await serviceService.deleteService(id);
    res.json({
      success: true,
      message: "Xóa dịch vụ thành công (Soft delete)",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export default {
  getAllServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
};
