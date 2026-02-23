from __future__ import annotations

from .models import FeedbackMode

# Catálogo intencionalmente acotado para mantener la app simple de usar.
CASE_TEMPLATES: list[dict] = [
    {
        "id": "inmueble_compraventa",
        "title": "Compraventa de inmueble urbano",
        "ideal_for": "Clase 1 · Fundamentos y diagnóstico inicial.",
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
        "title": "Negociación salarial por cambio de rol",
        "ideal_for": "Clase 2 · BATNA/ZOPA y argumentos de valor.",
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
                "counterpart_perceived_strength": "Empresa con restricciones presupuestarias.",
                "breakpoint": "No aceptar aumento simbólico sin revisión pactada.",
            },
            "strategy": {
                "estimated_zopa": "Rango de compensación con componentes fijo/variable.",
                "concession_sequence": "Primero estructura del paquete, después timing.",
                "counterpart_hypothesis": "Valoran retención, pero intentarán diferir costo fijo.",
            },
            "risk": {
                "emotional_variable": "Frustración acumulada.",
                "main_risk": "Negociar desde molestia y no desde criterios.",
                "key_signal": "Si evitan criterios objetivos y hablan solo de restricciones generales.",
            },
        },
    },
    {
        "id": "contrato_b2b_terminos",
        "title": "Términos de contrato B2B",
        "ideal_for": "Clase 2 · Preparación avanzada en acuerdos complejos.",
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
                "counterpart_perceived_strength": "Comprador concentra volumen y presiona por descuentos.",
                "breakpoint": "No aceptar SLA exigente sin contraprestación económica.",
            },
            "strategy": {
                "estimated_zopa": "Descuento moderado a cambio de volumen y plazos.",
                "concession_sequence": "Conceder reporting antes que precio.",
                "counterpart_hypothesis": "Buscan bajar riesgo de abastecimiento más que precio extremo.",
            },
            "risk": {
                "emotional_variable": "Exceso de confianza por relación histórica.",
                "main_risk": "Conceder términos legales sin medir impacto.",
                "key_signal": "Si piden ampliar penalidades sin revisar contraprestaciones.",
            },
        },
    },
    {
        "id": "licitacion_negotiauction",
        "title": "Licitación competitiva (negotiauction)",
        "ideal_for": "Clase 3 · Tácticas de presión y contramedidas.",
        "mode": FeedbackMode.CURSO,
        "preparation": {
            "context": {
                "negotiation_type": "Licitación / negotiauction",
                "impact_level": "Alto",
                "counterpart_relationship": "Nueva relación",
            },
            "objective": {
                "explicit_objective": "Ganar contrato anual sin destruir margen.",
                "real_objective": "Entrar como proveedor confiable con opción de expansión.",
                "minimum_acceptable_result": "Precio piso respetado y condiciones de servicio viables.",
            },
            "power_alternatives": {
                "maan": "Priorizar otras oportunidades del pipeline.",
                "counterpart_perceived_strength": "El comprador usa competencia para presionar precio.",
                "breakpoint": "No aceptar precio por debajo del umbral de rentabilidad.",
            },
            "strategy": {
                "estimated_zopa": "Variantes por alcance, soporte y tiempos.",
                "concession_sequence": "Presentar paquetes simultáneos y concesión recíproca.",
                "counterpart_hypothesis": "El decisor valora confiabilidad y reducción de riesgo.",
            },
            "risk": {
                "emotional_variable": "Temor a perder la cuenta.",
                "main_risk": "Entrar en espiral de concesiones.",
                "key_signal": "Si pide última mejora sin criterio de adjudicación.",
            },
        },
    },
    {
        "id": "contraparte_dificil_presion",
        "title": "Relación en tensión con contraparte difícil",
        "ideal_for": "Clase 3 · Manejo de conflicto y reencuadre.",
        "mode": FeedbackMode.CURSO,
        "preparation": {
            "context": {
                "negotiation_type": "Negociación con contraparte difícil",
                "impact_level": "Alto",
                "counterpart_relationship": "Largo plazo",
            },
            "objective": {
                "explicit_objective": "Sostener condiciones viables frente a presión/ultimátum.",
                "real_objective": "Mover la conversación de posiciones a intereses y preservar el vínculo de trabajo.",
                "minimum_acceptable_result": "Acuerdo transitorio con revisión y métricas compartidas.",
            },
            "power_alternatives": {
                "maan": "Activar alternativa parcial para no quedar rehén de una sola opción.",
                "counterpart_perceived_strength": "Usa presión para acelerar concesiones.",
                "breakpoint": "No convalidar cambios críticos sin reciprocidad.",
            },
            "strategy": {
                "estimated_zopa": "Ajuste escalonado contra compromisos verificables.",
                "concession_sequence": "Pausa táctica + propuesta alternativa + cierre por escrito + follow-up de satisfacción.",
                "counterpart_hypothesis": "Detrás del ultimátum hay restricciones de tiempo o caja.",
            },
            "risk": {
                "emotional_variable": "Frustración por tono confrontativo.",
                "main_risk": "Escalar a dinámica ganar/perder y deteriorar la confianza para futuras rondas.",
                "key_signal": "Si vuelve a amenazas sin explorar criterios objetivos ni reconocer avances previos.",
            },
        },
    },
    {
        "id": "cierre_e_implementacion",
        "title": "Cierre e implementación del acuerdo",
        "ideal_for": "Clase 4 · Cierre, seguimiento y ejecución.",
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
                "counterpart_perceived_strength": "Presiona por deadline para reabrir puntos cerrados.",
                "breakpoint": "No otorgar concesiones finales sin ajuste equivalente.",
            },
            "strategy": {
                "estimated_zopa": "Rango de cierre con reciprocidad explícita.",
                "concession_sequence": "Concesión solo contra compromiso implementable y verificable.",
                "counterpart_hypothesis": "Necesita mostrar victoria interna y certidumbre de ejecución.",
            },
            "risk": {
                "emotional_variable": "Ansiedad por cerrar rápido.",
                "main_risk": "Firmar sin gobernanza de implementación.",
                "key_signal": "Si evita definir responsables o fechas de seguimiento.",
            },
        },
    },
    {
        "id": "oferta_laboral_no_negociable",
        "title": "Oferta laboral “no negociable”",
        "ideal_for": "Clase 1/3 · Persuasión con límites de política.",
        "mode": FeedbackMode.CURSO,
        "preparation": {
            "context": {
                "negotiation_type": "Oferta laboral no negociable",
                "impact_level": "Medio",
                "counterpart_relationship": "Nueva relación",
            },
            "objective": {
                "explicit_objective": "Mejorar oferta sin tensionar la relación inicial.",
                "real_objective": "Ajustar componentes negociables del paquete sin insistir en lo bloqueado por política.",
                "minimum_acceptable_result": "Compromiso de revisión salarial + mejora en al menos un componente no monetario.",
            },
            "power_alternatives": {
                "maan": "Mantener proceso abierto con alternativas externas y continuidad temporal en situación actual.",
                "counterpart_perceived_strength": "Se ampara en bandas y política de compensación estándar.",
                "breakpoint": "No aceptar paquete que quede por debajo de umbral mínimo total definido.",
            },
            "strategy": {
                "estimated_zopa": "Compensación total vía estructura (bono, revisión, alcance de rol, flexibilidad).",
                "concession_sequence": "Priorizar 2 temas críticos y pedir criterios objetivos de banda antes de hacer concesiones.",
                "counterpart_hypothesis": "Quiere cerrar rápido y evitar precedentes, pero puede flexibilizar timing y componentes.",
            },
            "risk": {
                "emotional_variable": "Ansiedad por perder la oferta.",
                "main_risk": "Presionar demasiados puntos a la vez y provocar retiro o enfriamiento de la propuesta.",
                "key_signal": "Si repiten “no negociable” sin explicar límites concretos ni criterios de excepción.",
            },
        },
    },
]
