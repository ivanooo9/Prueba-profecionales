import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  const pets = await prisma.pet.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: {
      user: true
    }
  })

  console.log("Latest Pets:")
  pets.forEach(pet => {
    console.log(`PetID: ${pet.id}, Name: ${pet.nombre}, OwnerID: ${pet.userId}, OwnerEmail: ${pet.user?.email}`)
  })
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
