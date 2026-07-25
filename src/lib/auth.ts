import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

// Realtor session handling. A signed JWT in an httpOnly cookie identifies the
// logged-in agent. Kept deliberately small: agent id + agency id + role.

const COOKIE = "mm_session";
const ALG = "HS256";

function secret(): Uint8Array {
  const s =
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "dev-only-insecure-secret-change-me";
  return new TextEncoder().encode(s);
}

export type Session = {
  agentId: string;
  agencyId: string;
  role: string;
  name: string;
};

export async function createSession(payload: Session): Promise<string> {
  return await new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
}

export async function verifySession(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      agentId: String(payload.agentId),
      agencyId: String(payload.agencyId),
      role: String(payload.role),
      name: String(payload.name),
    };
  } catch {
    return null;
  }
}

// Read the current session from the request cookies (server components / routes).
export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

export const SESSION_COOKIE = COOKIE;
