import { NextResponse } from "next/server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

export function corsHeaders() {
  return CORS_HEADERS;
}

/** Handle OPTIONS preflight */
export function handleOptions() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/** Add CORS headers to a JSON response */
export function jsonResponse(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: CORS_HEADERS });
}

/** Error response with CORS */
export function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status, headers: CORS_HEADERS });
}
