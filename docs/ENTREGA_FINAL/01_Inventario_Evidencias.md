# Inventario de Evidencias - SIGED-Lampa v0002

**Commit documentado:** `9539d2fd28acb73182340b298efc022e9b22cc84`
**Fecha de generación:** 2026-07-12

| ID | Requisito | Tipo de evidencia | Ruta | Estado |
| --- | --- | --- | --- | --- |
| E-01 | Especificación y alcance | Fuente funcional | project/siged-lampa/sources/Especificacion_Funcional_SIGED_Lampa.md | Verificado |
| E-02 | Casos de uso y actores | Especificación + rutas | project/siged-lampa/versions/v0002/frontend/src/config/screen-catalog.ts | Verificado |
| E-03 | Funcionalidades | Catálogo de pantallas | project/siged-lampa/versions/v0002/frontend/src/config/screen-catalog.ts | Verificado |
| E-04 | 41 tablas de dominio | Migraciones SQL | project/siged-lampa/versions/v0002/database/migrations/ | Verificado |
| E-05 | 98 endpoints | Contrato y catálogo operacional | project/siged-lampa/versions/v0002/openapi.yaml; project/siged-lampa/versions/v0002/backend/operational-endpoint-catalog.json | Verificado |
| E-06 | 35 pantallas | Catálogo frontend | project/siged-lampa/versions/v0002/frontend/src/config/screen-catalog.ts | Verificado |
| E-07 | 60 reglas | Mapa de reglas | project/siged-lampa/versions/v0002/backend/business-rule-map.json | Verificado |
| E-08 | 100 validaciones | Mapa de validaciones | project/siged-lampa/versions/v0002/backend/validation-map.json | Verificado |
| E-09 | Pruebas y cobertura | Reporte final | project/siged-lampa/versions/v0002/runs/phase7ar6c/phase7ar6c-summary.md | Verificado con limitaciones |
| E-10 | Composición de producción | Infraestructura | project/siged-lampa/versions/v0002/infra/deployment/docker-compose.production.yml | Verificado |
| E-11 | Pipeline | Workflow Actions | .github/workflows/deploy-ec2.yml | Verificado |
| E-12 | Sistema online EC2 | Aceptación de despliegue | project/siged-lampa/versions/v0002/runs/phase8a/phase8a-acceptance-decision.json | Pendiente de verificación |
| E-13 | Fábrica WEBFORGE | Código de orquestación | webforge/orchestrator.py | Verificado |
| E-14 | Agentes y handoffs | Planificación | webforge/planning/agents.py; webforge/planning/handoffs.py | Verificado |

## Criterio de uso

Este inventario resume las fuentes de la documentación principal. Se priorizan artefactos ejecutables y contratos de `v0002`; los resultados históricos no reemplazan la evidencia final. La preparación de despliegue no acredita por sí sola que el sistema estuviera accesible en EC2.

## Conteos reproducibles

`tools/documentation/generate_siged_delivery.py` lee migraciones, catálogo operacional, catálogo de pantallas y mapas de reglas/validaciones. Excluye `schema_migrations` y deduplica endpoints por método-ruta.

| Métrica | Resultado | Fuente |
| --- | --- | --- |
| Tablas de dominio | 41 | project/siged-lampa/versions/v0002/database/migrations/ |
| Endpoints únicos | 98 | project/siged-lampa/versions/v0002/backend/operational-endpoint-catalog.json |
| Pantallas | 35 | project/siged-lampa/versions/v0002/frontend/src/config/screen-catalog.ts |
| Reglas | 60 | project/siged-lampa/versions/v0002/backend/business-rule-map.json |
| Validaciones | 100 | project/siged-lampa/versions/v0002/backend/validation-map.json |
