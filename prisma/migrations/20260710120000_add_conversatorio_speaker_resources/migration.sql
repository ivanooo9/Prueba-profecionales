CREATE TABLE "ConversatorioSpeakerResource" (
    "id" SERIAL NOT NULL,
    "speakerId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "tipo" TEXT,
    "tamano" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversatorioSpeakerResource_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ConversatorioSpeakerResource_speakerId_idx" ON "ConversatorioSpeakerResource"("speakerId");

ALTER TABLE "ConversatorioSpeakerResource" ADD CONSTRAINT "ConversatorioSpeakerResource_speakerId_fkey" FOREIGN KEY ("speakerId") REFERENCES "ConversatorioSpeaker"("id") ON DELETE CASCADE ON UPDATE CASCADE;
