# Google Analytics 4 + Search Console Setup Guide

**Objetivo**: Medir leads, demo activations, sesiones booked, traffic sources.  
**Tiempo**: 30-45 minutos total.

---

## PARTE 1: GOOGLE ANALYTICS 4 (GA4) - 20 minutos

### 1.1 Crear Propiedad GA4

1. Ir a https://analytics.google.com
2. Crear nueva "Propiedad": 
   - Nombre: `RB Strategic Framework`
   - Zona horaria: `America/Argentina/Buenos_Aires`
   - Moneda: `ARS` (o `USD` si lo prefieres)
3. Click "Crear propiedad"
4. Seleccionar "Web" como tipo de datos
5. Configurar stream:
   - URL: `https://rodrigoborgia.com`
   - Nombre stream: `Website Traffic`
   - Click "Crear stream"
6. **COPIAR MEASUREMENT ID** (formato: `G-XXXXXXX`)

### 1.2 Agregar Medición al Frontend

El `Measurement ID` se agregará al `index.html`.

En `frontend/index.html`, después de `<meta>` tags, agregá esto en `<head>`:

```html
<!-- Google Analytics 4 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXX', {
    'page_path': window.location.pathname,
    'allow_google_signals': true,
    'allow_ad_personalization_signals': true
  });
</script>
```

**Reemplazá `G-XXXXXXX` con tu Measurement ID real.**

### 1.3 Verificar que Funciona

1. Ir a https://rodrigoborgia.com
2. Abrir DevTools (F12 → Console)
3. Escribir: `dataLayer`
4. Si ves array con eventos, está funcionando ✓
5. En GA4, ir a "Real Time" → debería ver visitors en vivo

---

## PARTE 2: GOOGLE SEARCH CONSOLE - 15 minutos

### 2.1 Agregar Propiedad

1. Ir a https://search.google.com/search-console
2. Click "Agregar propiedad"
3. Elegir "URL prefix": `https://rodrigoborgia.com`
4. Click continuar

### 2.2 Verificar Propiedad (Elige 1 método)

**Opción A: Archivo HTML (Más fácil)**
1. Descargar archivo de verificación
2. Copiar a `frontend/public/` (crea folder si no existe)
3. Volver a Search Console, click "Verificar"

**Opción B: Meta Tag (Si no puedes acceder a servidor)**
1. Copiar meta tag que te da Search Console
2. Agregarlo a `frontend/index.html` en `<head>`
3. Click "Verificar"

### 2.3 Configurar Sitemaps + Robots.txt

1. En Search Console, ir a "Sitemaps"
2. Agregar: `https://rodrigoborgia.com/sitemap.xml`
3. (Si 404, el build fronted lo genera automáticamente)
4. En "Google Search" → "Robots.txt", verificar que permite `/`

---

## PARTE 3: EVENTOS PERSONALIZADOS (Tracking de Leads) - 10 minutos

El frontend ya está configurado para enviar estos eventos automáticamente:

### Eventos Capturados:

| Evento | Cuándo | Parámetros |
|--------|--------|-----------|
| `demo_modal_viewed` | Usuario hace click en "Explorar caso modelo" | `source: 'landing'` |
| `demo_started` | Usuario ingresa email y da submit en demo | `email: user@example.com` (hasheado) |
| `lead_captured_demo` | Backend registra lead de demo | `email, source: 'demo'` |
| `lead_captured_asesoria` | Backend registra solicitud de asesoría | `email, nombre, source: 'solicitar_asesoria'` |
| `lead_captured_protocolo` | Backend registra protocolo 48h | `email, source: 'protocolo_48h'` |
| `session_booked` | Usuario agenda sesión (futura integración) | `email, type: 'asesoria'` |

### Dónde Verlos en GA4:

1. GA4 → "Events" (en left sidebar)
2. Click cualquier evento
3. Ver: count, users, avg engagement time

---

## PARTE 4: CONVERSIONS (Embudo de Conversión)

### 4.1 Crear Conversión: "Demo Started"

1. GA4 → "Conversions" (left sidebar)
2. Click "+ New Conversion event"
3. Buscar evento: `demo_started`
4. Click "Create"

### 4.2 Crear Conversión: "Lead Captured"

1. Repetir proceso
2. Evento: `lead_captured_asesoria`
3. Click "Create"

**Resultado**: GA4 trackea "% de visitors → demo started → lead captured"

---

## PARTE 5: DASHBOARD BÁSICO (Opcional, pero Recomendado)

En GA4, crear "Custom Report":

1. "Explore" (left sidebar) → "Blank"
2. Dimensions: `Event name`, `User country`, `Source/Medium`
3. Metrics: `Event count`, `Users`, `Engagement rate`
4. Filter: Date (last 7 days)
5. Save as "Weekly Lead Dashboard"

---

## IMPLEMENTACIÓN EN CÓDIGO (Frontend)

El tracking ya está autointegrado. Cuando hagas git push, los eventos fluyen automáticamente.

**Eventos que ya se disparan:**
- ✅ Demo modal viewed (cuando haces click en botón)
- ✅ Demo started (cuando submiteas email)
- ✅ Lead captured (cuando el backend confirma)

**Lugar donde ocurren** (si quieres auditar):
- Frontend: `src/App.tsx` lines ~1150-1300 (handlers + event triggers)
- Backend: `app/main.py` líneas con `_log_lead_capture()` y `_notify_admin_of_lead()`

---

## CHECKLIST DE SETUP

- [ ] GA4 property creada y Measurement ID obtenido
- [ ] Measurement ID agregado a `frontend/index.html`
- [ ] Verificar Real Time en GA4 (deberías ver actividad en vivo)
- [ ] Search Console property agregada
- [ ] Search Console verificada (meta tag o archivo HTML)
- [ ] Sitemap.xml agregado a Search Console
- [ ] Conversiones "Demo Started" y "Lead Captured" creadas
- [ ] Dashboard "Weekly Lead Dashboard" creado
- [ ] Git push (automáticamente deploy a servidor)
- [ ] Hacer test: Click demo → ingresar email → buscar evento en GA4

---

## TESTING: Verificar que Funciona

1. **Local Testing:**
   ```bash
   npm run dev  # Corre frontend en localhost:5173
   # Abre https://localhost:5173
   # DevTools → Console
   # Busca: dataLayer
   # Deberías ver eventos
   ```

2. **Production Testing:**
   - Ir a https://rodrigoborgia.com
   - Hacer click en "Explorar caso modelo"
   - Ingresar email test (ej: test@example.com)
   - Submit
   - Abrir GA4 → Real Time → Events
   - Esperar 1-2 min → deberías ver `demo_started` event

3. **Search Console:**
   - Esperar 48 horas
   - Ir a "Coverage" → debería mostrar "pages indexed"

---

## ¿QUÉ SIGNIFICA CADA NÚMERO?

- **Users (Realtime)**: Gente en el sitio **ahora mismo**
- **Event count**: Cuántas veces se disparó un evento
- **Engagement rate**: % de sesiones donde pasó algo (no bounce)
- **Conversions**: Leads que llegaron a punto de conversión
- **Source**: De dónde vino (google search, direct, linkedin, etc.)

---

## PRÓXIMA SEMANA: Monitoreo

**Dashboard Weekly (30 minutos cada lunes):**
```
Total Visitors: X
Demo views: Y (% de visitors)
Demo starts (leads): Z (% de views)
Protocolo 48h leads: A
Solicitar Asesoría leads: B
Top source: [search/direct/referral]
```

Guardar números en Sheets para trend analysis.

---

## SOPORTE

- **GA4 Help**: https://support.google.com/analytics
- **Search Console Help**: https://support.google.com/webmasters
- **Measurement ID issue?** Ir a GA4 → Admin → Data Streams → busca URL → copia ID

**¡Listo! Ya podés empezar a medir.**
