import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Simple shared-password protection so only your team can use the app (and your OpenAI credit).
// Set APP_PASSWORD in your hosting settings. Any username works; the password must match.
export function proxy(request: NextRequest) {
  const password = process.env.APP_PASSWORD;
  if (!password) return NextResponse.next();

  const header = request.headers.get("authorization") || "";
  if (header.startsWith("Basic ")) {
    try {
      const decoded = atob(header.slice(6));
      const given = decoded.slice(decoded.indexOf(":") + 1);
      if (given === password) return NextResponse.next();
    } catch {
      // fall through to the login prompt
    }
  }
  return new NextResponse("Please sign in to BOSS Flyer Studio.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="BOSS Flyer Studio", charset="UTF-8"' },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
