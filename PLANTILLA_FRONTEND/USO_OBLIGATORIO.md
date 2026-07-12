# Uso obligatorio

`PLANTILLA_FRONTEND` es la plantilla frontend obligatoria para todos los proyectos WEBFORGE.

- Todo proyecto debe declararla en `frontend-template-manifest.json`.
- Cada version incremental debe mantener el vinculo a esta plantilla.
- Cada sandbox `DEV` y `QA` debe declarar la misma plantilla y hash.
- Si un proyecto intenta usar otra plantilla frontend, el gate `frontend_template` debe fallar.
