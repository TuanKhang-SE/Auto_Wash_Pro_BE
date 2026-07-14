import crypto from "node:crypto";

const ESMS_ENDPOINT =
  "https://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_post_json/";

const normalizeVietnamPhone = (phone) => {
  const value = String(phone || "").replace(/[\s.-]/g, "");

  if (/^\+84\d{9}$/.test(value)) return `0${value.substring(3)}`;
  if (/^84\d{9}$/.test(value)) return `0${value.substring(2)}`;
  return value;
};

const getMode = () => (process.env.SMS_MODE || "mock").toLowerCase();

const requireEsmsConfig = () => {
  const apiKey = process.env.ESMS_API_KEY?.trim();
  const secretKey = process.env.ESMS_SECRET_KEY?.trim();

  if (!apiKey || !secretKey) {
    throw new Error("Thiếu ESMS_API_KEY hoặc ESMS_SECRET_KEY trong file .env");
  }

  return { apiKey, secretKey };
};

const sendViaEsms = async (phone, otp) => {
  const { apiKey, secretKey } = requireEsmsConfig();
  const normalizedPhone = normalizeVietnamPhone(phone);
  const sandbox = process.env.ESMS_SANDBOX === "1" ? "1" : "0";
  const content = `${otp} la ma xac minh dang ky Baotrixemay cua ban`;

  const response = await fetch(ESMS_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ApiKey: apiKey,
      SecretKey: secretKey,
      Phone: normalizedPhone,
      Content: content,
      Brandname: "Baotrixemay",
      SmsType: "2",
      IsUnicode: "0",
      Sandbox: sandbox,
      RequestId: crypto.randomUUID(),
    }),
  });

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error(`eSMS trả về dữ liệu không hợp lệ (HTTP ${response.status})`);
  }

  if (!response.ok || result.CodeResult !== "100") {
    throw new Error(
      result.ErrorMessage ||
        `Không thể gửi OTP qua eSMS (mã ${result.CodeResult || response.status})`,
    );
  }

  return {
    provider: "esms",
    smsId: result.SMSID,
    sandbox: sandbox === "1",
  };
};

const sendBookingOtp = async (phone, otp) => {
  if (getMode() === "mock") {
    console.log(`[MOCK SMS] Gửi OTP ${otp} đến ${normalizeVietnamPhone(phone)}`);
    return { provider: "mock", sandbox: true };
  }

  if (getMode() === "esms") return sendViaEsms(phone, otp);

  throw new Error(`Nhà cung cấp SMS không được hỗ trợ: ${getMode()}`);
};

const isMockMode = () =>
  getMode() === "mock" ||
  (getMode() === "esms" && process.env.ESMS_SANDBOX === "1");

export default { sendBookingOtp, isMockMode };
