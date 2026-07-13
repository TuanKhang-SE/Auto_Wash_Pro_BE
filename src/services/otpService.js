const otpStore = new Map();

const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const saveOtp = (email, code) => {
  const key = email.toLowerCase();

  otpStore.set(key, {
    code,
    expiresAt: Date.now() + 5 * 60 * 1000,
  });
};

const verifyOtp = (email, code, consume = true) => {
  const key = email.toLowerCase();
  const savedOtp = otpStore.get(key);

  if (!savedOtp) {
    return {
      success: false,
      message: "Bạn chưa gửi mã xác minh",
    };
  }

  if (Date.now() > savedOtp.expiresAt) {
    otpStore.delete(key);

    return {
      success: false,
      message: "Mã xác minh đã hết hạn",
    };
  }

  if (savedOtp.code !== code) {
    return {
      success: false,
      message: "Mã xác minh không đúng",
    };
  }

  if (consume) otpStore.delete(key);

  return {
    success: true,
    message: "Xác minh thành công",
  };
};

const clearOtp = (email) => {
  otpStore.delete(email.toLowerCase());
};

export default {
  generateOtp,
  saveOtp,
  verifyOtp,
  clearOtp,
};
