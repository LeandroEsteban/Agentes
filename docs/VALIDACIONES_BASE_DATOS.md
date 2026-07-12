# Validaciones de Base de Datos - SIGED-Lampa v0002

## Criterio de asignación

Una validación se implementa en PostgreSQL cuando:
1. Es una restricción de integridad referencial (FK)
2. Es una restricción de unicidad (UNIQUE)
3. Es una restricción de dominio (CHECK con valores fijos)
4. Es una restricción NOT NULL estructural

### No implementadas en DB (pendientes para backend/frontend)

- Validaciones de autorización (BR-003, BR-009, BR-010)
- Validaciones de workflow (BR-016, BR-022, BR-025)
- Validaciones de formato complejo (VAL-003 email, VAL-018 extensiones)
- Reglas de negocio que requieren lógica de aplicación (BR-020, BR-028)

## Validaciones DB Implementadas

Ver `database/validation-map.json` para la lista completa (30 validaciones).

### Mecanismos

| Mecanismo | Cantidad |
|-----------|----------|
| NOT NULL | 100+ columnas |
| UNIQUE | 20+ constraints |
| FK | 40+ constraints |
| CHECK | 15+ constraints |
| Índices | 30+ |

### CHECK Destacados

- `confidentiality_level` in ('public', 'internal', 'confidential', 'secret')
- `direction` in ('INBOUND', 'OUTBOUND')
- `priority` in ('low', 'normal', 'high', 'urgent')
- `status` en catálogos cerrados por tabla
- `version_number > 0`, `sort_order > 0`, `sequence_order > 0`
- `file_size >= 0`, `retention_days >= 0`, `estimated_days > 0`
- `closed_at >= opened_at`, `resolved_at >= submitted_at`, `end_at >= start_at`
- `from_department_id <> to_department_id`
- `requested_by <> reviewer_user_id`
- OIRS: autenticado o contacto anónimo completo
- OIRS messages: al menos un autor (user o citizen)
