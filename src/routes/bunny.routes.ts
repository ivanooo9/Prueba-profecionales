import express, { Request, Response } from "express";
import crypto from "crypto";
import { requireAdmin } from "../lib/middlewares";

const router = express.Router();

router.get("/api/videos/bunny-signature", requireAdmin, async (req: Request, res: Response) => {
  try {
    const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID;
    const apiKey = process.env.BUNNY_STREAM_API_KEY;

    if (!libraryId || !apiKey) {
      return res.status(500).json({ success: false, error: "Falta configuración de Bunny Stream en el servidor." });
    }

    // Bunny Stream Authentication Signature for Tus
    // Required fields: Library ID, Video ID (empty for new video creation), Expiration time
    
    // First, create the video object in Bunny Stream
    const createResponse = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos`, {
      method: "POST",
      headers: {
        "AccessKey": apiKey,
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        title: "Video Subido (" + new Date().toLocaleString() + ")"
      })
    });

    if (!createResponse.ok) {
      return res.status(500).json({ success: false, error: "Error al crear objeto de video en Bunny Stream." });
    }

    const videoData = await createResponse.json();
    const videoId = videoData.guid;

    // Generate Signature for Tus Direct Upload
    const expirationTime = Math.floor(Date.now() / 1000) + (60 * 60); // 1 hour expiration
    const signatureString = `${libraryId}${apiKey}${expirationTime}${videoId}`;
    const signature = crypto.createHash('sha256').update(signatureString).digest('hex');

    return res.json({
      success: true,
      libraryId,
      videoId,
      expirationTime,
      signature
    });

  } catch (error) {
    console.error("Error generating Bunny Stream signature:", error);
    return res.status(500).json({ success: false, error: "Error interno del servidor." });
  }
});

export default router;
