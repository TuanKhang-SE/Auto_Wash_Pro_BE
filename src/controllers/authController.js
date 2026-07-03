import authService from "../services/authService.js";
import mailService from "../services/mailService.js";
import otpService from "../services/otpService.js";

const sendRegisterCode = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập email",
      });
    }

    const emailExists = await authService.checkEmailExists(email);

    if (emailExists) {
      return res.status(400).json({
        success: false,
        message: "Email đã tồn tại",
      });
    } 

    const code = otpService.generateOtp();

    otpService.saveOtp(email, code);

    await mailService.sendRegisterCode(email, code);  

    res.status(200).json({
      success: true,
      message: "Mã xác minh đã được gửi đến email",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gửi mã xác minh thất bại",
    });
  }
};

/*=====================sendForgotPasswordCode========================*/

const sendForgotPasswordCode = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập email",
      });
    }

    const emailExists = await authService.checkEmailExists(email);

    if (!emailExists) {
      return res.status(400).json({
        success: false,
        message: "Email không tồn tại",
      });
    }

    const code = otpService.generateOtp();

    otpService.saveOtp(email, code);

    await mailService.sendForgotPasswordCode(email, code);

    res.status(200).json({
      success: true,
      message: "Mã xác minh đặt lại mật khẩu đã được gửi đến email",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gửi mã xác minh thất bại",
    });
  }
};

/*=====================RESET PASSWORD========================*/

const resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập đầy đủ email, mã xác minh và mật khẩu mới",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu mới phải có ít nhất 6 ký tự",
      });
    }

    const otpResult = otpService.verifyOtp(email, code);

    if (!otpResult.success) {
      return res.status(400).json({
        success: false,
        message: otpResult.message,
      });
    }

    await authService.resetPassword(email, newPassword);

    res.status(200).json({
      success: true,
      message: "Đặt lại mật khẩu thành công",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
/*=================================================================*/

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await authService.login(email, password);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: error.message,
    });
  }
};

const logout = (req, res) => {
  authService.blacklistToken(req.token);

  res.status(200).json({
    success: true,
    message: "Logout successfully",
  });
};
const register = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập mã xác minh",
      });
    }

    const otpResult = otpService.verifyOtp(email, code);

    if (!otpResult.success) {
      return res.status(400).json({
        success: false,
        message: otpResult.message,
      });
    }

    const result = await authService.register(req.body);

    res.status(201).json({
      success: true,
      message: "Đăng ký thành công",
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

export default {
  login,
  logout,
  register,
  sendRegisterCode,
  sendForgotPasswordCode,
  resetPassword,
};
