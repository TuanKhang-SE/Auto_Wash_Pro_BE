import { VNPay } from "vnpay";
import dotenv from "dotenv";
dotenv.config();

const vnpayConfig = new VNPay({
  tmnCode: process.env.VNP_TMNCODE || "TESTCODE",
  secureSecret: process.env.VNP_HASHSECRET || "TESTSECRET",
  vnpayHost: "https://sandbox.vnpayment.vn",
  testMode: true,
  hashAlgorithm: "SHA512",
  enableLog: true,
  loggerFn: console.log,
});

export default vnpayConfig;
