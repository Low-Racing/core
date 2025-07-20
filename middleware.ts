import { withAuth } from "next-auth/middleware"

export default withAuth(
  function middleware(req) {
    // Middleware adicional se necessário
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Proteger rotas /admin
        if (req.nextUrl.pathname.startsWith('/admin')) {
          return !!token
        }
        return true
      },
    },
  }
)

export const config = {
  matcher: [
    "/((?!.*\\..*|_next).*)", 
    "/", 
    "/(api|trpc)(.*)",
    "/admin/:path*" // Proteger todas as rotas admin
  ],
}
