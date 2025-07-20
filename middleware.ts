import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    // Se chegou até aqui, o usuário está autenticado
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Se está tentando acessar /admin e não tem token
        if (req.nextUrl.pathname.startsWith('/admin')) {
          return !!token
        }
        // Para outras rotas, permite acesso
        return true
      },
    },
    pages: {
      signIn: '/login', // Usa sua página de login existente
    }
  }
)

export const config = {
  matcher: [
    "/((?!.*\\..*|_next).*)", 
    "/", 
    "/(api|trpc)(.*)",
    "/admin/:path*" // Proteger todas as rotas que começam com /admin
  ],
}
