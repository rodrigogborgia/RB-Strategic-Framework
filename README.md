# RB Strategic Framework

## Propósito

Esta aplicación te ayuda a preparar negociaciones con rigor estratégico y a aprender de cada experiencia real. No es solo un template para organizar información: es un **sparring personal** que detecta incoherencias, te hace las preguntas difíciles antes de sentarte a negociar, y te guía para convertir cada caso en práctica deliberada.

El objetivo es que desarrolles disciplina de preparación y capacidad de autoevaluación honesta, pasando de comprensión conceptual a cambio observable de hábitos en negociación real.

## Cómo la usa el estudiante: flujo de aprendizaje

### 1. Crear caso
Elegí el tipo de caso:
- **Curso**: Para práctica académica durante un programa de formación
- **Profesional**: Para negociaciones reales en tu contexto laboral

Podés partir de cero o usar uno de los 7 casos modelo precargados para inspirarte o adaptar a tu contexto.

Si creás desde plantilla, la app asigna automáticamente el origen del caso según tu modo efectivo de acceso (**Sesión en Vivo** o **Sparring**).

### 2. Preparar (Primera entrada de datos)
Completá los bloques de preparación estratégica con lo mínimo necesario:
- **Contexto**: Tipo de negociación, nivel de impacto, tu relación con la contraparte
- **Objetivo**: Objetivo explícito (lo que decís que querés) vs. objetivo real (lo que realmente querés)
- **Poder y alternativas**: Tu MAAN, fortalezas relativas, punto de ruptura
- **Estrategia**: ZOPA estimada, secuencia de concesiones, hipótesis sobre la contraparte
- **Riesgo**: Tu variable emocional crítica, riesgo principal, señal clave a observar

Si querés profundizar, abrí "campos avanzados" con preguntas adicionales.

### 3. Analizar (Primer aprendizaje automático)
El sistema revisa tu preparación y te devuelve:
- **Preguntas de clarificación** sobre decisiones estratégicas clave
- **Observaciones** sobre inconsistencias o riesgos detectados
- **Sugerencias concretas** para fortalecer tu preparación
- **Próximos pasos** a considerar antes de negociar
- **Inconsistencias detectadas** explícitamente
- **Nivel de preparación** alcanzado

**Ciclo de mejora:** Podés actualizar tu preparación y pedir análisis de nuevo. Ver el historial (`/cases/{id}/versions`) para observar cómo evolucionó tu pensamiento.

### 4. Ejecutar + Debrief (Captura de realidad)
Después de negociar en la vida real, registrá lo que pasó realmente:
- **¿Lograste tu objetivo explícito?** Qué sucedió vs. qué esperabas
- **¿Y el objetivo real?** Diferencia entre lo planeado y lo logrado
- **¿Dónde se movió el poder** durante la negociación? Cambios inesperados
- **¿Cuál fue la objeción decisiva** que no anticipaste o que te hizo cambiar de estrategia?
- **¿Qué concesión cambió la estructura** del acuerdo?
- **Autodiagnóstico honesto**: Tu error estratégico principal, tu acierto principal, qué decisión vas a cambiar en la próxima

También disponible en modo mínimo al inicio, con campos avanzados para mayor profundidad.

### 5. Debrief automático (Segundo aprendizaje automático)
El sistema ahora compara tu preparación con tu ejecución real y te devuelve:
- **Brechas estratégicas**: Dónde tu preparación no predijo la realidad
- **Errores identificados**: Suposiciones fallidas, señales que no leíste correctamente
- **Aciertos confirmados**: Qué funcionó exactamente como preparaste
- **Oportunidades de mejora**: Qué aplicarías diferente en la próxima basándote en lo aprendido
- **Patrones personales**: Tendencias en tu comportamiento (si es tu segundo caso adelante)

Este análisis es **el corazón del aprendizaje**: compara tu plan + tu ejecución + tu autodiagnóstico para extraer lecciones concretas.

> Nota técnica: si el análisis automático del debrief falla por un error puntual, el debrief igual se guarda para no perder información de la negociación.

### 6. Cerrar (Reporte final)
Evaluás los resultados:
- **Confianza final** en tu capacidad de negociación
- **Calidad del acuerdo** en 3 dimensiones: resultado, relación, sostenibilidad

El sistema genera un **memo ejecutivo final** que consolida:
- Síntesis estratégica de lo que sucedió
- Todas las oportunidades de mejora identificadas
- Tu patrón de pensamiento observado
- Principio transferible (la lección que llevas a la próxima)

---

## Experiencias de uso

La plataforma está diseñada para acompañar dos contextos reales de aprendizaje y performance:

- **Sesión en Vivo**: para trabajar casos durante una cohorte activa, con foco en entrenamiento aplicado y seguimiento cercano.
- **Sparring**: para sostener la práctica en el tiempo, transformar experiencias reales en aprendizaje transferible y consolidar hábitos.

Además, ofrece dos perfiles de uso complementarios:

- **Alumno**: prepara, ejecuta, analiza y cierra sus casos con trazabilidad de evolución.
- **Admin/Profesor**: acompaña el proceso con gestión de usuarios/cohortes, métricas agregadas y evaluaciones de liderazgo.

En la operación actual, el acceso del alumno se resuelve principalmente por membresía de cohorte:

- Con cohorte activa: experiencia por defecto en **Sesión en Vivo**.
- Sin cohorte activa: experiencia por defecto en **Sparring**.

La capa de suscripción/abono está prevista en el roadmap técnico, pero hoy el funcionamiento principal está centrado en cohortes y membresías.

---

## Casos modelo incluidos

Para empezar rápido o inspirarte:
- Compraventa de inmueble urbano
- Negociación salarial por cambio de rol
- Oferta laboral "no negociable"
- Términos de contrato B2B
- Licitación competitiva (negotiauction)
- Relación en tensión con contraparte difícil
- Cierre e implementación del acuerdo

---

## Cómo usar la aplicación en modo sparring personal

Una vez que completás un caso, la aplicación sigue siendo tu entrenador para cada negociación importante:

### Antes de negociar
1. **Creá el caso** apenas sepas que tenés una negociación importante por delante (aunque sea semanas antes).
2. **Preparalo en varias pasadas**: No lo llenes todo el mismo día. Volvé a revisar tu preparación conforme se acerca la fecha.
3. **Analizá cada versión**: Cada vez que actualices, pedí análisis de nuevo. Las recomendaciones van a cambiar conforme afinás tu estrategia.
4. **Consultá el historial** (`/cases/{id}/versions`) para ver cómo evolucionó tu pensamiento estratégico.

### Durante la negociación
- Tené a mano tu preparación (consultala desde la app en cualquier momento).
- Prestá atención a las señales clave que identificaste en el bloque de riesgo.

### Después de negociar
1. **Hacé el debrief dentro de las 24hs** mientras la memoria está fresca.
2. **Sé brutalmente honesto** en tu autodiagnóstico: nadie más lo ve, es solo para vos.
3. **Leé el análisis automático** que el sistema genera al completar el debrief. Ahí están tus oportunidades de mejora específicas.
4. **Revisá periódicamente tus casos cerrados**: Los patrones se vuelven evidentes cuando mirás varios casos juntos.

### La diferencia entre uso puntual y práctica deliberada

**Uso puntual:** Abrís la app solo cuando tenés una negociación mega importante y la preparás una sola vez justo antes.

**Práctica deliberada:** Preparás TODAS tus negociaciones importantes (aunque te parezcan "fáciles"), hacés análisis en varias pasadas conforme se acerca la fecha, hacés debrief honesto siempre, y revisás periódicamente qué patrones se repiten en tu comportamiento y decisiones.

La segunda opción es la que genera cambio real de hábitos.

---

## Reglas integradas que te ayudan

La aplicación tiene lógica incorporada sobre:

**Negociación online/híbrida:**
- Cómo secuenciar canales por fase (alineación en vivo + confirmación escrita)
- Alertas por riesgo de malentendidos sin protocolo de paráfrasis
- Recomendaciones para evitar fricción en e-mail asincrónico

**BATNA (Best Alternative To Negotiated Agreement):**
- Checklist en 4 pasos: alternativas, evaluación de valor esperado, elección de BATNA, valor de reserva
- Señales para estimar BATNA de la contraparte (incentivos individuales vs. organizacionales)
- En multiparte: matriz simple por actor para seguir alianzas y BATNAs fluctuantes
- Alertas por sesgo de costos hundidos o entitlement

**Marco ético y de poder:**
- Límites de tácticas, candor mínimo, criterio de justicia negociada
- Reconocimiento de asimetrías (estatus, rol, contexto) y compensación con diseño de proceso

---

## Configuración e Integración de CRM (Brevo)

La landing page captura leads a través de dos canales:

1. **Modal "Solicitar Asesoría para Equipos"** → Clasificado como `Lead Magnet: Asesoría Equipos`
2. **Formulario Lateral "Protocolo de 48 Horas"** → Clasificado como `Lead Magnet: Protocolo IA`

Ambos feeds se sincronizan automáticamente con **Brevo** (lista ID 3: "Cómo usar la IA para preparar nuestras negociaciones").

### Configurar Brevo

1. **Crear tu cuenta:**
   - Ve a [Brevo](https://www.brevo.com)
   - Registrate y confirma tu email

2. **Obtener API Key:**
   - Accedé a [Configuración → Cuenta → API](https://my.brevo.com/settings/account/api)
   - Generá una nueva API key
   - Copialá en un lugar seguro (no la commitees al repo)

3. **Configurar variables de entorno:**
   - Opción A (local): Creá `backend/.env` con:
     ```
     BREVO_API_KEY=your_api_key_here
     BREVO_LIST_ID=3
     ```
   - Opción B (producción/secreto externo): Creá `~/.rb-secrets/backend.env` con las mismas variables. El `settings.py` la leerá automáticamente sin comprometer secrets en git.

4. **Verificar la configuración:**
   ```bash
   cd backend
   source ../.venv/bin/activate
   python -c "from app.brevo_engine import upsert_contact_in_brevo; print('✓ Brevo configurado')"
   ```

### Atributos personalizados en Brevo

Para diferenciar leads por origen, asegúrate de que tu cuenta Brevo tenga estos atributos:

- **PREOCUPACION_NEGOCIACION**: Captura la preocupación o tipo de negociación (tipo texto)
- **LEAD_SOURCE**: Captura la fuente del lead ("Lead Magnet: Protocolo IA" o "Lead Magnet: Asesoría Equipos")

Si no existen, créalos desde Brevo → CRM → Atributos personalizados.

### Flujo de captura

Cuando alguien completa un formulario en la landing:

1. **Frontend** envía `{email, preocupacion_negociacion, source}`
2. **Backend** valida el payload en `PublicLeadCaptureInput`
3. **brevo_engine.py** mapea el `source` al label correcto:
   - `"lead_magnet"` → `"Lead Magnet: Protocolo IA"`
   - `"modal"` → `"Lead Magnet: Asesoría Equipos"`
4. **API Brevo** crea/actualiza el contacto en la Lista ID 3
5. **Sistema registra** un log:
   ```
   Lead capturado exitosamente: email=..., source=..., list_id=3
   ```

Brevo dispara automáticamente la secuencia de emails configurada para esa lista.

---

