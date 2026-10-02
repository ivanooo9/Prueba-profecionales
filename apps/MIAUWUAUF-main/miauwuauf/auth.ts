import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import prisma from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { DefaultSession } from "next-auth"

// Eliminamos la clase personalizada que parece no estar pasando el código al cliente correctamente en esta versión


declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role?: string
      phone?: string
      cedula?: string
      isActive?: boolean
    } & DefaultSession["user"]
  }

  interface User {
    id?: string
    role?: string
    phone?: string | null
    cedula?: string | null
    isActive?: boolean
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        
        const user = await prisma.user.findUnique({
          where: { email: (credentials.email as string).toLowerCase() }
        })
        if (!user || !user.password) return null
        
        if (user.isActive === false) {
          throw new Error("inactive_account");
        }
        
        const isPasswordCorrect = await bcrypt.compare(
          credentials.password as string,
          user.password
        )
        
        if (!isPasswordCorrect) return null
        
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          phone: user.phone,
          cedula: user.cedula,
          isActive: user.isActive
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.id = user.id
        token.phone = user.phone
        token.cedula = user.cedula
        token.isActive = user.isActive
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string | undefined
        session.user.id = token.id as string
        session.user.phone = token.phone as string | undefined
        session.user.cedula = token.cedula as string | undefined
        session.user.isActive = token.isActive as boolean | undefined
      }
      return session
    }
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
})
