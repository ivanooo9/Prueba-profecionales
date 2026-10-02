import express, { Request, Response } from "express";
import { db } from "../lib/db";
import { parseYouTubeVideoId } from "../lib/video";

const router = express.Router();

const VIDEO_SOURCE_TYPE = {
  COURSE: "course",
  COURSE_LESSON: "course-lesson",
  CONVERSATORIO: "conversatorio",
  CONVERSATORIO_SPEAKER: "conversatorio-speaker",
  COURSE_SPEAKER: "course-speaker",
} as const;

type VideoSourceType = (typeof VIDEO_SOURCE_TYPE)[keyof typeof VIDEO_SOURCE_TYPE];

interface AuthenticatedRole {
  name?: string | null;
}

interface AuthenticatedUser {
  id: number;
  role?: AuthenticatedRole | null;
}

interface CourseAccessTarget {
  id: number;
  gratuito: boolean;
}

interface ConversatorioAccessTarget {
  id: number;
  gratuito: boolean;
  estado: string;
}

function getLocalUser(res: Response): AuthenticatedUser | null {
  const maybeUser = res.locals.user as AuthenticatedUser | null | undefined;
  return maybeUser || null;
}

function isAdmin(user: AuthenticatedUser | null): boolean {
  return user?.role?.name === "ADMIN";
}

function parsePositiveInteger(rawValue: string | undefined): number | null {
  const parsed = Number.parseInt(rawValue || "", 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function firstRouteParam(rawValue: string | string[] | undefined): string {
  if (Array.isArray(rawValue)) {
    return rawValue[0] || "";
  }

  return rawValue || "";
}

function isKnownSourceType(sourceType: string): sourceType is VideoSourceType {
  return Object.values(VIDEO_SOURCE_TYPE).includes(sourceType as VideoSourceType);
}

async function hasCourseAccess(user: AuthenticatedUser | null, curso: CourseAccessTarget): Promise<boolean> {
  if (isAdmin(user)) {
    return true;
  }

  if (!user) {
    return false;
  }

  const enrollment = await db.eventEnrollment.findFirst({
    where: { userId: user.id, cursoId: curso.id },
    select: { id: true },
  });

  if (!enrollment) {
    return false;
  }

  if (curso.gratuito) {
    return true;
  }

  const certificate = await db.certificate.findFirst({
    where: {
      userId: user.id,
      cursoId: curso.id,
      estado: "APROBADO",
    },
    select: { id: true },
  });

  return !!certificate;
}

async function hasConversatorioVideoAccess(
  user: AuthenticatedUser | null,
  conversatorio: ConversatorioAccessTarget,
  speakerIsFree: boolean
): Promise<boolean> {
  if (isAdmin(user) || conversatorio.gratuito || speakerIsFree) {
    return true;
  }

  if (!user) {
    return false;
  }

  if (conversatorio.estado !== "ACTIVO" && conversatorio.estado !== "FINALIZADO") {
    return false;
  }

  const [certificate, enrollment] = await Promise.all([
    db.certificate.findFirst({
      where: {
        userId: user.id,
        conversatorioId: conversatorio.id,
        estado: "APROBADO",
      },
      select: { id: true },
    }),
    db.eventEnrollment.findFirst({
      where: {
        userId: user.id,
        conversatorioId: conversatorio.id,
      },
      select: { id: true },
    }),
  ]);

  return !!certificate || !!enrollment;
}

function sendVideoId(res: Response, storedVideoUrl: string | null | undefined, hasFullAccess = false) {
  const videoId = parseYouTubeVideoId(storedVideoUrl);
  res.setHeader("Cache-Control", "private, no-store");

  if (!videoId) {
    return res.status(422).json({
      success: false,
      error: "Este recurso de video no es compatible con el reproductor interno.",
    });
  }

  return res.json({
    success: true,
    provider: "youtube",
    videoId,
    hasFullAccess,
    playerVars: {
      controls: 0,
      rel: 0,
      modestbranding: 1,
      playsinline: 1,
    },
  });
}

function sendBunnyVideoId(res: Response, videoId: string | null | undefined, hasFullAccess = false) {
  res.setHeader("Cache-Control", "private, no-store");
  
  if (!videoId) {
    return res.status(422).json({
      success: false,
      error: "Este recurso de video no es compatible.",
    });
  }

  return res.json({
    success: true,
    provider: "bunny",
    videoId,
    hasFullAccess,
    libraryId: process.env.BUNNY_STREAM_LIBRARY_ID,
  });
}

router.get("/api/videos/:sourceType/:sourceId", async (req: Request, res: Response) => {
  const sourceType = firstRouteParam(req.params.sourceType);
  const sourceId = parsePositiveInteger(firstRouteParam(req.params.sourceId));
  const user = getLocalUser(res);

  if (!isKnownSourceType(sourceType) || !sourceId) {
    return res.status(400).json({ success: false, error: "Solicitud de video inválida." });
  }

  try {
    if (sourceType === VIDEO_SOURCE_TYPE.COURSE) {
      const curso = await db.curso.findUnique({
        where: { id: sourceId },
        select: { id: true, estado: true, youtube: true, mediaUrl: true, mediaType: true, bunnyVideoId: true },
      });

      if (!curso || (curso.estado !== "ACTIVO" && !isAdmin(user))) {
        return res.status(404).json({ success: false, error: "Video no encontrado." });
      }

      if (curso.bunnyVideoId) return sendBunnyVideoId(res, curso.bunnyVideoId);

      return sendVideoId(res, curso.mediaType === "video" ? curso.mediaUrl || curso.youtube : curso.youtube);
    }

    if (sourceType === VIDEO_SOURCE_TYPE.COURSE_LESSON) {
      const lesson = await db.cursoLesson.findUnique({
        where: { id: sourceId },
        select: {
          videoUrl: true,
          bunnyVideoId: true,
          module: {
            select: {
              curso: {
                select: { id: true, gratuito: true },
              },
            },
          },
        },
      });

      if (!lesson || !(await hasCourseAccess(user, lesson.module.curso))) {
        return res.status(403).json({ success: false, error: "No tienes acceso a este video." });
      }

      if (lesson.bunnyVideoId) return sendBunnyVideoId(res, lesson.bunnyVideoId);

      return sendVideoId(res, lesson.videoUrl);
    }

    if (sourceType === VIDEO_SOURCE_TYPE.CONVERSATORIO) {
      const conversatorio = await db.conversatorio.findUnique({
        where: { id: sourceId },
        select: { id: true, estado: true, youtube: true, bunnyVideoId: true },
      });

      if (!conversatorio) {
        return res.status(404).json({ success: false, error: "Video no encontrado." });
      }

      if (conversatorio.bunnyVideoId) return sendBunnyVideoId(res, conversatorio.bunnyVideoId);

      return sendVideoId(res, conversatorio.youtube);
    }

    if (sourceType === VIDEO_SOURCE_TYPE.CONVERSATORIO_SPEAKER) {
      const speaker = await db.conversatorioSpeaker.findUnique({
        where: { id: sourceId },
        select: {
          videoUrl: true,
          bunnyVideoId: true,
          gratuita: true,
          conversatorio: {
            select: {
              id: true,
              gratuito: true,
              estado: true,
            },
          },
        },
      });

      if (!speaker) {
        return res.status(404).json({ success: false, error: "Video no encontrado." });
      }

      // Las ponencias se pueden previsualizar aunque no haya acceso completo;
      // el reproductor aplica el límite de vista previa cuando hasFullAccess=false.
      const hasFullAccess = await hasConversatorioVideoAccess(user, speaker.conversatorio, speaker.gratuita);

      if (speaker.bunnyVideoId) return sendBunnyVideoId(res, speaker.bunnyVideoId, hasFullAccess);

      return sendVideoId(res, speaker.videoUrl, hasFullAccess);
    }

    const speaker = await db.cursoSpeaker.findUnique({
      where: { id: sourceId },
      select: {
        videoUrl: true,
        bunnyVideoId: true,
        gratuita: true,
        curso: {
          select: { id: true, gratuito: true },
        },
      },
    });

    if (!speaker || (!speaker.gratuita && !(await hasCourseAccess(user, speaker.curso)))) {
      return res.status(403).json({ success: false, error: "No tienes acceso a este video." });
    }

    if (speaker.bunnyVideoId) return sendBunnyVideoId(res, speaker.bunnyVideoId);

    return sendVideoId(res, speaker.videoUrl);
  } catch (error) {
    console.error("Error resolving video source:", error);
    return res.status(500).json({ success: false, error: "No se pudo cargar el video." });
  }
});

export default router;
