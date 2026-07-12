# Bloqueos para 5B.3

## Pendientes de 5B.2 (documentos) resueltos en 5B.2D
- ✅ API-015 a API-024: 10/10 endpoints implementados
- ✅ BR-013 a BR-036, BR-041: todas las reglas documentales con evidencia backend
- ✅ VAL-013 a VAL-045: todas las validaciones documentales con evidencia backend (31 implementadas, 2 diferidas)
- ✅ 40/40 endpoints originales implementados, 0 parciales

## Lo que queda para 5B.3 (expedientes, correspondencia, contenido público, OIRS, notificaciones)

### Business Rules pendientes (25)
| Regla | Descripción |
|-------|-------------|
| BR-004 | Perfiles ciudadanos y funcionarios no comparten ámbito |
| BR-007 | Trámite publicado asociado a tipo vigente |
| BR-008 | Entidad externa con nombre y canal |
| BR-009 | Solo admins crean roles |
| BR-010 | Solo admins modifican permisos |
| BR-011 | Preferencias de notificación configurables |
| BR-012 | Acceso fallido repetido gatilla protección |
| BR-039 | Eventos relevantes en timeline de expediente |
| BR-040 | Expediente refleja estado agregado de documentos |
| BR-042 | Búsqueda por expediente (folio, estado, fecha, responsable) |
| BR-044 | Correspondencia asignable a varios departamentos |
| BR-045 | Correspondencia confidencial restringe acceso |
| BR-046 | Correspondencia con plazo calcula vencimiento |
| BR-047 | Respuesta oficial vinculable a documentos |
| BR-048 | Derivación genera notificación |
| BR-049 | Solo trámites publicados iniciables desde portal |
| BR-051 | Ciudadano solo ve sus solicitudes |
| BR-052 | Trámite indica requisitos y estado |
| BR-053 | Noticias desde administración autorizada |
| BR-055 | OIRS clasificado por tipo |
| BR-056 | OIRS con estado y responsable |
| BR-057 | Respuesta OIRS auditada |
| BR-058 | Ciudadano consulta historial de su caso |
| BR-059 | Cierre de caso requiere resolución |
| BR-060 | Derivación OIRS conserva trazabilidad |

### Validaciones pendientes (43)
| Validación | Módulo |
|------------|--------|
| VAL-002, 003 | Seguridad (login, email) |
| VAL-010 | Entidades externas |
| VAL-048-055 | Expedientes (8) |
| VAL-057-065 | Correspondencia (9) |
| VAL-066-069 | Contenido público (4) |
| VAL-071-074 | Portal ciudadano (4) |
| VAL-078, 080-085 | OIRS (7) |
| VAL-086-089 | Reportes (4) |
| VAL-090-095 | Notificaciones (6) |
| VAL-100 | Transversal (updated_at) |

### Endpoints cubiertos en 5B.2C pero sin evidencia backend en BR/VAL
Los siguientes endpoints de 5B.2C tienen tests pero sus reglas y validaciones asociadas están pendientes de mapeo:
- API-025 a API-033 (expedientes)
- API-034 a API-036 (correspondencia)
- API-039, API-040 (reportes)
- SECURITY endpoints

### Dependencias técnicas
- QA PostgreSQL debe estar operativo para tests de integración y API
- Los endpoints de contenido público (API-029, 030) requieren frontend para validación completa
- Las notificaciones (API-031, 032) dependen de infraestructura de colas/mensajería
