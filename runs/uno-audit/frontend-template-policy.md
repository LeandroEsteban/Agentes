# Frontend template policy

`PLANTILLA_FRONTEND` es obligatoria para todos los proyectos WEBFORGE.

- Ningun proyecto puede crear frontend desde una plantilla distinta.
- Todo sandbox DEV y QA debe declarar la misma plantilla y hash.
- Las versiones incrementales deben clonar desde `versions/<version>` manteniendo esta plantilla.
- Si falta la plantilla, sus archivos requeridos o sus manifiestos, el gate `frontend_template` falla.
