const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // Clear existing tech features to avoid duplicates
  await prisma.techFeature.deleteMany({})

  const features = [
    {
      title: "App Integrada",
      description: "Monitorea a tu mascota desde tu smartphone en tiempo real",
      iconName: "Smartphone",
      color: "text-[#f5d393]", // Slightly muted golden yellow/orange
      bg: "bg-[#f5d393]/20",
      order: 0
    },
    {
      title: "Código QR",
      description: "Cualquiera puede escanear el código y alertar si tu mascota se pierde",
      iconName: "QrCode",
      color: "text-[#f9c4b4]", // Soft terracotta/coral red
      bg: "bg-[#f9c4b4]/30",
      order: 1
    },
    {
      title: "Dashboard Veterinario",
      description: "Los veterinarios pueden ver el historial y ubicación de tu mascota",
      iconName: "Activity",
      color: "text-[#bbd8b3]", // Pale sage green
      bg: "bg-[#bbd8b3]/30",
      order: 2
    }
  ]

  for (const feature of features) {
    await prisma.techFeature.create({
      data: feature
    })
  }

  console.log(" Features added successfully!")
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
