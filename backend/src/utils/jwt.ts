import jwt from 'jsonwebtoken';
import { COURSE_DEFAULTS } from '../config/defaults';

const SECRET = process.env.JWT_SECRET || COURSE_DEFAULTS.JWT_SECRET_FALLBACK;

export const generateToken = (userId: string) => {
    return jwt.sign({ id: userId }, SECRET, { expiresIn: '7d' });
};

export const verifyToken = (token: string) => {
    return jwt.verify(token, SECRET);
};
