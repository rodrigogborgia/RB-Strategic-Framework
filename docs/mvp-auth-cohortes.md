# MVP técnico: Auth, Cohortes, Modo Sesión en Vivo/Sparring

## Objetivo del MVP
Implementar control de acceso por usuario + cohorte, con dos experiencias:
- Sesión en Vivo (durante cohorte activa)
- Sparring (post cohorte)

Y aplicar regla de negocio:
- Cohorte finalizada y sin abono activo => acceso solo lectura a casos de clase.

---

## 1) Modelo de datos (tablas)

### `users`
- `id` (PK)
- `email` (unique, indexed)
- `password_hash` (nullable si solo Google)
- `full_name`
- `role` (`admin` | `student`)
- `is_active` (bool)
- `created_at`
- `updated_at`

### `cohorts`
- `id` (PK)
- `name`
- `start_date` (date)
- `end_date` (date)
- `status` (`draft` | `active` | `finished`)
- `created_at`
- `updated_at`

### `cohort_memberships`
- `id` (PK)
- `user_id` (FK `users.id`)
- `cohort_id` (FK `cohorts.id`)
- `joined_at`
- `left_at` (nullable)
- `is_active` (bool)

### `subscriptions`
- `id` (PK)
- `user_id` (FK `users.id`)
- `status` (`active` | `inactive` | `past_due`)
- `starts_at`
- `ends_at`
- `source` (ej: `manual`, `stripe`) 
- `created_at`
- `updated_at`

### Cambios a tabla existente `case`
Agregar:
- `owner_user_id` (FK `users.id`)
- `cohort_id` (FK `cohorts.id`, nullable)
- `origin` (`live_session` | `sparring`)
- `is_read_only` (bool, default `false`)

> Regla: casos creados durante cohorte activa se guardan con `origin=live_session` y `cohort_id` correspondiente.

---

## 2) Reglas de autorización

## Identidad
- Login principal: email + contraseña.
- Login opcional: Google OAuth (fase 2).

## Permisos por rol
- `admin`: CRUD usuarios, cohortes, membresías, suscripciones; acceso dashboards globales.
- `student`: acceso a sus casos y cohortes asignadas.

## Resolución de modo por sesión
Para `student` autenticado:
1. Si tiene membresía activa en cohorte activa => modo por defecto `sesion_en_vivo`.
2. Si no tiene cohorte activa y tiene suscripción activa => modo por defecto `sparring`.
3. Si no tiene cohorte activa y no tiene suscripción activa => `sparring_read_only` sobre casos `origin=live_session`.

## Edición de casos
- `live_session` editable solo durante cohorte activa.
- Cohorte finalizada + sin suscripción activa => casos live_session en lectura.
- `sparring` editable solo con suscripción activa.

---

## 3) Endpoints API (MVP)

## Auth
- `POST /auth/login` (email, password) -> access token + profile.
- `POST /auth/logout` (opcional, si hay refresh token).
- `GET /auth/me` -> usuario + rol + modo efectivo + permisos.
- `POST /auth/google` (fase 2) -> login con token de Google.

## Admin: usuarios
- `GET /admin/users`
- `POST /admin/users` (alta de usuario)
- `PATCH /admin/users/{id}` (activar/desactivar, rol)
- `POST /admin/users/{id}/reset-password`

## Admin: cohortes
- `GET /admin/cohorts`
- `POST /admin/cohorts`
- `PATCH /admin/cohorts/{id}`
- `POST /admin/cohorts/{id}/members` (bulk add)
- `DELETE /admin/cohorts/{id}/members/{user_id}`

## Admin: suscripciones
- `GET /admin/subscriptions`
- `POST /admin/subscriptions` (alta manual inicial)
- `PATCH /admin/subscriptions/{id}`

## Dashboards
- `GET /admin/dashboard/overview`
- `GET /admin/dashboard/cohorts/{id}`
- `GET /student/dashboard`

## Cases (ajustes)
- Todas las rutas de casos existentes validan `owner_user_id` y permisos de edición según modo.
- `GET /cases` devuelve `is_read_only` y `origin`.

---

## 4) Pantallas (frontend)

## A. Login
- Email
- Contraseña
- Botón “Ingresar”
- Botón “Continuar con Google” (fase 2)

## B. App principal
- Selector visible de experiencia (`Sesión en Vivo` / `Sparring`) solo si el usuario tiene ambos permisos.
- Banner de modo lectura cuando corresponda.
- Bloqueos de botones de edición si `is_read_only=true`.

## C. Admin - Usuarios y Cohortes
- Tabla de usuarios (rol, activo, cohorte, suscripción).
- CRUD de cohortes con fechas.
- Asignación de usuarios a cohorte.

## D. Admin - Dashboard
Métricas mínimas:
- Usuarios activos por cohorte.
- Casos creados por clase/período.
- % de debrief completado.
- Evolución de claridad promedio y falta de alineamiento promedio.

## E. Student - Dashboard
Métricas mínimas:
- Casos completados.
- Claridad promedio (tendencia).
- Falta de alineamiento promedio (tendencia decreciente esperada).
- Últimos 3 aprendizajes transferibles.

---

## 5) Orden de implementación recomendado

### Fase 0 (base técnica)
1. Migraciones DB + nuevas tablas/columnas.
2. Seed de primer admin.

### Fase 1 (auth password)
1. `POST /auth/login` + JWT.
2. `GET /auth/me`.
3. Guard de rutas backend por token.
4. Pantalla login frontend.

### Fase 2 (cohortes + permisos)
1. CRUD cohortes/admin users/memberships.
2. Resolver modo efectivo de usuario.
3. Aplicar bloqueo de edición por reglas.

### Fase 3 (suscripción + read-only post cohorte)
1. Tabla/CRUD suscripciones (manual).
2. Regla final de acceso: post cohorte sin abono = solo lectura.

### Fase 4 (dashboards MVP)
1. Endpoint admin overview + cohort detail.
2. Endpoint student dashboard.
3. Gráficos básicos frontend.

### Fase 5 (Google login)
1. Integración OAuth Google.
2. Vinculación por email existente.

---

## 6) Criterios de aceptación MVP
- Un usuario no autenticado no puede acceder a casos.
- Admin puede crear usuario y asignarlo a cohorte.
- Usuario de cohorte activa entra con modo vivo por defecto.
- Usuario sin cohorte activa y sin abono solo puede leer casos live_session.
- Dashboard admin y dashboard alumno muestran métricas básicas sin errores.

---

## 7) Notas de implementación
- Mantener campos internos `inconsistency_count`/`inconsistencies` en backend por compatibilidad.
- En UI mostrar siempre “Falta de alineamiento”.
- Empezar con suscripción manual (`status`), luego integrar pagos.
