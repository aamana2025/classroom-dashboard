import jwt from 'jsonwebtoken';

export const generateAccessToken = (user) => {
  return jwt.sign(
    { userId: user._id, email: user.email, status:user.status },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
};
