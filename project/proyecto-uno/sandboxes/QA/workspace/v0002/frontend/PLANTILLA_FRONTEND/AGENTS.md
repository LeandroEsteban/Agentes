# AGENTS.md — Guía para agentes de IA

Documento técnico para que un agente de IA (o desarrollador) **entienda, edite y extienda**
esta intranet sin romper el sistema de diseño. Léelo completo antes de modificar nada.

---

## 0. Modelo mental en 30 segundos

- **Un solo archivo de UI:** `Intranet Agora.dc.html`. No hay más componentes.
- Es un **Design Component (DC)**: plantilla HTML declarativa + una clase de lógica `Component`.
- La **plantilla** (markup) define la estructura; la **lógica** (`renderVals()`) provee los datos.
- Estilos **inline** + **tokens CSS** (custom properties). No hay clases CSS propias ni hojas de estilo.
- Toda la "data" (KPIs, tareas, personas, etc.) son **arrays JS dentro de `renderVals()`** — datos de ejemplo, listos para reemplazar por una API.

```
┌─────────────────────── Intranet Agora.dc.html ───────────────────────┐
│ <helmet>  → fuentes, iconos, @keyframes, tokens de tema (:root / dark) │
│ <x-dc>    → plantilla declarativa (sidebar + topbar + <main> módulos)  │
│ class Component extends DCLogic { renderVals() { ...datos... } }       │
└───────────────────────────────────────────────────────────────────────┘
```

---

## 1. Tokens de diseño (CSS custom properties)

Definidos en `<helmet><style>`. **Nunca escribas un color hex suelto en la UI**: usa el token.
Cambiar la identidad visual = cambiar estos valores.

### Tema claro (`:root`)
```
--bg:#F1F4FA   --surface:#FFFFFF   --surface-2:#F7F9FD   --surface-3:#EDF1F8
--border:#E5EAF3   --border-2:#D6DEEC
--text:#141C2B   --text-2:#465065   --muted:#7C879B
--brand:#1E5BC6   --brand-2:#1747A0   --brand-soft:#E7F0FD
--accent:#0E9F8E  --accent-soft:#E0F4F1
--warn:#D98A2B    --warn-soft:#FAF0DD
--danger:#D44C4C  --danger-soft:#FBE8E8
--success:#1E9E5C --success-soft:#E2F4EA
--shadow / --shadow-lg
```
El tema oscuro (`[data-theme="dark"]`) redefine los mismos tokens. Como toda la UI usa
`var(--token)`, **el modo oscuro funciona automáticamente** en cualquier elemento nuevo
que también use tokens.

**Regla de oro:** cada par de color tiene una versión "soft" para fondos suaves
(`--brand` para texto/icono sobre `--brand-soft` de fondo). Mantén ese patrón.

### Convención de superficies
- `--bg` → fondo de la app (área de contenido).
- `--surface` → tarjetas y paneles.
- `--surface-2` / `--surface-3` → fondos sutiles anidados (inputs, tiles, hover).
- `--border` → bordes de 1px en todas las tarjetas.

---

## 2. Convenciones de estilo

- **Solo estilos inline.** Nada de `class="mi-clase"` ni `<style>` con reglas de UI.
  El único `<style>` permitido (en `<helmet>`) contiene: fuentes, `@keyframes`, reset del body,
  scrollbar, los tokens de tema, y las 2 media queries del responsive móvil.
- **Tarjeta estándar** (reutilizada en todo el diseño):
  ```
  background:var(--surface); border:1px solid var(--border);
  border-radius:16px; box-shadow:var(--shadow);
  ```
- **Etiqueta mono (kicker):**
  ```
  font-family:'IBM Plex Mono',monospace; font-size:11px;
  letter-spacing:.08em; text-transform:uppercase; color:var(--muted);
  ```
- **Hover:** usar el atributo `style-hover="..."` (lo provee el runtime DC). Igual `style-focus`, `style-active`.
- **Radios:** 16px tarjetas, 12-13px botones/tiles, 10-11px chips/iconos, 20px pills.
- **Espaciado responsivo:** `clamp(min, vw, max)` en paddings de contenedores grandes.
- **Iconos:** `<i class="bi bi-NOMBRE">`. Catálogo: https://icons.getbootstrap.com/

---

## 3. Plantilla declarativa — sintaxis que se usa

Esta es la sintaxis del runtime DC (`support.js`). Respétala:

- `{{ ruta.punteada }}` → inserta un valor que devuelve `renderVals()`. **Solo rutas**, nunca expresiones (`{{ a + b }}` no funciona; calcula en JS).
- `<sc-for list="{{ items }}" as="item" hint-placeholder-count="3">…{{ item.x }}…</sc-for>` → repetición. `$index` disponible.
- `<sc-if value="{{ flag }}" hint-placeholder-val="{{ true }}">…</sc-if>` → condicional.
- Eventos: `onClick="{{ handler }}"`, `onInput="{{ handler }}"` (camelCase, valor = función de `renderVals()`).
- Atributos interpolados: `style="background:{{ item.bg }}; ..."`.

> `hint-*` define el placeholder mientras la data aún no llega. Siempre inclúyelo en `sc-for`/`sc-if`.

---

## 4. La lógica: `renderVals()`

Una sola clase, `Component extends DCLogic` (JS clásico, sin imports/TS). Patrón React-like:
`this.state`, `this.setState(...)`, métodos handler, y `renderVals()` que **devuelve un objeto plano**
con todos los valores y funciones que la plantilla consume por nombre.

### Estado actual
```js
state = { active:'inicio', collapsed:false, theme:'light',
          dirQuery:'', activeDept:'Todos', docView:'grid',
          notifOpen:false, mobileOpen:false }
```

### Navegación entre módulos
- `active` (string) controla qué módulo se ve. `renderVals()` expone flags `isInicio`, `isNoticias`, … que alimentan los `<sc-if>` de cada módulo en `<main>`.
- `nav(id)` cambia `active`, cierra el menú móvil y hace scroll arriba.

### Dónde viven los datos
Todos los arrays de ejemplo se construyen **dentro de `renderVals()`** (kpis, quickActions,
recentDocs, homeEvents, newsItems, calCells, kanban, docFolders, docFiles, reqTypes, reqList,
peopleRaw, repKpis, repBars, donutLegend, repUnits, notifs). Para conectar a backend, reemplaza
cada array por datos de `this.state` cargados en `componentDidMount()` vía `fetch`.

---

## 5. Receta: AGREGAR UN MÓDULO NUEVO

Ejemplo: añadir "Mensajes".

1. **Ítem de menú** — en `renderVals()`, dentro de `navDef`, agrega al grupo deseado:
   ```js
   {id:'mensajes', icon:'bi-chat-dots-fill', label:'Mensajes'}
   ```
2. **Título** — en el objeto `titles`:
   ```js
   mensajes:['Mensajes','Tu bandeja de entrada'],
   ```
3. **Flag** — en el `return` de `renderVals()`:
   ```js
   isMensajes: A==='mensajes',
   ```
4. **Datos** — crea el array que necesites en `renderVals()` y exponlo en el `return`.
5. **Plantilla** — en `<main>`, agrega el bloque (copia el patrón de un módulo existente):
   ```html
   <sc-if value="{{ isMensajes }}" hint-placeholder-val="{{ false }}">
     <div style="animation:fadeInUp .45s cubic-bezier(.2,.7,.2,1); ...">
       ... usa la "tarjeta estándar" y tokens ...
     </div>
   </sc-if>
   ```

No toques nada más: el sidebar, el routing y el tema lo absorben solo.

---

## 6. Recetas rápidas

- **Cambiar el color de marca:** edita `--brand`, `--brand-2`, `--brand-soft` en `:root` (y sus equivalentes en `[data-theme="dark"]`).
- **Agregar una tarjeta a un módulo:** duplica un `<div>` con la "tarjeta estándar" y usa tokens.
- **Nuevo KPI en Inicio:** agrega un objeto al array `kpis` (icon, label, value, delta, tint, tintBg…).
- **Nueva persona en Directorio:** agrega a `peopleRaw` (`{n, r, d, c}`); las iniciales y el filtro son automáticos.
- **Nueva columna Kanban:** agrega un objeto a `kanban` con su array `cards`.

---

## 7. Errores que NO debes cometer

- ❌ Escribir clases CSS o un `<style>` con reglas de UI. Usa estilos inline + tokens.
- ❌ Poner expresiones dentro de `{{ }}` (`{{ a && b }}`, `{{ fn() }}`). Calcula en `renderVals()` y expón el resultado por nombre.
- ❌ Colores hex sueltos en la UI. Usa `var(--token)`.
- ❌ Olvidar `hint-placeholder-*` en `sc-for` / `sc-if`.
- ❌ Romper el patrón color/soft (texto fuerte sobre fondo soft).
- ❌ Editar `dist/intranet-agora-standalone.html` o `support.js` a mano. El standalone se regenera desde el `.dc.html`.

---

## 8. Editar de forma segura (checklist)

1. Lee `Intranet Agora.dc.html` completo.
2. Haz el cambio mínimo (datos en `renderVals()` o markup en `<main>`).
3. Verifica que sigues usando tokens y la tarjeta estándar.
4. Si agregaste módulo: confirma los 5 pasos de la §5.
5. Regenera el standalone si necesitas la demo offline actualizada.
