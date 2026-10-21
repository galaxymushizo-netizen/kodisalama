import {
  randomBytes,
  scrypt as scryptCb,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

/**
 * Password hashing for user accounts (Node.js runtime only — do NOT import
 * from middleware or edge code). Uses scrypt, the memory-hard KDF built into
 * Node's crypto module, with per-user random salts.
 *
 * Stored format:  scrypt$N$r$p$<saltHex>$<hashHex>
 */

const scrypt = promisify(scryptCb) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number }
) => Promise<Buffer>;

const N = 16384; // 2^14 — OWASP-recommended minimum for interactive auth
const R = 8;
const P = 1;
const KEYLEN = 64;
const MAXMEM = 64 * 1024 * 1024; // allow N=16384,r=8 to run comfortably

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, KEYLEN, { N, r: R, p: P, maxmem: MAXMEM });
  return `scrypt$${N}$${R}$${P}$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  try {
    const parts = stored.split("$");
    if (parts.length !== 6 || parts[0] !== "scrypt") return false;
    const n = Number.parseInt(parts[1], 10);
    const r = Number.parseInt(parts[2], 10);
    const p = Number.parseInt(parts[3], 10);
    if (!Number.isFinite(n) || !Number.isFinite(r) || !Number.isFinite(p)) return false;
    const salt = Buffer.from(parts[4], "hex");
    const expected = Buffer.from(parts[5], "hex");
    if (salt.length === 0 || expected.length === 0) return false;
    const actual = await scrypt(password, salt, expected.length, {
      N: n,
      r,
      p,
      maxmem: MAXMEM,
    });
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/**
 * Constant-time dummy hash check used when an email does not exist, so login
 * timing does not reveal which emails are registered.
 */
const DUMMY_HASH =
  "scrypt$16384$8$1$00000000000000000000000000000000$" + "ab".repeat(64);

export async function fakeVerify(): Promise<void> {
  try {
    await verifyPassword("timing-equalizer", DUMMY_HASH);
  } catch {
    /* ignore */
  }
}
