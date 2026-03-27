import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function parseAllowedOrigins(): string[] {
  const raw = process.env.CORS_ALLOWED_ORIGINS?.trim() ?? "";
  if (raw.length > 0) {
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
  return [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "capacitor://localhost",
    "ionic://localhost",
    "https://localhost",
  ];
}

function withCors(request: NextRequest, response: NextResponse): NextResponse {
  const origin = request.headers.get("origin");
  const allowed = parseAllowedOrigins();
  if (origin !== null && allowed.includes(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.append("Vary", "Origin");
  } else if (allowed.includes("*")) {
    response.headers.set("Access-Control-Allow-Origin", "*");
  }
  response.headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Auth-Return-Redirect, X-Requested-With",
  );
  response.headers.set("Access-Control-Allow-Credentials", "true");
  return response;
}

export function middleware(request: NextRequest): NextResponse {
  if (!request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  if (request.method === "OPTIONS") {
    return withCors(request, new NextResponse(null, { status: 204 }));
  }

  return withCors(request, NextResponse.next());
}

export const config = {
  matcher: "/api/:path*",
};
