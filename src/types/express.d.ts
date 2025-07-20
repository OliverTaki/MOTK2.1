import 'express';

declare global {
  namespace Express {
    interface User {
      role?: string;
    }
  }