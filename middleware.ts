
import { NextResponse } from "next/server";


// Middleware removido: não há autenticação global. Apenas permite todas as rotas normalmente.

export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
