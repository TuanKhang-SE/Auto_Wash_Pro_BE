import { poolPromise } from "../config/database.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const tokenBlacklist = new Set();

const login = async (email, password) => {
  const pool = await poolPromise;

  const result = await pool.request().input("Email", email).query(`
      SELECT *
      FROM Users
      WHERE Email = @Email
    `);

  const user = result.recordset[0];

  if (!user) {
    throw new Error("Email không tồn tại");
  }

  const isMatch = await bcrypt.compare(password, user.PasswordHash);

  if (!isMatch) {
    throw new Error("Sai mật khẩu");
  }

  const token = jwt.sign(
    {
      userId: user.UserID,
      role: user.Role,
      branchId: user.BranchID,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    },
  );

  return {
    token,
    user: {
      userId: user.UserID,
      fullName: user.FullName,
      email: user.Email,
      role: user.Role,
      branchId: user.BranchID,
    },
  };
};

const checkEmailExists = async (email) => {
  const pool = await poolPromise;

  const existingUser = await pool.request().input("Email", email).query(`
      SELECT UserID
      FROM Users
      WHERE Email = @Email
    `);

  return existingUser.recordset.length > 0;
};

/*==========================QUEN MAT KHAU FORGOT PASSWORD================================*/

const resetPassword = async (email, newPassword) => {
  const pool = await poolPromise;

  const existingUser = await pool.request().input("Email", email).query(`
    SELECT UserID
    FROM Users
    WHERE Email = @Email
  `);

  if (existingUser.recordset.length === 0) {
    throw new Error("Email không tồn tại");
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await pool
    .request()
    .input("Email", email)
    .input("PasswordHash", passwordHash)
    .query(`
      UPDATE Users
      SET PasswordHash = @PasswordHash,
          UpdatedAt = GETDATE()
      WHERE Email = @Email
    `);

  return {
    email,
  };
};

/*========================================================================*/

const register = async (userData) => {
  const { fullName, phone, email, password } = userData;

  const pool = await poolPromise;

  const existingUser = await pool.request().input("Email", email).query(`
      SELECT UserID
      FROM Users
      WHERE Email = @Email
    `);

  if (existingUser.recordset.length > 0) {
    throw new Error("Email đã tồn tại");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const result = await pool
    .request()
    .input("FullName", fullName)
    .input("Phone", phone)
    .input("Email", email)
    .input("BranchID", null)
    .input("PasswordHash", passwordHash)
    .input("Role", "Customer").query(`
      INSERT INTO Users
      (
        FullName,
        Phone,
        Email,
        BranchID,
        PasswordHash,
        Role,
        CreatedAt,
        UpdatedAt
      )
      OUTPUT INSERTED.UserID
      VALUES
      (
        @FullName,
        @Phone,
        @Email,
        @BranchID,
        @PasswordHash,
        @Role,
        GETDATE(),
        GETDATE()
      )
    `);

  return {
    userId: result.recordset[0].UserID,
    fullName,
    email,
    role: "Customer",
  };
};

const blacklistToken = (token) => {
  tokenBlacklist.add(token);
};

const isTokenBlacklisted = (token) => {
  return tokenBlacklist.has(token);
};

export default {
  login,
  register,
  checkEmailExists,
  resetPassword,
  blacklistToken,
  isTokenBlacklisted,
};
