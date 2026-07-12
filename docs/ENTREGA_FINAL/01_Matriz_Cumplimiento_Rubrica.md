# Matriz de Cumplimiento de Rúbrica - SIGED-Lampa v0002

**Rama:** `main`
**Commit:** `9539d2fd28acb73182340b298efc022e9b22cc84`
**Fecha:** 2026-07-12

| Criterio | Porcentaje | Estado | Evidencia principal | Observaciones |
| --- | --- | --- | --- | --- |
| Documentación | 5% | Cumple | 01_Documentacion_Proyecto_SIGED_Lampa.md | Trazabilidad y métricas verificadas. |
| Código fuente | 5% | Cumple | project/siged-lampa/versions/v0002/openapi.yaml; project/siged-lampa/versions/v0002/frontend/src/config/screen-catalog.ts | Código, contratos y catálogos presentes. |
| Sistema online en Linux EC2 | 40% | Pendiente de verificación | project/siged-lampa/versions/v0002/runs/phase8a/phase8a-acceptance-decision.json | Preparación aprobada; workflow no ejecutado en evidencia local. |
| Diseño y plan de pruebas | 10% | Cumple | project/siged-lampa/versions/v0002/runs/phase7ar6c/phase7ar6c-summary.md | 394 pruebas aprobadas reportadas; cobertura no total. |
| Video | 40% | Pendiente de verificación | No se encontró evidencia versionada | Pendiente de producción audiovisual. |

## Checklist de mínimos

| Elemento mínimo | Meta | Resultado verificado | Estado | Evidencia |
| --- | --- | --- | --- | --- |
| Documento de especificación | 6 páginas | Documento extenso | Cumple | Documento principal |
| Casos de uso | 10 | 12 | Cumple | Sección 6.3 |
| Funcionalidades o flujos | 30 | 35 | Cumple | project/siged-lampa/versions/v0002/frontend/src/config/screen-catalog.ts |
| Tablas | 40 | 41 | Cumple | project/siged-lampa/versions/v0002/database/migrations/ |
| Endpoints API | 40 | 98 | Cumple | project/siged-lampa/versions/v0002/backend/operational-endpoint-catalog.json |
| Pantallas | 30 | 35 | Cumple | project/siged-lampa/versions/v0002/frontend/src/config/screen-catalog.ts |
| Reglas de negocio | 60 | 60 | Cumple | project/siged-lampa/versions/v0002/backend/business-rule-map.json |
| Validaciones y restricciones | 100 | 100 | Cumple | project/siged-lampa/versions/v0002/backend/validation-map.json |
| Pruebas automatizadas | Sí | 394 aprobadas reportadas | Cumple | project/siged-lampa/versions/v0002/runs/phase7ar6c/phase7ar6c-summary.md |
| Cobertura del 100% | 100% | 87,72% FE; 80,84% BE líneas | No cumple | project/siged-lampa/versions/v0002/runs/phase7ar6c/phase7ar6c-summary.md |
| Sistema online en Linux EC2 | Sí | No verificable localmente | Pendiente de verificación | project/siged-lampa/versions/v0002/runs/phase8a/phase8a-acceptance-decision.json |
| Video de 6 a 9 minutos | Sí | Pendiente | Pendiente de verificación | No se encontró evidencia |

## Nota de auditoría

Los estados `Pendiente de verificación` no niegan la declaración de entrega; indican que la evidencia local versionada no permite acreditar la ejecución del sistema en EC2 ni la producción audiovisual. No se asigna `Cumple` a esas filas sin evidencia comprobable.
