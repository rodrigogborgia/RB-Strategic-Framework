# Landing de Descarga de PDF: "Si te calentás, perdés"

## Ubicación
- **URL**: `/negociar-bajo-presion`
- **Componente**: `frontend/src/PDFLanding.tsx`
- **HTML**: `frontend/negociar-bajo-presion.html`
- **Estilos**: `frontend/src/pdf-landing.css`

## Setup del PDF

1. **Subir el PDF** a `frontend/public/pdfs/si-te-calentas-perdes.pdf`
2. El endpoint backend ya está configurado para enviar este PDF por email

## Cómo funciona

### Frontend
1. Usuario completa formulario con nombre y email
2. Se envía POST a `/api/public/pdf-download` con:
   - `name`: Nombre del usuario
   - `email`: Email del usuario
   - `pdf_name`: "si_te_calentas_perdes"

### Backend
1. Valida los datos
2. Registra el lead en la base de datos
3. Notifica al admin vía email (Brevo)
4. Envía el PDF al usuario por email (Brevo)
5. Agrega el contacto a la lista de Brevo

## Desarrollo Local

Para probar la landing localmente:

```bash
cd frontend
npm run dev
```

Luego visita: `http://localhost:5173/negociar-bajo-presion.html`

## Producción

El build de Vite genera dos HTML separados:
- `dist/index.html` → Landing principal (rodrigoborgia.com)
- `dist/negociar-bajo-presion.html` → Landing del PDF

### Configuración de Nginx

Agregar a `nginx-redirects.conf`:

```nginx
# Landing de descarga de PDF
location /negociar-bajo-presion {
    try_files /negociar-bajo-presion.html =404;
}
```

## Variables de Entorno

Asegurate de tener configurado en el backend:

- `BREVO_API_KEY`: API key de Brevo
- `BREVO_SENDER_EMAIL`: Email del remitente
- `BREVO_SENDER_NAME`: Nombre del remitente
- `PUBLIC_LEAD_NOTIFICATION_EMAIL`: Email para recibir notificaciones de leads

## Analytics

Los siguientes eventos se trackean automáticamente:

- `pdf_download_initiated`: Cuando el usuario hace clic en descargar
- `pdf_download_success`: Cuando el PDF se envió exitosamente
- `pdf_download_error`: Si hubo un error al enviar
- `consultation_button_clicked`: Cuando hacen clic en "Agendar conversación"

## Personalización

### Agregar más PDFs

1. Agregar el PDF a `frontend/public/pdfs/`
2. Actualizar el mapping en `backend/app/main.py`:

```python
pdf_urls = {
    "si_te_calentas_perdes": "https://rodrigoborgia.com/pdfs/si-te-calentas-perdes.pdf",
    "tu_nuevo_pdf": "https://rodrigoborgia.com/pdfs/tu-nuevo-pdf.pdf",
}
```

3. Actualizar metadata en `backend/app/brevo_engine.py` en la función `send_pdf_email()`:

```python
pdf_metadata = {
    "tu_nuevo_pdf": {
        "title": "Título del PDF",
        "description": "Descripción del contenido",
        "cta_text": "Frase de cierre potente.",
    }
}
```

## SEO

Meta tags configurados para:
- Title: "Si te calentás, perdés | Negociación bajo presión"
- Description: "Manual breve sobre cómo mantener claridad estratégica cuando una negociación se vuelve emocional."
- Open Graph y Twitter Cards configurados
- Schema.org DigitalDocument implementado

## Diseño

El diseño sigue el sistema visual del sitio principal:

- **Colores**: #0f1419, #111111 (fondos), #60a5fa (acentos)
- **Tipografía**: Open Sans (400, 600, 700, 900)
- **Border radius**: 14px
- **Responsive**: Mobile-first design

## Próximos Pasos

1. Subir el PDF real a `frontend/public/pdfs/si-te-calentas-perdes.pdf`
2. Actualizar Google Analytics ID en `negociar-bajo-presion.html`
3. Configurar el botón "Agendar conversación" con URL de Calendly o contact page
4. Deploy y probar en producción
