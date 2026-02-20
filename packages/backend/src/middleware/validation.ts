import { Request, Response, NextFunction } from 'express';

/**
 * Validates Ethereum address format
 */
export function isValidAddress(address: string): boolean {
  // Check if it's a hex string starting with 0x and 40 characters long
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Middleware to validate address parameter
 */
export function validateAddress(req: Request, res: Response, next: NextFunction) {
  const address = req.params.address;
  
  if (!address) {
    return res.status(400).json({ error: 'Address parameter is required' });
  }
  
  const addressString = Array.isArray(address) ? address[0] : address;
  
  if (!isValidAddress(addressString)) {
    return res.status(400).json({ 
      error: 'Invalid Ethereum address format',
      hint: 'Address must be 0x followed by 40 hex characters'
    });
  }
  
  next();
}

/**
 * Rate limiting helper (simple in-memory implementation)
 * For production, use redis-based rate limiting
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function simpleRateLimit(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || 'unknown';
    const now = Date.now();
    
    const record = requestCounts.get(ip);
    
    if (!record || now > record.resetTime) {
      // New window
      requestCounts.set(ip, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    if (record.count >= maxRequests) {
      return res.status(429).json({ 
        error: 'Too many requests',
        retryAfter: Math.ceil((record.resetTime - now) / 1000)
      });
    }
    
    record.count++;
    next();
  };
}
