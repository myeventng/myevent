// lib/bcrypt.ts
import * as bcrypt from 'bcryptjs';

export const hashPassword = async (password: string) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

// Updated to match better-auth's expected signature
export const verifyPassword = async (data: {
  hash: string;
  password: string;
}) => {
  return bcrypt.compare(data.password, data.hash);
};
