from __future__ import annotations

from .models import FeedbackMode

# Catálogo intencionalmente acotado para mantener la app simple de usar.
CASE_TEMPLATES: list[dict] = [
    {
        "id": "inmueble_compraventa",
        "title": "Compraventa de inmueble urbano",
        "ideal_for": "Fundamentos y diagnóstico inicial de poder relativo.",
        "mode": FeedbackMode.CURSO,
        "preparation": {
            "context": {
                "negotiation_type": "Compraventa de inmueble",
                "impact_level": "Alto",
                "counterpart_relationship": "Nueva relación",
            },
            "objective": {
                "explicit_objective": "Cerrar la operación dentro de 30 días.",
                "real_objective": "Comprar con condiciones de pago que preserven liquidez.",
                "minimum_acceptable_result": "Precio final dentro de banda objetivo y cláusulas claras.",
            },
            "power_alternatives": {
                "maan": "Tener dos propiedades alternativas preevaluadas.",
                "counterpart_perceived_strength": "El vendedor percibe alta demanda por la zona.",
                "breakpoint": "No superar el precio techo definido.",
            },
            "strategy": {
                "estimated_zopa": "Banda de precio y calendario de pagos escalonado.",
                "concession_sequence": "Conceder velocidad de firma antes que precio.",
                "counterpart_hypothesis": "Prioriza certidumbre de cierre por sobre último punto de precio.",
            },
            "risk": {
                "emotional_variable": "Ansiedad por perder oportunidad.",
                "main_risk": "Conceder precio demasiado temprano.",
                "key_signal": "Si exige cierre inmediato sin contrapartida.",
            },
        },
    },
    {
        "id": "negociacion_salarial",
        "title": "Negociación laboral",
        "ideal_for": "Acordá la compensación y las condiciones sin perder poder de decisión ni dañar relación.",
        "mode": FeedbackMode.CURSO,
        "preparation": {
            "context": {
                "negotiation_type": "Negociación salarial",
                "impact_level": "Alto",
                "counterpart_relationship": "Relación en curso",
            },
            "objective": {
                "explicit_objective": "Acordar nueva compensación para rol ampliado.",
                "real_objective": "Alinear salario con responsabilidades y plan de carrera.",
                "minimum_acceptable_result": "Ajuste base + revisión formal en 6 meses.",
            },
            "power_alternatives": {
                "maan": "Mantener posición actual mientras evalúo ofertas externas.",
                "counterpart_perceived_strength": "Empresa con restricciones presupuestarias y bandas de compensación.",
                "breakpoint": "No aceptar aumento simbólico sin revisión pactada.",
            },
            "strategy": {
                "estimated_zopa": "Rango de compensación con componentes fijo/variable y revisión semestral.",
                "concession_sequence": "Primero estructura del paquete, luego timing y criterios de excepción de banda.",
                "counterpart_hypothesis": "Valoran retención, pero intentarán diferir costo fijo y sostener política estándar.",
            },
            "risk": {
                "emotional_variable": "Frustración acumulada.",
                "main_risk": "Negociar desde molestia, insistir en puntos bloqueados y perder foco en variables negociables.",
                "key_signal": "Si repiten 'no negociable' sin explicar límites concretos ni criterios de excepción.",
            },
        },
    },
    {
        "id": "contrato_b2b_terminos",
        "title": "Negociación y Venta B2B",
        "ideal_for": "Leé la intención real, protegé el margen y cerrá mejor en negociaciones comerciales exigentes.",
        "mode": FeedbackMode.CURSO,
        "preparation": {
            "context": {
                "negotiation_type": "Negociación de términos contractuales B2B",
                "impact_level": "Medio",
                "counterpart_relationship": "Largo plazo",
            },
            "objective": {
                "explicit_objective": "Cerrar contrato anual con SLA y plazos claros.",
                "real_objective": "Proteger margen y previsibilidad operativa.",
                "minimum_acceptable_result": "Acuerdo sobre plazos de pago, SLA mínimo y revisión semestral.",
            },
            "power_alternatives": {
                "maan": "Mantener proveedor secundario activo.",
                "counterpart_perceived_strength": "Comprador concentra volumen y usa competencia para presionar por descuentos.",
                "breakpoint": "No aceptar SLA exigente sin contraprestación económica.",
            },
            "strategy": {
                "estimated_zopa": "Descuento moderado a cambio de volumen, plazos y paquetes de servicio comparables.",
                "concession_sequence": "Presentar paquetes simultáneos y conceder reporting antes que precio.",
                "counterpart_hypothesis": "Buscan bajar riesgo de abastecimiento más que precio extremo, aunque usen presión competitiva.",
            },
            "risk": {
                "emotional_variable": "Exceso de confianza por relación histórica.",
                "main_risk": "Entrar en espiral de concesiones de precio o términos legales sin medir impacto total.",
                "key_signal": "Si piden última mejora sin criterio de adjudicación ni contraprestaciones verificables.",
            },
        },
    },
    {
        "id": "cierre_e_implementacion",
        "title": "Cerrar bajo presión",
        "ideal_for": "Cerrá acuerdos de alto impacto sin regalar valor ni comprometer la ejecución.",
        "mode": FeedbackMode.CURSO,
        "preparation": {
            "context": {
                "negotiation_type": "Cierre de acuerdo e implementación",
                "impact_level": "Crítico",
                "counterpart_relationship": "Relación en curso",
            },
            "objective": {
                "explicit_objective": "Cerrar acuerdo sin concesiones unilaterales de último minuto.",
                "real_objective": "Asegurar implementación sostenible postfirma.",
                "minimum_acceptable_result": "Contrato balanceado + responsables, hitos y revisión periódica.",
            },
            "power_alternatives": {
                "maan": "Postergar cierre y activar alternativa validada.",
                "counterpart_perceived_strength": "Presiona por deadline para reabrir puntos cerrados y puede elevar tensión.",
                "breakpoint": "No otorgar concesiones finales sin ajuste equivalente.",
            },
            "strategy": {
                "estimated_zopa": "Rango de cierre con reciprocidad explícita.",
                "concession_sequence": "Pausa táctica si escala la fricción + concesión solo contra compromiso implementable y verificable.",
                "counterpart_hypothesis": "Necesita mostrar victoria interna y certidumbre de ejecución; detrás de la presión puede haber restricciones de tiempo/caja.",
            },
            "risk": {
                "emotional_variable": "Ansiedad por cerrar rápido.",
                "main_risk": "Firmar sin gobernanza de implementación o escalar a dinámica ganar/perder.",
                "key_signal": "Si reaparecen amenazas, ultimátum o evita definir responsables y fechas de seguimiento.",
            },
        },
    },
]
