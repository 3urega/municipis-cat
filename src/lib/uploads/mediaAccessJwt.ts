import { SignJWT, jwtVerify } from "jose";

import { getAuthSecretKey } from "@/lib/auth/jwt";

const ALG = "HS256";
const PURPOSE = "media";

export type MediaAccessClaims = {
  mediaId: string;
  userId: string;
};

export async function signMediaAccessToken(
  mediaId: string,
  userId: string,
): Promise<string> {
  const key = getAuthSecretKey();
  return new SignJWT({ pur: PURPOSE, mid: mediaId })
    .setProtectedHeader({ alg: ALG })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(key);
}

export async function verifyMediaAccessToken(
  token: string,
): Promise<MediaAccessClaims | null> {
  try {
    const key = getAuthSecretKey();
    const { payload } = await jwtVerify(token, key, { algorithms: [ALG] });
    if (payload.pur !== PURPOSE) {
      return null;
    }
    const mid = typeof payload.mid === "string" ? payload.mid : "";
    const sub = typeof payload.sub === "string" ? payload.sub : "";
    if (mid.length === 0 || sub.length === 0) {
      return null;
    }
    return { mediaId: mid, userId: sub };
  } catch {
    return null;
  }
}
