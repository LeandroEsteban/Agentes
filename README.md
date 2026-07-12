# WEBFORGE Factory Runtime

WEBFORGE ahora tiene un runtime local ejecutable para materializar la fabrica SDD definida en los documentos de diseno. El objetivo no es desplegar una app externa: es ejecutar la fabrica, producir evidencia y bloquear cualquier accion insegura hasta que exista aprobacion.

## Uso

```bash
python -m webforge run --project-root . --work-order examples/work_order_factory.json --output runs/latest
python -m webforge principles
```

## Uso rapido SIGED-Lampa

```powershell
python -m webforge run `
  --project-root . `
  --work-order examples/work_order_siged_lampa.json `
  --output runs/siged-lampa-latest `
  --source "C:\Users\lmata\Documents\Universidad\Agentes\Especificacion_Funcional_SIGED_Lampa.md" `
  --source "C:\Users\lmata\Documents\Universidad\Agentes\Inventario_Endpoints_SIGED_Lampa.md" `
  --source "C:\Users\lmata\Documents\Universidad\Agentes\Mapa_Pantallas_Navegacion_SIGED_Lampa.md" `
  --source "C:\Users\lmata\Documents\Universidad\Agentes\Modelo_ER_Detallado_SIGED_Lampa.md"
```

La corrida SIGED genera la trazabilidad normal de la fabrica en `runs/siged-lampa-latest`
y materializa una primera app web ejecutable en
`project/siged-lampa/sandboxes/DEV/workspace/app/index.html`.

## Politica de proyectos

WEBFORGE trabaja cada proyecto como una unidad aislada en `project/<project_id>/`.
La fabrica no comparte memoria ni aprendizaje con los proyectos. Cada proyecto
tiene `memory/`, `learning/`, `versions/<version>/`, `sandboxes/DEV/` y
`sandboxes/QA/`. DEV y QA son clones locales independientes para sacar versiones
incrementales a prueba.

Todo frontend debe partir de `PLANTILLA_FRONTEND`. La fabrica escribe un
`frontend-template-manifest.json` en cada proyecto, version y sandbox; si falta la
plantilla o el manifiesto, el gate `frontend_template` bloquea el cierre.

La ejecucion genera, entre otros artefactos:

- `state.json`, `log.jsonl`, `phase-ledger.json`
- `constitution.md`, `spec.md`, `plan.md`, `tasks.md`
- `context-pack.json`, `rag-index-manifest.json`, `evidence-register.md`
- `validation-report.json`, `security-review.md`, `sbom.json`
- `traceability-matrix.md`, `billing-ledger.json`, `final-report.json`

## Garantia operativa P01-P12

`final-report.json` queda en `complete` solo si:

- todos los principios P01-P12 tienen gates ejecutados y evidencia presente;
- no hay secretos detectados;
- MCP sigue default-deny sin invocaciones no aprobadas;
- no hay escritura externa ni deploy;
- existe aislamiento de proyecto y sandboxes DEV/QA;
- existe `PLANTILLA_FRONTEND` como plantilla obligatoria del proyecto;
- las fases SDD corren en el orden cerrado definido por `workflow.yaml`.
