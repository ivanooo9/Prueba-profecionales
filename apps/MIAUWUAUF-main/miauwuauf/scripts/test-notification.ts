import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  const userId = "69b878f35c28d216fae2b637" // Juan Diego's User ID from previous check
  
  console.log("Creating manual notification for testing...")
  const notification = await prisma.notification.create({
    data: {
      userId: userId,
      title: "Prueba Manual",
      message: "Esta es una notificación de prueba desde el script de debug.",
      type: "info",
      read: false
    }
  })

  console.log("Created Notification ID:", notification.id)
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
