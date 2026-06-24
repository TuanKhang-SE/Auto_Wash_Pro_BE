import customerService from "../services/customerService.js";

const getProfile = async (req, res) => {
  try {
    const { userId } = req.user;
    const profile = await customerService.getProfile(userId);

    res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { userId } = req.user;

    const updatedProfile = await customerService.updateProfile(
      userId,
      req.body,
    );

    res.status(200).json({
      success: true,
      message: "Cập nhật hồ sơ thành công",
      data: updatedProfile,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export default {
  getProfile,
  updateProfile,
};
