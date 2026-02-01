import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'secret';

export const generateToken = (userId: string) => {
    return jwt.sign({ id: userId }, SECRET, { expiresIn: '7d' });
};

export const verifyToken = (token: string) => {
    return jwt.verify(token, SECRET);
};
