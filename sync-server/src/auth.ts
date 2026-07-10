// auth.ts — JWT auth middleware + token utilities
import type { FastifyRequest, FastifyReply } from "fastify"
import { SignJWT, jwtVerify, type JWTPayload } from "jose"

const ALG = "HS256"

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error("JWT_SECRET not set")
  return new TextEncoder().encode(secret)
}

export interface AuthPayload extends JWTPayload {
  sub: string    // user ID
  did?: string   // device ID
}

export async function signAccess(userId: string, deviceId?: string, ttl = "1h"): Promise<string> {
  const key = getJwtSecret()
  const jwt = new SignJWT({ sub: userId, did: deviceId })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(ttl)
    .sign(key)
  return jwt
}

export async function signRefresh(userId: string, deviceId?: string, ttl = "30d"): Promise<string> {
  const key = getJwtSecret()
  const jwt = new SignJWT({ sub: userId, did: deviceId, type: "refresh" })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(ttl)
    .sign(key)
  return jwt
}

export async function verifyToken(token: string): Promise<AuthPayload> {
  const key = getJwtSecret()
  const { payload } = await jwtVerify(token, key, { algorithms: [ALG] })
  return payload as AuthPayload
}

// Fastify preHandler hook — sets req.user
export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  const auth = req.headers.authorization
  if (!auth?.startsWith("Bearer ")) {
    return reply.status(401).send({ error: "missing or invalid authorization header" })
  }
  try {
    const payload = await verifyToken(auth.slice(7))
    ;(req as any).user = { sub: payload.sub, did: payload.did }
  } catch {
    return reply.status(401).send({ error: "invalid or expired token" })
  }
}
