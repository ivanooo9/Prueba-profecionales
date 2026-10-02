const { v2: cloudinary } = require("cloudinary");
const https = require("https");
const { PrismaClient } = require("@prisma/client");

const db = new PrismaClient();

async function fixTerryPdf() {
  try {
    const config = await db.systemConfig.findFirst();
    cloudinary.config({
      cloud_name: config.cloudinaryCloudName,
      api_key: config.cloudinaryApiKey,
      api_secret: config.cloudinaryApiSecret,
      secure: true
    });

    // 1. Find speaker Terry Alexander Mendieta Guachichulca
    const speaker = await db.conversatorioSpeaker.findFirst({
      where: {
        nombre: { contains: "Terry", mode: "insensitive" }
      }
    });

    if (!speaker) {
      console.log("Speaker Terry not found!");
      return;
    }

    console.log("Found Speaker:", speaker.id, speaker.nombre);
    console.log("Current Resources:", JSON.stringify(speaker.resources, null, 2));

    const oldUrl = "https://res.cloudinary.com/dnzkwg8qv/image/upload/v1785982741/profesionales-ecuador/conversatorios/recursos/w2hgz0cnugvjyts1efgz.pdf";

    // Download page 1 as high quality PDF/image or download asset
    // Cloudinary Admin API allows download_url or download_backedup_asset or transformation
    // Let's check if we can re-upload using cloudinary upload from page 1 or url:
    // Cloudinary allows uploading from a URL!
    console.log("Re-uploading PDF as raw from page 1 / transformation or URL...");
    
    // We can use Cloudinary's upload API with resource_type: "raw" fetching from Cloudinary image URL or page 1 format pdf
    const newRawResult = await cloudinary.uploader.upload(oldUrl, {
      folder: "profesionales-ecuador/conversatorios/recursos",
      resource_type: "raw"
    });

    console.log("New RAW URL:", newRawResult.secure_url);

    // Verify HTTP status of new RAW URL
    const checkStatus = await new Promise((resolve) => {
      https.get(newRawResult.secure_url, (res) => resolve(res.statusCode));
    });

    console.log("New RAW URL Status Code:", checkStatus);

    if (checkStatus === 200 && Array.isArray(speaker.resources)) {
      const updatedResources = speaker.resources.map(r => {
        if (r.url && (r.url.includes("w2hgz0cnugvjyts1efgz") || r.url === oldUrl)) {
          return { ...r, url: newRawResult.secure_url };
        }
        return r;
      });

      await db.conversatorioSpeaker.update({
        where: { id: speaker.id },
        data: { resources: updatedResources }
      });

      console.log("DB SUCCESSFULLY UPDATED FOR SPEAKER TERRY!");
    }

  } catch (err) {
    console.error("Error in fixTerryPdf:", err);
  } finally {
    await db.$disconnect();
  }
}

fixTerryPdf();
