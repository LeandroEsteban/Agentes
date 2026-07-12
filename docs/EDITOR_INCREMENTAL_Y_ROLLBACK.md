# Editor Incremental y Rollback

## Workspace Editor

El `WorkspaceEditor` (en `webforge/workspace/editor.py`) permite realizar
operaciones controladas sobre el workspace:

- `create`: Crear archivo nuevo
- `replace`: Reemplazar contenido (primera coincidencia)
- `patch`: Reemplazar contenido (coincidencia única, requiere hash)
- `delete`: Eliminar archivo
- `move`: Mover/renombrar archivo
- `mkdir`: Crear directorio

Cada operación registra un `WorkspaceChange` con:
- `change_id`, `run_id`, `cycle_id`, `task_id`, `agent_id`
- `operation`, `path`, `destination`
- `before_sha256`, `after_sha256` (hashes SHA-256)
- `before_size`, `after_size`
- `timestamp`

## Change Sets

Un `ChangeSet` agrupa cambios de una tarea:

```python
ChangeSet(
    change_set_id="...",
    run_id="run1",
    task_id="task1",
    agent_id="agent.backend",
    snapshot_id="snap_abc...",
    changes=[...],
    status="open",
)
```

Los cambios se persisten en `change-ledger.jsonl` (append-only).

## Snapshots

Los snapshots (`webforge/workspace/snapshots.py`) capturan:

- Manifiesto completo de archivos (rutas relativas, SHA-256, tamaño)
- Exclusión de `node_modules`, `__pycache__`, `.git`, `.venv`
- Exclusión de extensiones: `.pyc`, `.pyo`, `.log`, `.tmp`, `.swp`, `.DS_Store`

### Comandos CLI

```powershell
# Crear snapshot
python -m webforge workspace snapshot --workspace <dir> --output <dir>

# Verificar contra snapshot
python -m webforge workspace verify --workspace <dir> --snapshot <manifest.json>

# Rollback (prepara acciones)
python -m webforge workspace rollback --workspace <dir> --snapshot <manifest.json>
```

## Rollback

El rollback restaura:

- Archivos modificados → contenido original del snapshot
- Archivos eliminados → recreados desde el manifest
- Archivos creados → eliminados
- Archivos movidos → restaurados a ubicación original

Después del rollback se compara el manifiesto completo y se
verifican los hashes SHA-256. Solo se marca PASS cuando todos
los hashes coinciden con el snapshot.
