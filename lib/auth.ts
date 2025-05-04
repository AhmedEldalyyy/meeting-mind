import { compare, hash } from "bcrypt";
import { createToken, verifyToken, getAuthToken } from "./jwt";
import { prisma } from "./prisma";

export async function hashPassword(password: string): Promise<string> {
  return hash(password, 10);
}

export async function comparePasswords(
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> {
  return compare(plainPassword, hashedPassword);
}

// Re-export JWT functions for backward compatibility
export { createToken, verifyToken };

export async function getCurrentUser() {
  const token = getAuthToken();
  if (!token) return null;
  
  const payload = await verifyToken(token);
  if (!payload || !payload.id) return null;

  // Optionally fetch fresh user data from the database
  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });
    return user;
  } catch (error) {
    console.error("Error fetching current user:", error);
    return payload; // Fallback to token payload if DB query fails
  }
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