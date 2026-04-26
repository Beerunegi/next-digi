import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const CMS_COOKIE_NAME = 'digiwebtech_admin_session';
const cookieMaxAge = 60 * 60 * 12;

function getConfiguredAdminUsername() {
  return process.env.CMS_ADMIN_USERNAME || process.env.CMS_USERNAME;
}

function getConfiguredAdminPasswordHash() {
  return process.env.CMS_ADMIN_PASSWORD_HASH;
}

function getConfiguredAdminPassword() {
  return process.env.CMS_PASSWORD;
}

function getJwtSecret() {
  const secret = process.env.CMS_JWT_SECRET || process.env.SESSION_SECRET;

  if (!secret) {
    throw new Error('CMS session secret is not configured.');
  }

  return new TextEncoder().encode(secret);
}

function comparePlainTextPassword(input, expected) {
  const inputBuffer = Buffer.from(String(input || ''));
  const expectedBuffer = Buffer.from(String(expected || ''));

  if (inputBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(inputBuffer, expectedBuffer);
}

async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload;
  } catch {
    return null;
  }
}

export async function validateAdminCredentials(username, password) {
  const expectedUsername = getConfiguredAdminUsername();
  const expectedHash = getConfiguredAdminPasswordHash();
  const expectedPassword = getConfiguredAdminPassword();

  if (!expectedUsername || (!expectedHash && !expectedPassword)) {
    throw new Error('CMS admin credentials are not configured.');
  }

  if (username !== expectedUsername) {
    return false;
  }

  if (expectedHash) {
    return bcrypt.compare(password, expectedHash);
  }

  return comparePlainTextPassword(password, expectedPassword);
}

export async function createAdminSession(username) {
  return new SignJWT({ sub: username, role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${cookieMaxAge}s`)
    .sign(getJwtSecret());
}

export async function getAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(CMS_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return verifyToken(token);
}

export async function requireAdminPageSession() {
  const session = await getAdminSession();

  if (!session) {
    redirect('/admin/login');
  }

  return session;
}

export async function verifyAdminRequest(request) {
  const token = request.cookies.get(CMS_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return verifyToken(token);
}

export function getAdminCookieName() {
  return CMS_COOKIE_NAME;
}

export function getAdminCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: cookieMaxAge,
  };
}
