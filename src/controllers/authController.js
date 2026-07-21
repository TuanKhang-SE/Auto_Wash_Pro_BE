import authService from "../services/authService.js";
import mailService from "../services/mailService.js";
import otpService from "../services/otpService.js";

const fullNameRegex = /^[\p{L}]+(?:[ '-][\p{L}]+)*$/u;
const phoneRegex = /^0\d{9}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;
const verificationCodeRegex = /^\d{6}$/;
const passwordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s])\S{8,64}$/;

const normalizeEmail = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const sendRegisterCode = async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập email",
      });
    }

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Email không đúng định dạng",
      });
    }

    const emailExists = await authService.checkEmailExists(normalizedEmail);

    if (emailExists) {
      return res.status(400).json({
        success: false,
        message: "Email đã tồn tại",
      });
    } 

    const code = otpService.generateOtp();

    otpService.saveOtp(normalizedEmail, code);

    await mailService.sendRegisterCode(normalizedEmail, code);

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

    const otpResult = otpService.verifyOtp(email, code, false);

    if (!otpResult.success) {
      return res.status(400).json({
        success: false,
        message: otpResult.message,
      });
    }

    await authService.resetPassword(email, newPassword);
    otpService.clearOtp(email);

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
    const { fullName, phone, email, password, code } = req.body;
    const normalizedFullName =
      typeof fullName === "string"
        ? fullName.trim().replace(/\s+/g, " ")
        : "";
    const normalizedPhone = typeof phone === "string" ? phone.trim() : "";
    const normalizedEmail = normalizeEmail(email);
    const normalizedCode = typeof code === "string" ? code.trim() : "";

    if (!normalizedFullName || !fullNameRegex.test(normalizedFullName)) {
      return res.status(400).json({
        success: false,
        message:
          "Họ và tên chỉ được chứa chữ cái, khoảng trắng, dấu nháy đơn hoặc dấu gạch nối",
      });
    }

    if (!phoneRegex.test(normalizedPhone)) {
      return res.status(400).json({
        success: false,
        message: "Số điện thoại phải bắt đầu bằng 0 và có đúng 10 chữ số",
      });
    }

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Email không đúng định dạng",
      });
    }

    if (!verificationCodeRegex.test(normalizedCode)) {
      return res.status(400).json({
        success: false,
        message: "Mã xác minh phải có đúng 6 chữ số",
      });
    }

    if (typeof password !== "string" || !passwordRegex.test(password)) {
      return res.status(400).json({
        success: false,
        message:
          "Mật khẩu phải có 8–64 ký tự, gồm chữ thường, chữ hoa, số, ký tự đặc biệt và không có khoảng trắng",
      });
    }

    const otpResult = otpService.verifyOtp(normalizedEmail, normalizedCode);

    if (!otpResult.success) {
      return res.status(400).json({
        success: false,
        message: otpResult.message,
      });
    }

    const result = await authService.register({
      ...req.body,
      fullName: normalizedFullName,
      phone: normalizedPhone,
      email: normalizedEmail,
      password,
      code: normalizedCode,
    });

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
