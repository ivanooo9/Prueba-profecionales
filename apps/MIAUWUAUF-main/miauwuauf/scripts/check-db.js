
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: 'santiago2006xdd@gmail.com' }
  })
  
  const pet = await prisma.pet.findFirst({
    where: { nombre: 'Mochi' }
  })

  console.log('--- VERIFICACIÓN DE DATOS ---')
  console.log('Usuario encontrado:', user ? `${user.name} (${user.email})` : 'NO ENCONTRADO')
  console.log('Mascota encontrada:', pet ? `${pet.nombre} (${pet.raza})` : 'NO ENCONTRADA')
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
