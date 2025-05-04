import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export async function createToken(payload: any): Promise<string> {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key");
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1d")
    .sign(secret);
  
  return token;
}

export async function verifyToken(token: string): Promise<any> {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key");
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (error) {
    console.error("Token verification failed:", error);
    return null;
  }
}

export function setAuthCookie(token: string) {
  cookies().set({
    name: "auth_token",
    value: token,
    httpOnly: true,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24, // 1 day
    sameSite: "strict",
  });
}

export function clearAuthCookie() {
  cookies().delete("auth_token");
}

export function getAuthToken() {
  return cookies().get("auth_token")?.value;
}

export function getUserRole(user: any) {
  return user?.role || null;
}

export function isTeamLeader(user: any) {
  return user?.role === "TEAM_LEADER";
}

export function isTeamMember(user: any) {
  return user?.role === "TEAM_MEMBER";
} 