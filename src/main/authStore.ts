// authStore.ts — Persist sync auth tokens in userData/sync-auth.json
import { app } from "electron"
import fs from "fs"
import path from "path"

interface AuthData {
  accessToken: string
  refreshToken: string
  userId: string
  deviceId: string
}

function getAuthPath(): string {
  return path.join(app.getPath("userData"), "sync-auth.json")
}

export function loadAuth(): AuthData | null {
  try {
    const raw = fs.readFileSync(getAuthPath(), "utf-8")
    const data = JSON.parse(raw)
    if (data.accessToken && data.refreshToken && data.userId && data.deviceId) {
      return data
    }
  } catch {}
  return null
}

export function saveAuth(data: AuthData): void {
  fs.writeFileSync(getAuthPath(), JSON.stringify(data, null, 2), "utf-8")
}

export function clearAuth(): void {
  try {
    fs.unlinkSync(getAuthPath())
  } catch {}
}

export function getAuthSyncUrl(): string {
  return process.env.SYNC_URL || "http://127.0.0.1:8787"
}

export type { AuthData }
