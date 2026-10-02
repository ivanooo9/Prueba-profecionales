
import { PrismaClient } from "@prisma/client"
import { generateSlug } from "../lib/slug"

const prisma = new PrismaClient()

async function main() {
  console.log("🚀 Starting slug migration...")

  // 1. Migrate BlogPosts
  const posts = await prisma.blogPost.findMany()
  console.log(`📝 Found ${posts.length} blog posts total.`)

  for (const post of posts) {
    if (!post.slug) {
      const slug = generateSlug(post.title)
      await prisma.blogPost.update({
        where: { id: post.id },
        data: { slug }
      })
      console.log(`✅ Updated post: "${post.title}" -> ${slug}`)
    }
  }

  // 2. Migrate Products
  const products = await prisma.product.findMany()
  console.log(`🛒 Found ${products.length} products total.`)

  for (const product of products) {
    if (!product.slug) {
      const slug = generateSlug(product.nombre)
      await prisma.product.update({
        where: { id: product.id },
        data: { slug }
      })
      console.log(`✅ Updated product: "${product.nombre}" -> ${slug}`)
    }
  }

  console.log("✨ Migration finished!")
}

main()
  .catch((e) => {
    console.error("❌ Migration failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
