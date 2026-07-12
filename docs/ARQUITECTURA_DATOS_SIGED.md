# Arquitectura de Datos SIGED-Lampa

## Version: v0002 (Fase 4)

### Diagrama de Dominios

```
┌─────────────────────────────────────────────────────────────┐
│                     SIGED-Lampa Database                      │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐               │
│  │Seguridad │  │Organizac │  │Doc. Catalogos│               │
│  │ 7 tablas │  │ 2 tablas │  │  3 tablas    │               │
│  └────┬─────┘  └────┬─────┘  └──────┬───────┘               │
│       │             │               │                        │
│       └──────┬──────┴──────┬────────┘                        │
│              │             │                                  │
│     ┌────────▼──┐   ┌─────▼────────┐                         │
│     │ Documentos │   │  Workflows   │                         │
│     │ 9 tablas   │   │  5 tablas    │                         │
│     └─────┬──────┘   └──────┬───────┘                         │
│           │                 │                                  │
│  ┌────────▼─────────────────▼───────┐                         │
│  │         Expedientes              │                         │
│  │          3 tablas                │                         │
│  └────────┬─────────────────────────┘                         │
│           │                                                    │
│  ┌────────▼──────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │ Correspondencia│  │Portal Ciudad │  │  OIRS             │  │
│  │  3 tablas      │  │  6 tablas    │  │  2 tablas         │  │
│  └────────────────┘  └──────────────┘  └───────────────────┘  │
│                                                              │
│  ┌──────────────┐  ┌───────────────────┐                     │
│  │Public/Agenda  │  │Notif. y Auditoría│                     │
│  │ 3 tablas      │  │  2 tablas         │                     │
│  └──────────────┘  └───────────────────┘                     │
└─────────────────────────────────────────────────────────────┘
```

### Motor

- **PostgreSQL 16** (Alpine)
- Modo `memory` solo para compatibilidad de prototipo v0001

### Migraciones

13 migraciones versionadas con checksum SHA-256.
Tabla técnica: `schema_migrations` (excluida del conteo funcional).

### Estrategia de Relaciones Circulares

1. ADR-010 (departments ↔ users): departments sin manager_user_id FK inicial, se agrega en migration 013
2. ADR-011 (documents ↔ document_versions): documents sin current_version_id FK inicial, se agrega en migration 013

### Restricciones

- PK: 40 tablas funcionales
- FK: 40+ relaciones
- UNIQUE: 20+ constraints
- CHECK: 15+ constraints
- Índices: 30+

### Seeds

4 seeds reproducibles (ON CONFLICT DO NOTHING):
1. Catálogos (estados, tipos documentales, tipos de trámite)
2. Roles y permisos
3. Departamentos
4. Datos demo
