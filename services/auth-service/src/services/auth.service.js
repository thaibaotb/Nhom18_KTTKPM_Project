const bcrypt = require('bcrypt');
const userRepository = require('../repositories/user.repository');
const ROLES = require('../config/roles');
const { sendOTPEmail } = require('./mail.service');
const redis = require('../config/redis');

const SALT_ROUNDS = 10;

function createServiceError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function sanitizeUser(user) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    birthday: user.birthday,
    phoneNumber: user.phoneNumber,
    isVerified: user.isVerified,
    createdAt: user.createdAt
  };
}

async function register(email, password, birthday, phoneNumber, fullName) {
  const existingUser = await userRepository.findByEmail(email);
  if (existingUser) {
    throw createServiceError('Email đã được sử dụng', 409);
  }

  // Kiểm tra xem có đang trong quá trình đăng ký chờ OTP không
  const pendingUser = await redis.get(`pending_reg:${email}`);
  if (pendingUser) {
     // Có thể gửi lại OTP hoặc báo lỗi tùy logic. Ở đây mình cho phép đăng ký đè (resend)
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  const registrationData = {
    email,
    passwordHash,
    birthday,
    phoneNumber,
    fullName,
    otp
  };

  // Lưu vào Redis thay vì Database chính, hết hạn sau 10 phút
  await redis.setex(`pending_reg:${email}`, 600, JSON.stringify(registrationData));

  // Gửi email OTP
  await sendOTPEmail(email, otp);

  return { email, fullName, message: 'Vui lòng xác thực mã OTP gửi đến email.' };
}

async function verifyRegistration(email, otp) {
  const data = await redis.get(`pending_reg:${email}`);
  if (!data) {
    throw createServiceError('Yêu cầu đăng ký không tồn tại hoặc đã hết hạn', 400);
  }

  const registrationData = JSON.parse(data);

  if (registrationData.otp !== otp) {
    throw createServiceError('Mã OTP không chính xác', 400);
  }

  // OTP đúng -> Bây giờ mới chính thức tạo User trong Postgres
  const createdUser = await userRepository.createUser({
    email: registrationData.email,
    passwordHash: registrationData.passwordHash,
    fullName: registrationData.fullName,
    birthday: registrationData.birthday,
    phoneNumber: registrationData.phoneNumber,
    isVerified: true // Set verified luôn vì đã qua OTP
  });

  // Xóa dữ liệu tạm trong Redis
  await redis.del(`pending_reg:${email}`);

  return sanitizeUser(createdUser);
}

async function login(email, password) {
  const user = await userRepository.findByEmail(email);
  if (!user) {
    throw createServiceError('Thông tin đăng nhập không chính xác', 401);
  }

  if (!user.isVerified) {
    throw createServiceError('Tài khoản chưa được xác thực email.', 403);
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    throw createServiceError('Thông tin đăng nhập không chính xác', 401);
  }

  return sanitizeUser(user);
}

async function forgotPassword(email) {
  const user = await userRepository.findByEmail(email);
  if (!user) {
    return true; 
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expires = new Date(Date.now() + 10 * 60 * 1000); 

  await userRepository.updateUser(user.id, {
    otpCode: otp,
    otpExpires: expires
  });

  await sendOTPEmail(email, otp);

  return true;
}

async function resetPassword(email, otp, newPassword) {
  const user = await userRepository.findByEmail(email);
  if (!user || user.otpCode !== otp) {
    throw createServiceError('Mã OTP không chính xác', 400);
  }

  if (new Date() > user.otpExpires) {
    throw createServiceError('Mã OTP đã hết hạn', 400);
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await userRepository.updateUser(user.id, {
    passwordHash,
    otpCode: null,
    otpExpires: null
  });

  return true;
}

async function verifyOTP(email, otp) {
  const user = await userRepository.findByEmail(email);
  if (!user || user.otpCode !== otp) {
    throw createServiceError('Mã OTP không chính xác', 400);
  }

  if (new Date() > user.otpExpires) {
    throw createServiceError('Mã OTP đã hết hạn', 400);
  }

  return true;
}

async function updateProfile(userId, { fullName, birthday, password, oldPassword, phoneNumber }) {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw createServiceError('Người dùng không tồn tại', 404);
  }

  const data = {};
  if (fullName) data.fullName = fullName;
  if (birthday) data.birthday = new Date(birthday);
  if (phoneNumber) data.phoneNumber = phoneNumber;
  
  if (password) {
    if (!oldPassword) {
      throw createServiceError('Vui lòng cung cấp mật khẩu hiện tại', 400);
    }
    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isOldPasswordValid) {
      throw createServiceError('Mật khẩu hiện tại không chính xác', 400);
    }
    data.passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  }

  const updatedUser = await userRepository.updateUser(userId, data);
  return sanitizeUser(updatedUser);
}

async function getUsers(role) {
  const where = role ? { role } : {};
  const users = await userRepository.findAll(where);
  return users.map(sanitizeUser);
}

async function updateUserRole(actor, userId, role) {
  if (!actor || actor.role !== ROLES.ADMIN) {
    throw createServiceError('Forbidden', 403);
  }

  if (!Object.values(ROLES).includes(role)) {
    throw createServiceError('Role không hợp lệ', 400);
  }

  const user = await userRepository.findById(userId);
  if (!user) {
    throw createServiceError('Người dùng không tồn tại', 404);
  }

  if (actor.userId === userId && role !== ROLES.ADMIN) {
    throw createServiceError('Không thể tự hạ quyền admin của chính mình', 400);
  }

  if (user.role === ROLES.ADMIN && role !== ROLES.ADMIN) {
    const adminCount = await userRepository.countByRole(ROLES.ADMIN);
    if (adminCount <= 1) {
      throw createServiceError('Không thể hạ quyền admin cuối cùng', 400);
    }
  }

  const updatedUser = await userRepository.updateUser(userId, { role });
  return sanitizeUser(updatedUser);
}

async function deleteUser(actor, userId) {
  if (!actor || actor.role !== ROLES.ADMIN) {
    throw createServiceError('Forbidden', 403);
  }

  const user = await userRepository.findById(userId);
  if (!user) {
    throw createServiceError('Người dùng không tồn tại', 404);
  }

  if (actor.userId === userId) {
    throw createServiceError('Không thể tự xóa tài khoản của chính mình', 400);
  }

  if (user.role === ROLES.ADMIN) {
    const adminCount = await userRepository.countByRole(ROLES.ADMIN);
    if (adminCount <= 1) {
      throw createServiceError('Không thể xóa admin cuối cùng', 400);
    }
  }

  await userRepository.deleteUser(userId);
  return { id: userId };
}

module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
  verifyOTP,
  verifyRegistration,
  updateProfile,
  getUsers,
  updateUserRole,
  deleteUser
};
