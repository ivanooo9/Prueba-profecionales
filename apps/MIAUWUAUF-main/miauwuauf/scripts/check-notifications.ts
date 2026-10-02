import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  const notifications = await prisma.notification.findMany({
    take: 10,
    orderBy: { createdAt: "desc" },
  })

  console.log("Latest Notifications:")
  notifications.forEach(n => {
    console.log(`[${n.createdAt.toISOString()}] ID: ${n.id}, User: ${n.userId}, Title: ${n.title}, Message: ${n.message}`)
  })
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
