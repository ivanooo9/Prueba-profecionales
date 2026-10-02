import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding plans...')
  
  // Clear existing items if any (optional, but safer for a clean start)
  await prisma.plan.deleteMany({})

  const plans = [
    {
      name: "Plan Básico",
      price: "$29.99",
      description: "Rastreo esencial en tiempo real para tu tranquilidad.",
      features: ["GPS en tiempo real", "Historial de 24 horas", "Zona segura básica"],
      badge: "ESENCIAL",
      color: "bg-amber-100", // Matches the soft orange in the screenshot
    },
    {
      name: "Plan Estándar",
      price: "$49.99",
      description: "Monitoreo avanzado con alertas de salud.",
      features: ["Todo del Básico", "Monitoreo de actividad", "Alertas de salud", "Historial de 7 días"],
      badge: "POPULAR",
      color: "bg-red-100", // Matches the soft red/coral
    },
    {
      name: "Plan Premium",
      price: "$79.99",
      description: "Protección total con cobertura veterinaria.",
      features: ["Todo del Estándar", "Consulta vet online", "Seguro de accidentes", "Cobertura nacional"],
      badge: "RECOMENDADO",
      color: "bg-green-100", // Matches the soft green
    },
    {
      name: "Plan Elite",
      price: "$99.99",
      description: "La máxima experiencia para tu mascota.",
      features: ["Todo del Premium", "Entrenador personal", "Kit de bienvenida", "Soporte VIP 24/7"],
      badge: "EXCLUSIVO",
      color: "bg-amber-100", // Matches the soft gold
    },
  ]

  for (const plan of plans) {
    await prisma.plan.create({
      data: plan
    })
  }

  console.log('Seed completed successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
