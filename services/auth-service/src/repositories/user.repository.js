const prisma = require('../config/db');

async function findByEmail(email) {
  return prisma.user.findUnique({
    where: { email }
  });
}

async function findById(id) {
  return prisma.user.findUnique({
    where: { id }
  });
}

async function createUser({ email, passwordHash, role = 'user', birthday, phoneNumber, fullName, otpCode, otpExpires, isVerified = false }) {
  return prisma.user.create({
    data: {
      email,
      fullName,
      passwordHash,
      role,
      birthday: birthday ? new Date(birthday) : null,
      phoneNumber,
      otpCode,
      otpExpires,
      isVerified
    }
  });
}

async function updateUser(id, data) {
  return prisma.user.update({
    where: { id },
    data
  });
}

async function findAll(where = {}) {
  return prisma.user.findMany({
    where,
    orderBy: { createdAt: 'desc' }
  });
}

async function countByRole(role) {
  return prisma.user.count({
    where: { role }
  });
}

async function deleteUser(id) {
  return prisma.user.delete({
    where: { id }
  });
}

module.exports = {
  findByEmail,
  findById,
  findAll,
  countByRole,
  deleteUser,
  createUser,
  updateUser
};
