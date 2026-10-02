-- Add scoped convenios support for conversatorios.
ALTER TABLE "Conversatorio" ADD COLUMN "usePecConvenios" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "Agreement" ADD COLUMN "conversatorioId" INTEGER;

ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_conversatorioId_fkey"
  FOREIGN KEY ("conversatorioId") REFERENCES "Conversatorio"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "Agreement_conversatorioId_orden_idx" ON "Agreement"("conversatorioId", "orden");
