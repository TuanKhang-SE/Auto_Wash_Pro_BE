import invoiceService from "../services/invoiceService.js";

const getInvoicePreview = async (req, res) => {
  try {
    const transactionId = parseInt(req.params.transactionId);
    const data = await invoiceService.getInvoicePreview(transactionId);
    res.json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const generateInvoice = async (req, res) => {
  try {
    const transactionId = parseInt(req.params.transactionId);
    const invoice = await invoiceService.generateInvoice(transactionId);
    res.status(201).json({ success: true, message: "Xuất hóa đơn thành công", data: invoice });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const getInvoiceById = async (req, res) => {
  try {
    const invoiceId = parseInt(req.params.id);
    const data = await invoiceService.getInvoiceById(invoiceId);
    res.json({ success: true, data });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
};

const cancelInvoice = async (req, res) => {
  try {
    const invoiceId = parseInt(req.params.id);
    const invoice = await invoiceService.cancelInvoice(invoiceId);
    res.json({ success: true, message: "Hủy hóa đơn thành công", data: invoice });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export default {
  getInvoicePreview,
  generateInvoice,
  getInvoiceById,
  cancelInvoice
};
