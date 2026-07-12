# Proyecto UNO v0002

Implementacion incremental del portal ClaveUnica para cubrir los 159 requisitos implementables del ledger UNO.

## Entrypoint

- `app/index.html`

## Reglas de fabrica

- Proyecto aislado en `project/proyecto-uno`.
- Memoria y aprendizaje no compartidos con la fabrica.
- `PLANTILLA_FRONTEND` incluida en `frontend/PLANTILLA_FRONTEND`.
- DEV y QA deben clonar esta version de forma independiente.

## Validacion

```bash
python3 scripts/build_traceability.py
python3 scripts/verify_requirements.py
npx --yes --package=playwright node scripts/validate_web_flows.mjs
python3 scripts/verify_requirements.py --require-web
```
