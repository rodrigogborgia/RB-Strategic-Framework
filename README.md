# RB Strategic Framework (MVP)

Aplicación web para disciplina de preparación estratégica en negociación.

## Stack
- Backend: FastAPI + SQLModel + SQLite
- Frontend: React + Vite + TypeScript

## Estructura
- `backend/`: API, validaciones, estados del caso, análisis y memo final.
- `frontend/`: interfaz de una sola pantalla para flujo completo del caso.

## Flujo implementado
1. Crear caso (`curso` o `profesional`).
	- También podés crear desde casos modelo precargados.
2. Completar y guardar preparación (bloques obligatorios con límites).
3. Analizar preparación (preguntas, incoherencias, sugerencias, nivel).
4. Marcar caso como ejecutado.
5. Cargar debrief obligatorio.
6. Cerrar caso y generar memo ejecutivo final.
7. Consultar histórico de versiones (`/cases/{id}/versions`).

## Casos modelo incluidos
- Compraventa de inmueble urbano
- Negociación salarial por cambio de rol
- Oferta laboral “no negociable”
- Términos de contrato B2B
- Licitación competitiva (negotiauction)
- Relación en tensión con contraparte difícil
- Cierre e implementación del acuerdo

Catálogo simplificado para facilitar adopción continua como sparring personal de negociación.

## UX de carga rápida
- Preparación mínima por defecto: tipo de negociación, objetivo explícito, MAAN y riesgo principal.
- Debrief mínimo por defecto: estado de objetivo explícito y lección transferible.
- El resto de campos queda disponible en “campos avanzados”.

## Modo Curso 4x2h
- Guía por etapas en frontend para conducir un programa de 4 clases de 2 horas.
- Etapas: psicología/escucha, preparación avanzada, tácticas de presión y cierre/seguimiento.
- Incluye formato de sesión online (sincrónico, asincrónico o híbrido) con protocolo simple de recap y validación.
- Debrief simplificado en 3 líneas para cada caso: intención concreta, evidencia observada y ajuste siguiente.
- Incluye resumen de cierre de clase (patrones repetidos) a partir de casos cerrados.

## Reglas online incorporadas
- Sugerencias para secuenciar canal por fase (alineación en vivo + confirmación escrita).
- Alertas por riesgo de malentendidos cuando no hay protocolo de paráfrasis/confirmación.
- Recomendaciones para evitar fricción en e-mail asincrónico (cadencia y cierre por ronda).

## Reglas BATNA incorporadas
- Checklist BATNA en 4 pasos: alternativas, evaluación de valor esperado, elección de BATNA y valor de reserva.
- Señales para estimar BATNA de contraparte (incluyendo incentivos individuales vs organizacionales).
- En multiparte, sugerencia de matriz simple por actor para seguir alianzas y BATNAs fluctuantes.
- Alerta por sesgo de costos hundidos/entitlement para sostener buena fe y relación de largo plazo.

## Marco docente global incorporado
- Eje Ética: explicitar límites de tácticas, candor mínimo y criterio de justicia negociada.
- Eje Poder: reconocer asimetrías (estatus, rol, contexto) y compensarlas con diseño de proceso.
- Eje Conducta: pasar de comprensión conceptual a cambio observable de hábitos en negociación real.
- Objetivo de clase y de uso individual: que cada caso funcione como práctica deliberada, no solo como análisis teórico.

Endpoint de plantillas: `GET /case-templates`.

## Ejecutar backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
# preferido: usar archivo externo de secrets fuera del repo
uvicorn app.main:app --reload --port 8000
```

### Secrets fuera del repo (recomendado)
```bash
mkdir -p ~/.rb-secrets
cat > ~/.rb-secrets/backend.env << 'EOF'
OPENAI_API_KEY=tu_key
OPENAI_MODEL=gpt-4.1-mini
ANALYSIS_PROVIDER=openai
JWT_SECRET_KEY=change_this_in_production
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=720
FRONTEND_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174,http://localhost:4173,http://127.0.0.1:4173,http://localhost:4174,http://127.0.0.1:4174
BOOTSTRAP_ADMIN_EMAIL=admin@rb.local
BOOTSTRAP_ADMIN_PASSWORD=admin1234
BOOTSTRAP_ADMIN_FULL_NAME=Administrador RB
EOF
chmod 600 ~/.rb-secrets/backend.env
```

El backend carga variables en este orden: `RB_ENV_FILE` (si está definido) → `~/.rb-secrets/backend.env` → `backend/.env`.

### Variables de entorno backend
- `OPENAI_API_KEY`: requerida para análisis IA real.
- `OPENAI_MODEL`: opcional, default `gpt-4.1-mini`.
- `ANALYSIS_PROVIDER`: `openai` (default) o `rules`.

Si falta key o falla OpenAI, el sistema usa fallback automático al motor por reglas.

## Ejecutar frontend
```bash
cd frontend
npm install
npm run dev
```

Frontend: http://localhost:5173
Backend: http://localhost:8000
