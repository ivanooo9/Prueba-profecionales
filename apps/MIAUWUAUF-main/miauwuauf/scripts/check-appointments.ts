import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  const appointments = await prisma.appointment.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: {
      pet: true
    }
  })

  console.log("Latest Appointments:")
  appointments.forEach(app => {
    console.log(`ID: ${app.id}, Pet: ${app.mascota}, PetID: ${app.petId}, Owner: ${app.dueno}`)
  })
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
