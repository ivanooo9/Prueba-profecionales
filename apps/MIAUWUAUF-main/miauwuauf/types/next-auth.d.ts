import { DefaultSession } from "next-auth"

declare module "next-auth" {
  /**
   * Extended session user with all custom fields added via the session callback.
   * This avoids needing `as any` or local `ExtendedUser` interfaces across API routes.
   */
  interface Session {
    user: {
      id: string
      role?: string | null
      phone?: string | null
      cedula?: string | null
    } & DefaultSession["user"]
  }

  interface User {
    id?: string
    role?: string | null
    phone?: string | null
    cedula?: string | null
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string | null
    role?: string | null
    phone?: string | null
    cedula?: string | null
  }
}
