import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'ever-fit-jwt-secret-change-in-production';

export interface AuthPayload {
  userId: number;
  role: string;
  name: string;
}

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

// ── Verify JWT token ─────────────────────────────────────────────────────
export const verifyToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Access denied. No token provided.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

// ── Require specific role(s) ──────────────────────────────────────────────
export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated.' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: `Access denied. Required role: ${roles.join(' or ')}` });
      return;
    }
    next();
  };
};

export const getJwtSecret = () => JWT_SECRET;