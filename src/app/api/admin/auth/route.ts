import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function normalizePassword(value: string) {
  const trimmed = value.trim();
  if (trimmed.length >= 2) {
    const first = trimmed[0];
    const last = trimmed[trimmed.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return trimmed.slice(1, -1);
    }
  }
  return trimmed;
}

function passwordFromAuthorizationHeader(headerValue: string | null) {
  if (!headerValue) return null;
  const trimmed = headerValue.trim();
  if (!trimmed) return null;
  if (/^bearer\s+/i.test(trimmed)) return trimmed.slice(7).trim();
  return trimmed;
}

function isAuthorized(providedPassword: string | null) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  if (!providedPassword) return false;
  return normalizePassword(providedPassword) === normalizePassword(expected);
}

export async function POST(req: NextRequest) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return NextResponse.json({ error: "Server misconfigured: ADMIN_PASSWORD is not set" }, { status: 500 });
  }

  const headerPassword = passwordFromAuthorizationHeader(req.headers.get("authorization"));
  if (headerPassword && isAuthorized(headerPassword)) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const body = await req.json().catch(() => null);
  const bodyPassword = body && typeof body.password === "string" ? body.password : null;
  if (!isAuthorized(bodyPassword)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
