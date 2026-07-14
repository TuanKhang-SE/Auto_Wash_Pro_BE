import crypto from "node:crypto";

const otpStore = new Map();
const OTP_TTL_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

const getKey = (userId, phone) => `${userId}:${phone}`;

const createOtp = (userId, phone) => {
  const key = getKey(userId, phone);
  const now = Date.now();
  const current = otpStore.get(key);

  if (current && now - current.sentAt < RESEND_COOLDOWN_MS) {
    const retryAfterSeconds = Math.ceil(
      (RESEND_COOLDOWN_MS - (now - current.sentAt)) / 1000,
    );
    const error = new Error(
      `Vui lòng chờ ${retryAfterSeconds} giây trước khi gửi lại OTP`,
    );
    error.statusCode = 429;
    error.retryAfterSeconds = retryAfterSeconds;
    throw error;
  }

  const code = crypto.randomInt(100000, 1000000).toString();
  otpStore.set(key, {
    code,
    sentAt: now,
    expiresAt: now + OTP_TTL_MS,
    attempts: 0,
  });

  return { code, expiresInSeconds: 300, retryAfterSeconds: 60 };
};

const verifyOtp = (userId, phone, code, consume = true) => {
  const key = getKey(userId, phone);
  const savedOtp = otpStore.get(key);

  if (!savedOtp) {
    return { success: false, message: "Bạn chưa gửi mã OTP đặt lịch" };
  }

  if (Date.now() > savedOtp.expiresAt) {
    otpStore.delete(key);
    return { success: false, message: "Mã OTP đã hết hạn" };
  }

  if (savedOtp.attempts >= MAX_ATTEMPTS) {
    otpStore.delete(key);
    return {
      success: false,
      message: "Bạn đã nhập sai OTP quá nhiều lần. Vui lòng gửi mã mới",
    };
  }

  if (savedOtp.code !== String(code)) {
    savedOtp.attempts += 1;
    const remainingAttempts = MAX_ATTEMPTS - savedOtp.attempts;
    if (remainingAttempts === 0) otpStore.delete(key);
    return {
      success: false,
      message:
        remainingAttempts > 0
          ? `Mã OTP không đúng. Còn ${remainingAttempts} lần thử`
          : "Bạn đã nhập sai OTP quá nhiều lần. Vui lòng gửi mã mới",
    };
  }

  if (consume) otpStore.delete(key);
  return { success: true };
};

const clearOtp = (userId, phone) => {
  otpStore.delete(getKey(userId, phone));
};

export default { createOtp, verifyOtp, clearOtp };
