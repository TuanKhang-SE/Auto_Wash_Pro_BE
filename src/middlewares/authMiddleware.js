import jwt from "jsonwebtoken";
import authService from "../services/authService.js";

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  // Kiểm tra token có trong blacklist không
  if (authService.isTokenBlacklisted(token)) {
    return res.status(401).json({ message: "Token invalid or destroyed" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "Invalid or expired token" });
    }

    req.user = decoded;
    req.token = token; // Lưu token để có thể sử dụng sau này
    next();
  });
};

export default authMiddleware;
