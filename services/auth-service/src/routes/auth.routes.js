const router = require('express').Router();
const authRequired = require('../middlewares/authRequired');
const requireRole = require('../middlewares/requireRole');
const { 
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
} = require('../controllers/auth.controller');

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOTP);
router.post('/reset-password', resetPassword);
router.post('/verify-registration', verifyRegistration);
router.get('/me', authRequired, me);
router.patch('/me', authRequired, updateMe);
router.get('/users', authRequired, requireRole('admin'), getUsers);
router.patch('/users/:id/role', authRequired, requireRole('admin'), updateUserRole);
router.delete('/users/:id', authRequired, requireRole('admin'), deleteUser);

module.exports = router;
