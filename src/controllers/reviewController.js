import reviewService from "../services/reviewService.js";

const createReview = async (req, res) => {
  try {
    const { bookingGroupId, rating, comment } = req.body;

    const review = await reviewService.createReview(
      req.user,
      bookingGroupId,
      rating,
      comment,
    );
    res.status(201).json({ success: true, message: "Gửi đánh giá thành công", data: review });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const getBranchReviews = async (req, res) => {
  try {
    const branchId = parseInt(req.params.branchId);
    if (isNaN(branchId)) {
      return res.status(400).json({ success: false, message: "ID chi nhánh không hợp lệ" });
    }

    const data = await reviewService.getBranchReviews(branchId);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export default {
  createReview,
  getBranchReviews,
};
