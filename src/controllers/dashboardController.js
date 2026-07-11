import dashboardService from "../services/dashboardService.js";

const getDailyCashflow = async (req, res) => {
  try {
    const { branchId, role } = req.user;


    const queryBranchId = req.query.branchId ? parseInt(req.query.branchId) : branchId;
    const { startDate, endDate } = req.query;

    const data = await dashboardService.getDailyCashflow(queryBranchId, role, startDate, endDate);

    res.status(200).json({
      success: true,
      data: data,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

const getRevenueByBranch = async (req, res) => {
  try {
    const { branchId, role } = req.user;
    const { startDate, endDate } = req.query;

    const data = await dashboardService.getRevenueByBranch(role, branchId, startDate, endDate);

    res.status(200).json({
      success: true,
      data: data,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export default {
  getDailyCashflow,
  getRevenueByBranch,
};
