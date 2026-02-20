import { Request, Response, NextFunction } from 'express';

/**
 * Validate Ethereum address format (0x + 40 hex chars, case-insensitive).
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Middleware that validates the `:address` route parameter.
 */
export function validateAddress(req: Request, res: Response, next: NextFunction) {
  // FIX: Express route params are always plain strings, never arrays.
  // The previous Array.isArray guard was dead code — removed.
  const address = req.params.address as string;

  if (!address) {
    return res.status(400).json({ error: 'Address parameter is required' });
  }

  if (!isValidAddress(address)) {
    return res.status(400).json({
      error: 'Invalid Ethereum address format',
      hint:  'Address must start with 0x followed by exactly 40 hex characters'
    });
  }

  next();
}

// ── Rate limiter ─────────────────────────────────────────────────────────────
// Simple in-memory implementation. For production use a Redis-backed solution
// (e.g. rate-limiter-flexible) so limits survive restarts and work across
// multiple instances.

interface RateLimitRecord {
  count:     number;
  resetTime: number;
}

const requestCounts = new Map<string, RateLimitRecord>();

// FIX: Periodically purge expired entries so the Map doesn't grow forever
// in long-running servers. Runs every 5 minutes.
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of requestCounts) {
    if (now > record.resetTime) {
      requestCounts.delete(ip);
    }
  }
}, 5 * 60 * 1000);

/**
 * Returns a middleware that limits each IP to `maxRequests` per `windowMs`.
 *
 * @param maxRequests - Maximum number of requests allowed in the window
 * @param windowMs    - Window length in milliseconds
 */
export function simpleRateLimit(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    // req.ip can be undefined in some Express v5 edge cases; fall back to socket
    const ip  = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const now = Date.now();

    const record = requestCounts.get(ip);

    if (!record || now > record.resetTime) {
      // Start a fresh window
      requestCounts.set(ip, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (record.count >= maxRequests) {
      return res.status(429).json({
        error:      'Too many requests',
        retryAfter: Math.ceil((record.resetTime - now) / 1000)
      });
    }

    record.count++;
    next();
  };
}