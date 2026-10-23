# ARQ-003: Fuente financiera de Arquitectura

## Fuente canónica

Los importes financieros se calculan desde `ArchitectureBudgetItem.quantity * unitPrice`, agrupados por `ArchitectureBudget`. Los campos `estimatedBudget` y `approvedBudget` del DTO de proyecto son derivados para presentación; no existen como columnas de `ArchitectureProject` y el formulario del proyecto no los administra.

## Reglas aplicadas

- Sin presupuestos: no hay importe estimado ni aprobado.
- Un presupuesto aprobado: su total de partidas se presenta como estimado y aprobado. El estado aprobado se determina por `status`, incluso si el total es cero.
- Un solo presupuesto sin aprobar: su total de partidas se presenta como estimado; su estado no se presenta como aprobado.
- La aprobación existente impide aprobar otro presupuesto para el mismo proyecto.
- El total se calcula con `Prisma.Decimal`, multiplicando cantidad por precio unitario y redondeando a dos decimales.

## Decisión pendiente

El sistema permite conservar varios presupuestos no aprobados para un proyecto, pero no define cuál es el presupuesto vigente o principal entre ellos. No se suman ni se escoge uno por fecha, orden de consulta o posición en una lista. Hasta que se defina esa regla, el proyecto se marca como ambiguo y se excluye del total estimado y aprobado del portafolio. Los presupuestos históricos se conservan.

Datos heredados con más de un presupuesto aprobado también se marcan como ambiguos, aunque el flujo actual de aprobación impide crear esa situación desde la aplicación.

Para cerrar esta decisión de negocio debe especificarse cómo identificar el presupuesto vigente cuando hay varios no aprobados, incluyendo el tratamiento de estados como `Presentado`, `Rechazado`, `Pendiente` y `Enviado`. No se ha realizado ninguna migración, escritura de datos, cambio de esquema ni operación contra PostgreSQL.