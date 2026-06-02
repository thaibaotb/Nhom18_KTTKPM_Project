const authService = require('../services/auth.service');
const { signToken } = require('../config/jwt');

async function register(req, res, next) {
  try {
    const { email, password, birthday, phoneNumber, fullName } = req.body;
    const user = await authService.register(email, password, birthday, phoneNumber, fullName);

    return res.status(201).json({
      success: true,
      message: 'Mã xác thực đã được gửi đến email của bạn. Vui lòng xác thực để hoàn tất đăng ký.',
      data: user
    });
  } catch (error) {
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await authService.login(email, password);
    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    return res.status(200).json({
      success: true,
      data: {
        token,
        user
      }
    });
  } catch (error) {
    return next(error);
  }
}

function me(req, res) {
  return res.status(200).json({
    success: true,
    data: req.user
  });
}

async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    await authService.forgotPassword(email);
    return res.status(200).json({
      success: true,
      message: 'Mã OTP đã được gửi đến email của bạn'
    });
  } catch (error) {
    return next(error);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { email, otp, newPassword } = req.body;
    await authService.resetPassword(email, otp, newPassword);
    return res.status(200).json({
      success: true,
      message: 'Mật khẩu đã được đặt lại thành công'
    });
  } catch (error) {
    return next(error);
  }
}

async function verifyOTP(req, res, next) {
  try {
    const { email, otp } = req.body;
    await authService.verifyOTP(email, otp);
    return res.status(200).json({
      success: true,
      message: 'Mã OTP chính xác'
    });
  } catch (error) {
    return next(error);
  }
}

async function verifyRegistration(req, res, next) {
  try {
    const { email, otp } = req.body;
    await authService.verifyRegistration(email, otp);
    return res.status(200).json({
      success: true,
      message: 'Xác thực tài khoản thành công! Bây giờ bạn có thể đăng nhập.'
    });
  } catch (error) {
    return next(error);
  }
}

async function updateMe(req, res, next) {
  try {
    const userId = req.user.userId;
    const { fullName, birthday, password, oldPassword, phoneNumber } = req.body;
    const user = await authService.updateProfile(userId, { fullName, birthday, password, oldPassword, phoneNumber });
    
    return res.status(200).json({
      success: true,
      message: 'Cập nhật thông tin thành công',
      data: user
    });
  } catch (error) {
    return next(error);
  }
}

async function getUsers(req, res, next) {
  try {
    const { role } = req.query;
    const users = await authService.getUsers(role);
    return res.status(200).json({
      success: true,
      data: users
    });
  } catch (error) {
    return next(error);
  }
}

async function updateUserRole(req, res, next) {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const user = await authService.updateUserRole(req.user, id, role);
    return res.status(200).json({
      success: true,
      message: 'Cập nhật role thành công',
      data: user
    });
  } catch (error) {
    return next(error);
  }
}

async function deleteUser(req, res, next) {
  try {
    const { id } = req.params;
    const result = await authService.deleteUser(req.user, id);
    return res.status(200).json({
      success: true,
      message: 'Xóa tài khoản thành công',
      data: result
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  register,
  login,
  me,
  forgotPassword,
  resetPassword,
  verifyOTP,
  verifyRegistration,
  updateMe,
  getUsers,
  updateUserRole,
  deleteUser
};
