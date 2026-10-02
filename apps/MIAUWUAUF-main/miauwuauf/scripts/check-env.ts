import fs from 'fs'
import path from 'path'

const envPath = path.join(process.cwd(), '.env')
if (!fs.existsSync(envPath)) {
  console.log(".env file does not exist.")
  process.exit(1)
}

const envContent = fs.readFileSync(envPath, 'utf8')
const lines = envContent.split('\n')

const requiredKeys = ['DATABASE_URL', 'NEXTAUTH_SECRET', 'CLOUDINARY_API_KEY', 'EMAIL_USER', 'EMAIL_PASS', 'SMTP_USER', 'SMTP_PASS']

console.log("Checking .env configuration (keys only):")
requiredKeys.forEach(key => {
  const line = lines.find(l => l.startsWith(`${key}=`))
  if (line) {
    const value = line.split('=')[1].trim().replace(/['"]/g, '')
    if (value && value.length > 0) {
      console.log(`[OK] ${key} is present and not empty.`)
    } else {
      console.log(`[WARNING] ${key} is present but EMPTY.`)
    }
  } else {
    // Check if there are fallbacks
    if (key === 'SMTP_USER' || key === 'SMTP_PASS') {
      const fallback = key === 'SMTP_USER' ? 'EMAIL_USER' : 'EMAIL_PASS'
      if (lines.find(l => l.startsWith(`${fallback}=`))) {
         console.log(`[OK] ${key} is missing, but ${fallback} is found (fallback supported).`)
      } else {
         console.log(`[MISSING] ${key} and its fallback are missing!`)
      }
    } else if (key !== 'EMAIL_USER' && key !== 'EMAIL_PASS') {
      console.log(`[MISSING] ${key} is missing!`)
    }
  }
})
