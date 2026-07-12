# HANDOFF-REACT.md — Implementación en React + Bootstrap

Guía para llevar este prototipo a una app real con **React 18 + React-Bootstrap 5**.
El prototipo ya está estructurado para esta traducción: un shell + módulos por estado,
datos separados de la vista, y tokens de color.

---

## 1. Stack recomendado

```
React 18  ·  React-Bootstrap 5  ·  Bootstrap 5.3  ·  Bootstrap Icons
React Router 6   (routing por módulo)
TanStack Query   (datos del backend, opcional pero recomendado)
Vite             (build)
```

```bash
npm create vite@latest intranet-agora -- --template react
cd intranet-agora
npm i react-bootstrap bootstrap bootstrap-icons react-router-dom @tanstack/react-query
```

`main.jsx`:
```js
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './theme.css'; // tokens (abajo)
```

---

## 2. Tokens → `theme.css`

Copia los tokens del prototipo tal cual. Bootstrap 5.3 ya usa CSS variables, así que puedes
mapear las suyas a las nuestras:

```css
:root{
  --bg:#F1F4FA; --surface:#fff; --surface-2:#F7F9FD; --surface-3:#EDF1F8;
  --border:#E5EAF3; --border-2:#D6DEEC;
  --text:#141C2B; --text-2:#465065; --muted:#7C879B;
  --brand:#1E5BC6; --brand-2:#1747A0; --brand-soft:#E7F0FD;
  --accent:#0E9F8E; --accent-soft:#E0F4F1;
  --warn:#D98A2B; --warn-soft:#FAF0DD;
  --danger:#D44C4C; --danger-soft:#FBE8E8;
  --success:#1E9E5C; --success-soft:#E2F4EA;

  /* puente con Bootstrap */
  --bs-primary:#1E5BC6;
  --bs-body-color:var(--text);
  --bs-body-bg:var(--bg);
  --bs-border-color:var(--border);
}
[data-bs-theme="dark"]{
  --bg:#0C1220; --surface:#141C2C; --surface-2:#1A2334; --surface-3:#212C42;
  --border:#27314A; --border-2:#323E5A;
  --text:#EAF0F8; --text-2:#AEB9CC; --muted:#7B8699;
  --brand:#4E8BEE; --brand-2:#6BA1F1; --brand-soft:#172A47;
  /* …resto del tema oscuro… */
}
```

> Modo oscuro nativo de Bootstrap 5.3: pon `data-bs-theme="dark"` en `<html>`.
> El prototipo usa `data-theme`; en React usa el atributo de Bootstrap.

---

## 3. Mapeo de componentes

| Prototipo (DC) | React-Bootstrap |
|---|---|
| `<aside>` sidebar colapsable | `<Nav>` vertical en un `<div>` propio + estado `collapsed` (off-canvas en móvil con `<Offcanvas>`) |
| `<header>` topbar | `<Navbar>` |
| input de búsqueda | `<Form.Control>` con `<InputGroup>` |
| Tarjeta estándar | `<Card>` |
| KPIs / tiles | `<Card>` dentro de `<Row><Col>` (grid de Bootstrap) |
| Badges de estado | `<Badge bg="success" />` etc. |
| Dropdown de notificaciones | `<Dropdown>` / `<Popover>` |
| Tabs/filtros de Noticias | `<Nav variant="pills">` o `<ToggleButtonGroup>` |
| Kanban | columnas con `<Col>` + librería DnD (`@hello-pangea/dnd`) |
| Vista grilla/lista (Documentos) | estado `view` + `<ToggleButtonGroup>` |
| Chips de filtro (Directorio) | `<Badge>` clicables o `<ToggleButton>` |
| Barras / dona (Indicadores) | `recharts` o `chart.js` (`react-chartjs-2`) |

---

## 4. Estructura de carpetas sugerida

```
src/
├── main.jsx
├── theme.css                 # tokens (§2)
├── App.jsx                   # <BrowserRouter> + layout
├── layout/
│   ├── Sidebar.jsx           # navDef → <Nav>
│   ├── Topbar.jsx            # búsqueda, tema, notificaciones, avatar
│   └── Layout.jsx            # sidebar + topbar + <Outlet/>
├── modules/
│   ├── Inicio.jsx
│   ├── Noticias.jsx
│   ├── Calendario.jsx
│   ├── Tareas.jsx
│   ├── Documentos.jsx
│   ├── Solicitudes.jsx
│   ├── Directorio.jsx
│   └── Indicadores.jsx
├── components/               # Kpi, EventItem, FileCard, PersonCard, StatusBadge…
├── hooks/
│   └── useTheme.js           # light/dark + persistencia en localStorage
└── api/                      # fetchers (reemplazan los arrays del prototipo)
```

### Routing (reemplaza el estado `active`)
```jsx
<Routes>
  <Route element={<Layout/>}>
    <Route index element={<Inicio/>} />
    <Route path="noticias" element={<Noticias/>} />
    <Route path="calendario" element={<Calendario/>} />
    <Route path="tareas" element={<Tareas/>} />
    <Route path="documentos" element={<Documentos/>} />
    <Route path="solicitudes" element={<Solicitudes/>} />
    <Route path="directorio" element={<Directorio/>} />
    <Route path="indicadores" element={<Indicadores/>} />
  </Route>
</Routes>
```

El array `navDef` del prototipo es directamente la fuente del `<Sidebar>` (con `to={'/'+id}`
y `NavLink` para el estado activo).

---

## 5. Datos: de arrays a API

En el prototipo cada módulo arma su array dentro de `renderVals()`. En React, cada módulo
hace su propia carga:

```jsx
function Directorio() {
  const { data: people = [] } = useQuery({
    queryKey: ['people'],
    queryFn: () => fetch('/api/people').then(r => r.json()),
  });
  const [q, setQ] = useState('');
  const [dept, setDept] = useState('Todos');
  const filtered = people.filter(p =>
    (dept === 'Todos' || p.dept === dept) &&
    (p.name + p.role).toLowerCase().includes(q.toLowerCase())
  );
  // …render con <Row><Col><PersonCard/></Col></Row>
}
```

**Forma de los datos** (toma los arrays del prototipo como contrato del backend):
- Persona: `{ name, role, dept, color? }`
- Documento: `{ name, kind, size, modified, owner }`
- Tarea (Kanban): `{ id, title, tags[], assignee, due, progress, column }`
- Solicitud: `{ id, type, range, status, stage, steps }`
- Evento: `{ day, month, title, time, place }`
- KPI: `{ label, value, delta }`

---

## 6. Accesibilidad y producción (no olvidar)

- `aria-label` en botones de solo icono (menú, tema, notificaciones).
- Foco visible (`:focus-visible`) y navegación por teclado en el sidebar.
- Contraste AA: los tokens ya están calibrados, mantenlos.
- Persistir tema y estado del sidebar en `localStorage`.
- `prefers-reduced-motion`: desactivar `fadeInUp` si el usuario lo pide.
- Lazy-load por ruta (`React.lazy` + `Suspense`) para dividir el bundle por módulo.
