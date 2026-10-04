import { getAuth } from '@/server/auth';

// Better Auth endpoints (OAuth callback, session, sign-out, …).
export function GET(request: Request) {
  return getAuth().handler(request);
}

export function POST(request: Request) {
  return getAuth().handler(request);
}
