import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("Creating test users...")

  const adminPassword = await bcrypt.hash("Admin123*", 10)
  const clientPassword = await bcrypt.hash("Cliente123*", 10)

  // 1. Create or Update Admin User
  let admin = await prisma.user.findFirst({ where: { email: "admin@miauwuauf.com" } })
  if (admin) {
    admin = await prisma.user.update({
      where: { id: admin.id },
      data: {
        password: adminPassword,
        role: "admin",
        isActive: true,
      },
    })
  } else {
    admin = await prisma.user.create({
      data: {
        name: "Administrador MIAUWUAUF",
        email: "admin@miauwuauf.com",
        password: adminPassword,
        role: "admin",
        phone: "0999999999",
        cedula: "1700000001",
        isActive: true,
      },
    })
  }

  console.log("✅ Usuario Admin listo:")
  console.log(`   Email: ${admin.email}`)
  console.log(`   Password: Admin123*`)
  console.log(`   Rol: ${admin.role}`)

  // 2. Create or Update Client (Usuario) User
  let cliente = await prisma.user.findFirst({ where: { email: "cliente@miauwuauf.com" } })
  if (cliente) {
    cliente = await prisma.user.update({
      where: { id: cliente.id },
      data: {
        password: clientPassword,
        role: "usuario",
        isActive: true,
      },
    })
  } else {
    cliente = await prisma.user.create({
      data: {
        name: "Cliente de Prueba",
        email: "cliente@miauwuauf.com",
        password: clientPassword,
        role: "usuario",
        phone: "0988888888",
        cedula: "1700000002",
        isActive: true,
      },
    })
  }

  console.log("✅ Usuario Cliente listo:")
  console.log(`   Email: ${cliente.email}`)
  console.log(`   Password: Cliente123*`)
  console.log(`   Rol: ${cliente.role}`)
}

main()
  .catch((e) => {
    console.error("❌ Error al crear usuarios:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
