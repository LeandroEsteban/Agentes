# Normalization Findings

## Resumen ejecutivo

Estado: **pass**

## Conteos

- modules: 10
- actors: 9
- use_cases: 12
- workflows: 30
- screens: 30
- endpoints: 40
- tables: 40
- business_rules: 60
- validations: 100

## Hallazgos
- **WARNING SOURCE_ABSOLUTE_WINDOWS_LINK**: Source contains an absolute Windows link; output retains only relative evidence: Especificacion_Funcional_SIGED_Lampa.md. Resolucion: revisar en la fase correspondiente sin inferir una decision funcional.
- **WARNING SOURCE_ABSOLUTE_WINDOWS_LINK**: Source contains an absolute Windows link; output retains only relative evidence: Mapa_Pantallas_Navegacion_SIGED_Lampa.md. Resolucion: revisar en la fase correspondiente sin inferir una decision funcional.
- **WARNING SOURCE_ABSOLUTE_WINDOWS_LINK**: Source contains an absolute Windows link; output retains only relative evidence: Inventario_Endpoints_SIGED_Lampa.md. Resolucion: revisar en la fase correspondiente sin inferir una decision funcional.
- **WARNING SOURCE_ABSOLUTE_WINDOWS_LINK**: Source contains an absolute Windows link; output retains only relative evidence: Modelo_ER_Detallado_SIGED_Lampa.md. Resolucion: revisar en la fase correspondiente sin inferir una decision funcional.
- **WARNING ENDPOINT_WITHOUT_SCREEN**: API-021 is not explicitly associated with a screen (Inventario_Endpoints_SIGED_Lampa.md:87). Resolucion: revisar en la fase correspondiente sin inferir una decision funcional.
- **WARNING ENDPOINT_WITHOUT_SCREEN**: API-026 is not explicitly associated with a screen (Inventario_Endpoints_SIGED_Lampa.md:92). Resolucion: revisar en la fase correspondiente sin inferir una decision funcional.
- **WARNING SCREEN_WITHOUT_ENDPOINT**: P-10 has no explicit endpoint association (Mapa_Pantallas_Navegacion_SIGED_Lampa.md:95). Resolucion: revisar en la fase correspondiente sin inferir una decision funcional.
- **WARNING SCREEN_WITHOUT_ENDPOINT**: P-11 has no explicit endpoint association (Mapa_Pantallas_Navegacion_SIGED_Lampa.md:96). Resolucion: revisar en la fase correspondiente sin inferir una decision funcional.
- **WARNING SCREEN_ROUTE_AMBIGUOUS**: P-30 has unresolved alternate routes (Mapa_Pantallas_Navegacion_SIGED_Lampa.md:115). Resolucion: revisar en la fase correspondiente sin inferir una decision funcional.
- **WARNING MISSING_ADMIN_ENDPOINT**: P-10 has no concrete administrative endpoint (Mapa_Pantallas_Navegacion_SIGED_Lampa.md:95). Resolucion: revisar en la fase correspondiente sin inferir una decision funcional.
- **WARNING MISSING_ADMIN_ENDPOINT**: P-11 has no concrete administrative endpoint (Mapa_Pantallas_Navegacion_SIGED_Lampa.md:96). Resolucion: revisar en la fase correspondiente sin inferir una decision funcional.
- **WARNING P30_ALTERNATE_ROUTE**: P-30 declares alternate routes (Mapa_Pantallas_Navegacion_SIGED_Lampa.md:115). Resolucion: revisar en la fase correspondiente sin inferir una decision funcional.
- **WARNING BR017_ATTACHMENT_VERSION_GAP**: BR-017 requires attachment version association, but document_attachments has no version_id (Modelo_ER_Detallado_SIGED_Lampa.md:143). Resolucion: revisar en la fase correspondiente sin inferir una decision funcional.
- **WARNING BR021_PREVIOUS_VERSION_GAP**: BR-021 requires explicit previous version, but document_versions has no previous_version_id (Modelo_ER_Detallado_SIGED_Lampa.md:142). Resolucion: revisar en la fase correspondiente sin inferir una decision funcional.
- **WARNING DOCUMENT_NUMBERING_MODEL_GAP**: Document numbering rule lacks a dedicated numbering model (Modelo_ER_Detallado_SIGED_Lampa.md:141). Resolucion: revisar en la fase correspondiente sin inferir una decision funcional.
- **WARNING OIRS_CONTACT_MODEL_GAP**: Anonymous OIRS contact data is not represented on oirs_cases (Modelo_ER_Detallado_SIGED_Lampa.md:215). Resolucion: revisar en la fase correspondiente sin inferir una decision funcional.
- **WARNING POTENTIAL_RELATIONSHIP_CYCLE**: Departments/users foreign keys can require deferred migration ordering. Resolucion: revisar en la fase correspondiente sin inferir una decision funcional.
- **WARNING POTENTIAL_DOCUMENT_VERSION_CYCLE**: documents.current_version_id and document_versions.document_id require deferred migration ordering (Modelo_ER_Detallado_SIGED_Lampa.md:141). Resolucion: revisar en la fase correspondiente sin inferir una decision funcional.
- **WARNING API002_NOT_IMPLEMENTED**: Frontend/catalog declares API-002 but backend does not expose citizen-login. Resolucion: revisar en la fase correspondiente sin inferir una decision funcional.
- **WARNING API034_ROUTE_DIFFERENCE**: API-034 documented route differs from the backend request route. Resolucion: revisar en la fase correspondiente sin inferir una decision funcional.
- **WARNING PARTIAL_ENDPOINT_IMPLEMENTATION**: Only 8 of 40 catalog endpoint paths are implemented by the backend. Resolucion: revisar en la fase correspondiente sin inferir una decision funcional.
- **WARNING GENERIC_DATABASE_TABLES**: 34 materialized tables use only generic audit columns. Resolucion: revisar en la fase correspondiente sin inferir una decision funcional.
- **WARNING MEMORY_PERSISTENCE_ACTIVE**: Backend persistence is in memory although PostgreSQL is declared by configuration. Resolucion: revisar en la fase correspondiente sin inferir una decision funcional.
- **WARNING CATALOG_ROUTES_NOT_EXECUTABLE**: Frontend embeds route catalog entries but does not expose the documented routes as server routes. Resolucion: revisar en la fase correspondiente sin inferir una decision funcional.
- **WARNING SURFACE_ROUTE_GROUPING_GAP**: Generated navigation groups administrative and citizen routes together. Resolucion: revisar en la fase correspondiente sin inferir una decision funcional.
