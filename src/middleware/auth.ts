import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
// Geçici olarak rate limiting'i devre dışı bırakıyoruz
// import {
//   applyRateLimit,
//   RATE_LIMIT_CONFIGS,
//   keyGenerators,
//   createRateLimitHeaders,
//   rateLimiters
// } from '@/lib/rate-limiting'

const secret = process.env.NEXTAUTH_SECRET;

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(
  identifier: string,
  limit: number = 100,
  windowMs: number = 15 * 60 * 1000
): boolean {
  const now = Date.now();
  const key = `rate_limit:${identifier}`;
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count++;
  return true;
}

// Cleanup expired rate limit records
setInterval(() => {
  const now = Date.now();
  rateLimitStore.forEach((record, key) => {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  });
}, 5 * 60 * 1000); // Clean every 5 minutes

// GEÇICI OLARAK RATE LIMITING KODLARI KAPATILDI - MIDDLEWARE'İN ÇALIŞMASINI TEST EDİYORUZ
// Enhanced authentication and authorization validation for API routes with advanced rate limiting
export async function validateAuthAndRole(
  request: Request,
  allowedRoles: string[],
  options: {
    requireCompanyAccess?: boolean;
    companyId?: string;
    requireStudentAccess?: boolean;
    studentId?: string;
    endpoint?: "auth" | "file-upload" | "financial" | "messaging" | "search"; // Rate limiting endpoint type
  } = {}
): Promise<{
  success: boolean;
  error?: string;
  status?: number;
  headers?: Headers;
  user?: any;
}> {
  try {
    const nextRequest = request as NextRequest;

    // Get the token from the request
    const token = await getToken({
      req: nextRequest,
      secret,
      secureCookie: process.env.NODE_ENV === "production",
    });

    // RATE LIMITING GEÇICI OLARAK DEVRE DIŞI
    // const rateLimitResult = await checkAdvancedRateLimit(
    //   nextRequest,
    //   token as any,
    //   options.endpoint
    // )

    const rateLimitResult = { allowed: true, headers: new Headers() };

    // Check if user is authenticated
    if (!token) {
      console.warn(`🚨 AUTH: No token found for ${nextRequest.url}`, {
        ip: nextRequest.headers.get("x-forwarded-for") || "unknown",
        userAgent: nextRequest.headers.get("user-agent")?.substring(0, 100),
        timestamp: new Date().toISOString(),
      });

      return {
        success: false,
        error: "Authentication required",
        status: 401,
        headers: rateLimitResult.headers,
      };
    }

    // Check if user has required role
    const userRole = token.role as string;
    if (!allowedRoles.includes(userRole)) {
      console.warn(`🚨 AUTHORIZATION: Role access denied`, {
        requiredRoles: allowedRoles,
        userRole,
        userId: token.sub,
        endpoint: options.endpoint,
        timestamp: new Date().toISOString(),
      });

      return {
        success: false,
        error: `Access denied. Required roles: ${allowedRoles.join(
          ", "
        )}. Your role: ${userRole}`,
        status: 403,
        headers: rateLimitResult.headers,
      };
    }


    return {
      success: true,
      user: {
        id: token.sub,
        email: token.email,
        role: userRole,
        companyId: token.companyId,
        name: token.name,
      },
      headers: rateLimitResult.headers,
    };
  } catch (error) {
    console.error("🔥 Authentication validation error:", error);
    return {
      success: false,
      error: "Authentication service temporarily unavailable",
      status: 500,
    };
  }
}
