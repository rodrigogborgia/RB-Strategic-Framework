from __future__ import annotations

from .models import FeedbackMode
from .schemas import (
    AnalysisOutput,
    ConcessionMap,
    ConcessionMapItem,
    DebriefComparative,
    DebriefComparativeItem,
    DebriefInput,
    ObjectionResponse,
    PowerDashboard,
    PreNegotiationSummary,
    PreparationInput,
    PracticalSparring,
    RolePlayExerciseResult,
    RiskMatrix,
    RiskMatrixItem,
)


CERTIFICATION_EXERCISE_SERIES: list[dict[str, str]] = [
    {"id": "smb_discount_pressure", "label": "SMB - Descuento agresivo de cierre", "segment": "smb"},
    {"id": "smb_payment_terms", "label": "SMB - Términos de pago bajo presión", "segment": "smb"},
    {"id": "mid_procurement_attack", "label": "Mid-market - Ataque de compras al precio", "segment": "mid_market"},
    {"id": "mid_stakeholder_split", "label": "Mid-market - Intereses cruzados de stakeholders", "segment": "mid_market"},
    {"id": "ent_legal_delay", "label": "Enterprise - Dilación legal y compliance", "segment": "enterprise"},
    {"id": "ent_global_framework", "label": "Enterprise - Acuerdo marco multinacional", "segment": "enterprise"},
    {"id": "cold_client_unlock", "label": "Cliente frío - activar rapport real", "segment": "mid_market"},
    {"id": "false_urgency_trap", "label": "Treta sucia - urgencia falsa", "segment": "enterprise"},
    {"id": "closing_nibble_trap", "label": "Treta sucia - pedido extra al cierre", "segment": "smb"},
]


RECOMMENDED_DISCOVERY_QUESTIONS: list[str] = [
    "¿Qué problema de negocio intentan evitar aunque no esté explicitado en el RFP?",
    "¿Qué riesgo personal o político tendría para vos elegir esta alternativa?",
    "Si este acuerdo falla en 6 meses, ¿qué habría pasado internamente?",
    "¿Qué condición tendría que cumplirse para que esto sea un sí sin concesiones forzadas?",
    "¿Qué restricciones no visibles hoy están condicionando esta negociación?",
]


def _contains_any(text: str, tokens: list[str]) -> bool:
    lowered = text.lower()
    return any(token in lowered for token in tokens)


def _assess_urgency(text: str) -> str:
    """Evalúa nivel de urgencia basándose en palabras clave"""
    if _contains_any(text, ["urgente", "inmediato", "ya", "ahora", "hoy", "deadline", "mañana", "pronto", "rápido"]):
        return "alta"
    elif _contains_any(text, ["no urgente", "flexible", "tiempo", "explorator", "largo plazo", "sin prisa"]):
        return "baja"
    return "media"


def _build_power_dashboard(data: PreparationInput) -> PowerDashboard:
    """Construye el dashboard de poder relativo"""
    your_urgency = _assess_urgency(
        data.context.impact_level + " " + data.objective.minimum_acceptable_result + " " + data.risk.main_risk
    )
    
    counterpart_urgency = _assess_urgency(
        data.power_alternatives.counterpart_perceived_strength + " " + data.strategy.counterpart_hypothesis
    )
    
    # Determinar poder relativo
    maan_strong = _contains_any(
        data.power_alternatives.maan,
        ["alternativa", "plan b", "opción", "otra empresa", "proveedor alternativo", "oferta", "competidor"]
    )
    
    counterpart_strong = _contains_any(
        data.power_alternatives.counterpart_perceived_strength,
        ["fuerte", "monopolio", "dominante", "único", "exclusivo", "no alternativa", "dependencia"]
    )
    
    # Lógica de poder relativo
    if maan_strong and not counterpart_strong and your_urgency != "alta":
        assessment = "favorable"
        explanation = "Tienes MAAN claro y la contraparte parece tener limitaciones estructurales."
    elif counterpart_strong and not maan_strong:
        assessment = "desfavorable"
        explanation = "Tu MAAN es débil o poco específico y la contraparte tiene alta fortaleza percibida."
    elif your_urgency == "alta" and counterpart_urgency == "baja":
        assessment = "desfavorable"
        explanation = "Tu urgencia es mayor que la de la contraparte, lo que reduce tu poder de negociación."
    elif your_urgency == "baja" and counterpart_urgency == "alta":
        assessment = "favorable"
        explanation = "La contraparte parece tener mayor urgencia, lo que aumenta tu poder relativo."
    else:
        assessment = "equilibrado"
        explanation = "Ambas partes tienen alternativas y urgencias comparables."
    
    # Extraer hipótesis de MAAN de contraparte
    counterpart_maan = data.strategy.counterpart_hypothesis if data.strategy.counterpart_hypothesis else "No especificado en hipótesis"
    
    return PowerDashboard(
        your_maan=data.power_alternatives.maan,
        your_maan_value=None,  # Podría extraerse si hay números
        your_urgency=your_urgency,
        counterpart_maan_hypothesis=counterpart_maan,
        counterpart_urgency=counterpart_urgency,
        relative_power_assessment=assessment,
        power_explanation=explanation,
    )


def _build_risk_matrix(data: PreparationInput) -> RiskMatrix:
    """Construye matriz de riesgos priorizada"""
    risks: list[RiskMatrixItem] = []
    
    # Riesgo principal (siempre presente)
    main_impact = "crítico" if _contains_any(
        data.context.impact_level,
        ["alto", "crítico", "estratégico", "vital", "decisivo"]
    ) else "alto"
    
    main_prob = "alta" if data.risk.main_risk else "media"
    
    risks.append(RiskMatrixItem(
        risk_description=data.risk.main_risk,
        probability=main_prob,
        impact=main_impact,
        alert_signal=data.risk.key_signal if data.risk.key_signal else "No definida",
        contingency_plan=data.power_alternatives.breakpoint if data.power_alternatives.breakpoint else "Activar MAAN",
    ))
    
    # Riesgo emocional (si existe)
    if data.risk.emotional_variable:
        risks.append(RiskMatrixItem(
            risk_description=f"Riesgo emocional: {data.risk.emotional_variable}",
            probability="media",
            impact="alto",
            alert_signal="Cambio en tono, interrupción, reacción defensiva",
            contingency_plan="Pausa táctica, respiración, volver a objetivo real",
        ))
    
    # Riesgo de concesión prematura (si se detecta)
    if _contains_any(data.strategy.concession_sequence, ["rápido", "inmediato", "flexible", "ceder"]):
        risks.append(RiskMatrixItem(
            risk_description="Riesgo de ceder valor demasiado temprano",
            probability="media",
            impact="medio",
            alert_signal="Presión para cerrar rápido, 'última oferta'",
            contingency_plan="Regla: esperar al menos 2 contraofertas antes de mover",
        ))
    
    # Riesgo relacional (si hay relación en curso)
    if _contains_any(data.context.counterpart_relationship, ["largo plazo", "en curso", "recurrente", "cliente"]):
        risks.append(RiskMatrixItem(
            risk_description="Riesgo de dañar relación de largo plazo",
            probability="media",
            impact="alto",
            alert_signal="Tono defensivo, pérdida de rapport",
            contingency_plan="Transparencia de criterios, cierre con próximos pasos claros",
        ))
    
    return RiskMatrix(risks=risks)


def _build_concession_map(data: PreparationInput) -> ConcessionMap:
    """Construye mapa explícito de margen de maniobra"""
    concessions: list[ConcessionMapItem] = []
    
    # Objetivo aspiracional
    concessions.append(ConcessionMapItem(
        level="aspiracional",
        value=data.objective.explicit_objective,
        condition="Si logro condiciones ideales",
        order=1,
    ))
    
    # Valor de reserva / mínimo aceptable
    if data.objective.minimum_acceptable_result:
        concessions.append(ConcessionMapItem(
            level="valor_reserva",
            value=data.objective.minimum_acceptable_result,
            condition="Límite mínimo - no bajar de esto",
            order=3,
        ))
    
    # Breakpoint
    if data.power_alternatives.breakpoint:
        concessions.append(ConcessionMapItem(
            level="breakpoint",
            value=data.power_alternatives.breakpoint,
            condition="Condición para activar MAAN y salir",
            order=4,
        ))
    
    # MAAN value
    concessions.append(ConcessionMapItem(
        level="maan_value",
        value=data.power_alternatives.maan,
        condition="Valor de tu mejor alternativa sin acuerdo",
        order=5,
    ))
    
    # Intentar extraer concesiones intermedias de la secuencia
    if data.strategy.concession_sequence:
        concessions.append(ConcessionMapItem(
            level="primera_concesión",
            value=f"Basado en: {data.strategy.concession_sequence[:100]}...",
            condition="Si la contraparte muestra señales cooperativas",
            order=2,
        ))
    
    # Calcular flexibilidad total (si hay números detectables)
    flexibility = "Definir valores cuantitativos específicos para calcular margen exacto"
    
    return ConcessionMap(
        concessions=sorted(concessions, key=lambda x: x.order),
        total_flexibility=flexibility,
    )


def _build_pre_negotiation_summary(
    data: PreparationInput, 
    power_dashboard: PowerDashboard, 
    inconsistencies: list[str]
) -> PreNegotiationSummary:
    """Genera síntesis ejecutiva para llevar a la mesa"""
    
    # Posición de poder
    power_map = {
        "favorable": "fuerte",
        "equilibrado": "equilibrada",
        "desfavorable": "débil"
    }
    power_position = f"{power_map[power_dashboard.relative_power_assessment]} ({power_dashboard.power_explanation})"
    
    # Key moves (máximo 3)
    key_moves = []
    
    # Move 1: Apertura
    key_moves.append(f"Apertura: Plantear objetivo '{data.objective.explicit_objective}' y explorar intereses mutuos")
    
    # Move 2: Basado en estrategia
    if data.strategy.concession_sequence:
        key_moves.append(f"Secuencia: {data.strategy.concession_sequence[:80]}...")
    else:
        key_moves.append("Escuchar y mapear alternativas antes de mover")
    
    # Move 3: Cierre
    if data.power_alternatives.breakpoint:
        key_moves.append(f"Límite: Si llegan a '{data.power_alternatives.breakpoint[:60]}...', activar MAAN")
    else:
        key_moves.append("Validar intención de obligarse y plan de implementación antes de cerrar")
    
    # Señal crítica
    critical_signal = data.risk.key_signal if data.risk.key_signal else "Observar cambios en tono y disposición a reciprocar información"
    
    # Línea roja
    red_line = data.objective.minimum_acceptable_result if data.objective.minimum_acceptable_result else data.power_alternatives.breakpoint
    if not red_line:
        red_line = "Definir valor de reserva concreto antes de entrar"
    
    # Plan B si se traba
    if_stalled = f"Activar MAAN: {data.power_alternatives.maan[:80]}"
    if _contains_any(data.strategy.counterpart_hypothesis, ["pausa", "break", "tiempo"]):
        if_stalled = "Solicitar pausa táctica y revisar con equipo/coach"
    
    return PreNegotiationSummary(
        power_position=power_position,
        key_moves=key_moves[:3],  # Máximo 3
        critical_signal=critical_signal,
        red_line=red_line,
        if_stalled=if_stalled,
    )


def _build_practical_sparring(data: PreparationInput, mode: FeedbackMode) -> PracticalSparring:
    """Genera bloque de entrenamiento práctico previo a la conversación."""
    explicit_objective = data.objective.explicit_objective.strip() or "propuesta de valor"
    primary_risk = data.risk.main_risk.strip() or "quedar difuso en el diagnóstico"
    counterpart = data.context.counterpart_relationship.strip().lower()
    negotiation_type = data.context.negotiation_type.strip().lower()

    relation_hint = "primera conversación" if "nueva" in counterpart else "conversación de continuidad"
    pilot_hint = "piloto corto" if _contains_any(negotiation_type, ["b2b", "contrato", "empresa", "proveedor"]) else "prueba acotada"

    pre_meeting_actions = [
        "Definí en una línea el resultado de negocio que querés habilitar (no solo la solución que ofrecés).",
        "Prepará 2 espejos de empatía táctica (nombrar presión + validar contexto) antes de presentar propuesta.",
        f"Ensayá una versión de 45 segundos para explicar '{explicit_objective}' conectándolo con impacto comercial y cuidado de margen.",
    ]

    empathy_openers = [
        f"Parece que hoy están sosteniendo mucha presión comercial en esta {relation_hint}, ¿es así?",
        "Suena a que ya probaron capacitaciones y no siempre vieron cambios reales en conversación y cierre.",
        "Tiene sentido que prioricen proteger margen sin frenar al equipo en la operación diaria.",
    ]

    no_oriented_questions = [
        "¿Sería una mala idea explorar esto 10 minutos y después decidís si seguimos o no?",
        "¿Te complicaría si empezamos por el problema más costoso antes de hablar de programa?",
        f"¿Sería una locura testear un {pilot_hint} en vez de mover a toda la fuerza de venta de una?",
    ]

    objection_responses = [
        ObjectionResponse(
            objection="No tenemos tiempo para capacitar al equipo ahora.",
            response=(
                f"Lo entiendo. Por eso propongo {pilot_hint} con un solo frente crítico, para medir impacto sin frenar operación. "
                "Si no mueve conversaciones reales, no escalamos."
            ),
        ),
        ObjectionResponse(
            objection="Ya hicimos capacitaciones y no cambiaron resultados.",
            response=(
                "Tiene sentido esa objeción. La diferencia acá es práctica sobre casos reales del equipo, "
                "con foco en objeciones complejas y seguimiento de implementación."
            ),
        ),
    ]

    micro_practice = [
        "Práctica 1 (60s): espejo de empatía + silencio breve + validación ('¿voy bien hasta acá?').",
        "Práctica 2 (60s): pregunta orientada al no para bajar defensividad y recuperar control conversacional.",
        f"Práctica 3 (90s): responder la objeción principal sin justificarte ni sobreexplicar el riesgo '{primary_risk}'.",
        "Práctica 4 (45s): cerrar con siguiente paso concreto (fecha, responsable y criterio de éxito).",
    ]

    micro_practice = micro_practice[:4]

    closing_next_step = (
        "Si hay interés, proponé cierre con compromiso mínimo: reunión de diseño con decisor + definición de objetivo del piloto en 7 días."
    )
    if mode == FeedbackMode.CURSO:
        closing_next_step = (
            "Cerrá pidiendo una micro-validación observable: qué señal concreta confirmarías en la próxima reunión para saber si avanzás bien."
        )

    return PracticalSparring(
        pre_meeting_actions=pre_meeting_actions,
        empathy_openers=empathy_openers,
        no_oriented_questions=no_oriented_questions,
        objection_responses=objection_responses,
        micro_practice=micro_practice,
        closing_next_step=closing_next_step,
    )


def _contains_any(text: str, tokens: list[str]) -> bool:
    lowered = text.lower()
    return any(token in lowered for token in tokens)


def analyze_preparation(data: PreparationInput, mode: FeedbackMode) -> AnalysisOutput:
    inconsistencies: list[str] = []
    clarification_questions: list[str] = []
    observations: list[str] = []
    suggestions: list[str] = []
    next_steps: list[str] = []

    if data.objective.explicit_objective.strip().lower() == data.objective.real_objective.strip().lower():
        inconsistencies.append(
            "Objetivo explícito y objetivo real están definidos de forma idéntica; falta tensión estratégica explícita."
        )

    if not _contains_any(data.power_alternatives.maan, ["alternativa", "plan b", "opción", "proveedor", "cliente"]):
        clarification_questions.append(
            "¿Tu MAAN describe una alternativa accionable y específica si no hay acuerdo?"
        )

    if _contains_any(data.risk.main_risk, ["emoc", "ansiedad", "enojo", "frustr"]) and not _contains_any(
        data.risk.emotional_variable, ["emoc", "ansiedad", "enojo", "frustr"]
    ):
        inconsistencies.append(
            "El riesgo principal parece emocional, pero la variable emocional propia no está alineada."
        )

    if not _contains_any(
        data.strategy.concession_sequence + " " + data.risk.main_risk,
        ["ética", "candor", "buena fe", "justicia", "transpar", "límite táctico", "no mentir"],
    ):
        suggestions.append(
            "Antes de ejecutar, explicitá un estándar ético mínimo: qué no vas a falsear, qué presión no vas a usar y qué criterio de justicia vas a sostener."
        )

    if _contains_any(
        data.strategy.concession_sequence + " " + data.risk.main_risk,
        ["amenaza", "ultim", "presión", "forzar", "arrincon", "dirty", "hardball"],
    ) and not _contains_any(
        data.strategy.concession_sequence + " " + data.risk.key_signal,
        ["límite", "resumen", "pausa", "regla", "reciproc", "respeto"],
    ):
        observations.append(
            "Si usás táctica dura, definí límites explícitos para no deteriorar legitimidad ni relación futura."
        )

    if not _contains_any(
        data.power_alternatives.maan + " " + data.power_alternatives.breakpoint,
        ["valor esperado", "probab", "%", "escenario", "costo", "litig", "best alternative", "batna"],
    ):
        clarification_questions.append(
            "¿Tu BATNA está cuantificada en valor esperado (escenarios, probabilidades y costos), no solo descrita en términos generales?"
        )

    if not _contains_any(
        data.objective.minimum_acceptable_result + " " + data.power_alternatives.breakpoint,
        ["reserva", "mínimo", "walk-away", "punto de retiro", "umbral"],
    ):
        suggestions.append(
            "Definí un valor de reserva explícito (umbral de aceptación) traducido a términos comparables con la oferta en mesa."
        )

    if not _contains_any(
        data.strategy.counterpart_hypothesis + " " + data.power_alternatives.counterpart_perceived_strength,
        ["batna", "alternativa", "sin acuerdo", "plan b", "segunda opción", "outside option"],
    ):
        observations.append(
            "Falta estimación explícita del BATNA de la contraparte; eso puede sesgar tu lectura de poder relativo."
        )

    if _contains_any(data.context.negotiation_type, ["empresa", "b2b", "proveedor", "contrato", "compra"]) and not _contains_any(
        data.objective.minimum_acceptable_result + " " + data.strategy.concession_sequence,
        ["comparable", "equivalente", "alcance", "cobertura", "servicio", "riesgo", "tco", "implement"],
    ):
        clarification_questions.append(
            "¿Ya tradujiste tu alternativa externa a términos comparables con esta oferta (alcance, riesgo, implementación y costo total)?"
        )

    if _contains_any(data.strategy.concession_sequence, ["rápido", "inmediato", "todo", "primera oferta"]):
        observations.append("La secuencia de concesiones sugiere riesgo de ceder valor demasiado temprano.")

    if _contains_any(data.objective.explicit_objective, ["precio", "tarifa", "salario", "fee"]) and not _contains_any(
        data.strategy.concession_sequence,
        ["plazo", "volumen", "calidad", "servicio", "garant", "riesgo", "sla", "gobernanza"],
    ):
        clarification_questions.append(
            "¿Qué variables no monetarias podés sumar para convertir esta conversación en una negociación multi-issue?"
        )

    if _contains_any(data.context.negotiation_type, ["contrato", "b2b", "proveedor"]) and not _contains_any(
        data.objective.minimum_acceptable_result + " " + data.risk.main_risk,
        ["revisión", "renegoci", "mediación", "arbitra", "disputa"],
    ):
        inconsistencies.append(
            "En una negociación contractual no aparece un mecanismo explícito de revisión o manejo de disputas."
        )

    if _contains_any(data.context.negotiation_type, ["beauty", "licitación", "negotiauction", "concurso"]):
        if not _contains_any(data.strategy.concession_sequence, ["opción", "paquete", "alternativa"]):
            clarification_questions.append(
                "En contexto competitivo, ¿qué paquetes simultáneos vas a presentar para evitar competir solo por precio?"
            )
        if not _contains_any(data.risk.key_signal, ["exclus", "ahora", "cierre", "hoy"]):
            observations.append(
                "Podría faltar una táctica de cierre tipo 'shut-down move' para limitar el ida y vuelta con competidores."
            )

    if not _contains_any(data.strategy.counterpart_hypothesis, ["pregunt", "inform", "abr", "interes", "reciproc"]):
        suggestions.append(
            "Incorporá una secuencia explícita de intercambio de información: revelar una variable propia y pedir reciprocidad."
        )

    if not _contains_any(data.risk.key_signal, ["si", "cuando", "señal", "indicador", "pregunta"]):
        clarification_questions.append(
            "¿Qué indicador observable te confirmará que debes sostener o cambiar la estrategia?"
        )

    if _contains_any(
        data.power_alternatives.counterpart_perceived_strength + " " + data.risk.main_risk,
        ["difícil", "duro", "ultim", "amenaz", "hostil", "agres", "no negociable", "presión"],
    ):
        if not _contains_any(
            data.strategy.concession_sequence,
            ["pausa", "break", "balcón", "tiempo", "norma", "protocolo", "regla", "resumen"],
        ):
            suggestions.append(
                "Definí un protocolo de manejo de escalada: pausa táctica, reglas de interacción y cierre de cada sesión por escrito."
            )

    if _contains_any(
        data.power_alternatives.counterpart_perceived_strength + " " + data.context.counterpart_relationship,
        ["asimetr", "domin", "muy fuerte", "jerarqu", "senior", "monopol", "dependencia"],
    ) and not _contains_any(
        data.strategy.counterpart_hypothesis + " " + data.risk.key_signal,
        ["proceso", "turno", "voz", "sesgo", "estatus", "género", "raza", "tercero", "respaldo"],
    ):
        clarification_questions.append(
            "¿Qué ajuste de proceso usarás para compensar asimetrías de poder (turnos, respaldo, tercero neutral o validación escrita)?"
        )

    if not _contains_any(
        data.power_alternatives.maan + " " + data.power_alternatives.breakpoint,
        ["batna", "alternativa", "walk", "retiro", "salir", "plan b", "límite"],
    ):
        clarification_questions.append(
            "¿Cuál es tu BATNA operativo y qué condición concreta activa tu salida de la negociación?"
        )

    if _contains_any(data.risk.main_risk, ["emoc", "enojo", "frustr", "ansiedad", "reacción"]) and not _contains_any(
        data.strategy.concession_sequence,
        ["pregunta", "escuchar", "parafrase", "interés", "reencuadre", "yes", "propuesta"],
    ):
        inconsistencies.append(
            "Reconocés riesgo emocional, pero la estrategia no explicita técnicas de escucha activa ni reencuadre."
        )

    if not _contains_any(
        data.strategy.counterpart_hypothesis,
        ["restric", "autoridad", "precedente", "presupuesto", "abogado", "superior", "instrucción"],
    ):
        observations.append(
            "Podrían faltar hipótesis sobre restricciones ocultas de la contraparte (autoridad, precedentes, presupuesto o legales)."
        )

    if _contains_any(data.context.negotiation_type, ["contrato", "alianza", "joint", "proveedor", "b2b"]) and not _contains_any(
        data.strategy.counterpart_hypothesis + " " + data.objective.minimum_acceptable_result,
        ["implement", "seguimiento", "gobernanza", "responsable", "comité", "hito"],
    ):
        inconsistencies.append(
            "El diseño prioriza cierre, pero no explicita cómo se implementará ni quién gobernará el acuerdo después de firmar."
        )

    if not _contains_any(
        data.strategy.concession_sequence,
        ["táct", "interpersonal", "diseño", "setup", "secuencia", "actor", "orden"],
    ):
        suggestions.append(
            "Hacé un mini 3D audit: táctica en mesa, diseño de propuestas y setup (quién decide, en qué orden y con qué proceso)."
        )

    if _contains_any(data.risk.main_risk, ["cierre", "firma", "último", "deadline", "demora"]) and not _contains_any(
        data.risk.key_signal + " " + data.strategy.concession_sequence,
        ["barrera", "impasse", "consecuencia", "plazo", "deadline", "tercero", "mediación"],
    ):
        clarification_questions.append(
            "Si el cierre se traba, ¿qué barrera principal esperás (táctica, diseño o setup) y qué acción concreta aplicarás?"
        )

    if _contains_any(data.objective.explicit_objective, ["máximo", "muy alto", "agresivo", "techo", "premium"]) and not _contains_any(
        data.strategy.concession_sequence + " " + data.risk.main_risk,
        ["relación", "backlash", "aceptación gradual", "satisfacción", "percepción"],
    ):
        observations.append(
            "Objetivo ambicioso detectado: cuidá el posible backlash relacional con concesiones graduales y cierre percibido como justo."
        )

    if not _contains_any(
        data.strategy.counterpart_hypothesis + " " + data.risk.main_risk,
        ["pregunta difícil", "ultim", "mínimo", "final offer", "hardest"],
    ):
        suggestions.append(
            "Prepará respuesta para la 'pregunta más difícil' (mínimo aceptable, ultimátum o demanda de cierre inmediato) sin revelar de más."
        )

    if _contains_any(data.risk.emotional_variable + " " + data.risk.main_risk, ["ansiedad", "nerv", "miedo", "bloqueo"]) and not _contains_any(
        data.strategy.concession_sequence,
        ["práctica", "role", "ensayo", "coach", "reencuadre", "excitación"],
    ):
        suggestions.append(
            "Incluí un ensayo breve pre-negociación: reencuadre de ansiedad en foco operativo y práctica de primera oferta."
        )

    if _contains_any(data.context.negotiation_type, ["sindicato", "equipo", "coalición", "grupo", "colectiva"]) and not _contains_any(
        data.strategy.concession_sequence,
        ["coalición", "alineación", "mensaje común", "frente"],
    ):
        clarification_questions.append(
            "Si negociás en grupo, ¿cómo vas a mantener mensaje común y disciplina de coalición durante la presión final?"
        )

    if _contains_any(data.context.negotiation_type, ["sindicato", "equipo", "coalición", "grupo", "colectiva", "familiar"]) and not _contains_any(
        data.strategy.counterpart_hypothesis + " " + data.strategy.concession_sequence,
        ["matriz", "prioridad", "alianza", "bloque", "voto", "paquete por actor"],
    ):
        suggestions.append(
            "En multiparte, usá una mini matriz por actor (prioridades, BATNA y posible alineación) para anticipar cambios de coalición."
        )

    if _contains_any(
        data.power_alternatives.maan,
        ["invert", "investig", "tiempo", "costoso", "caro", "consultor", "due diligence"],
    ) and not _contains_any(
        data.strategy.concession_sequence + " " + data.risk.main_risk,
        ["buena fe", "ética", "relación", "reciproc", "transpar", "largo plazo"],
    ):
        observations.append(
            "Si invertiste mucho en alternativas, vigilá sesgo de entitlement/costos hundidos para no endurecerte de más y dañar la relación."
        )

    if _contains_any(data.context.negotiation_type, ["salar", "oferta laboral", "compensación", "empleo"]):
        if not _contains_any(
            data.objective.minimum_acceptable_result + " " + data.strategy.concession_sequence,
            ["desarrollo", "rol", "aprendiz", "mentor", "revisión", "crecimiento", "proyecto", "flex"],
        ):
            suggestions.append(
                "Además del salario, incluí 1-2 variables de valor futuro (revisión, alcance de rol, desarrollo o flexibilidad)."
            )

        if not _contains_any(
            data.strategy.counterpart_hypothesis + " " + data.power_alternatives.counterpart_perceived_strength,
            ["banda", "política", "paquete", "no negociable", "estándar", "hr", "recruit"],
        ):
            clarification_questions.append(
                "¿Qué parte del paquete es realmente no negociable y qué parte sí admite ajustes (timing, estructura, revisión)?"
            )

        if _contains_any(data.strategy.concession_sequence, ["lista", "todo", "muchas", "varias demandas"]) or _contains_any(
            data.risk.main_risk,
            ["rechazo", "revocar", "retirar oferta"],
        ):
            observations.append(
                "En ofertas laborales conviene priorizar 2-3 temas críticos para evitar sobrecargar la contraparte y deteriorar la relación."
            )

        if not _contains_any(data.power_alternatives.maan, ["proceso", "otra oferta", "mercado", "alternativa", "actual"]):
            inconsistencies.append(
                "La estrategia salarial no explicita alternativa externa/interna; eso debilita tu poder de negociación percibido."
            )

    if _contains_any(data.context.counterpart_relationship, ["largo", "en curso", "nueva"]) and not _contains_any(
        data.strategy.concession_sequence + " " + data.strategy.counterpart_hypothesis,
        ["rapport", "confianza", "alineación", "small talk", "transpar", "seguimiento", "check-in"],
    ):
        suggestions.append(
            "Para cuidar la relación, definí una micro-rutina: apertura de rapport, transparencia de criterios y cierre con próximos pasos explícitos."
        )

    if _contains_any(data.risk.main_risk, ["relación", "confianza", "resent", "fricción"]) and not _contains_any(
        data.risk.key_signal + " " + data.strategy.concession_sequence,
        ["expectativa", "satisfacción", "compar", "explicación", "percepción"],
    ):
        clarification_questions.append(
            "¿Cómo vas a gestionar expectativas y percepción de justicia para evitar que la otra parte “cobre” en la próxima negociación?"
        )

    if _contains_any(data.context.negotiation_type, ["familiar", "sucesión", "socios"]) and not _contains_any(
        data.strategy.concession_sequence + " " + data.risk.key_signal,
        ["neutral", "mediación", "tercero", "proceso", "transpar"],
    ):
        observations.append(
            "En negociaciones con alto componente relacional conviene prever un tercero neutral y reglas de transparencia desde el inicio."
        )

    if not _contains_any(
        data.strategy.concession_sequence + " " + data.strategy.counterpart_hypothesis,
        ["debrief", "aprendiz", "analog", "transfer", "observ", "feedback"],
    ):
        suggestions.append(
            "Para consolidar aprendizaje, agregá un mini debrief estructurado: qué patrón funcionó, qué ajustar y cómo transferirlo al próximo caso."
        )

    if _contains_any(data.context.negotiation_type, ["simul", "entren", "clase"]) and not _contains_any(
        data.risk.main_risk + " " + data.risk.key_signal,
        ["ganar", "perder", "compet", "estrés", "defensiv", "hábito"],
    ):
        observations.append(
            "En simulación, además del resultado, monitoreá sesgos de desempeño (miedo a perder, rigidez, reacción defensiva)."
        )

    if _contains_any(data.context.negotiation_type, ["online", "virtual", "remota", "video", "zoom", "email", "mail"]):
        if not _contains_any(
            data.strategy.concession_sequence + " " + data.risk.key_signal,
            ["canal", "video", "llamada", "email", "sincr", "asincr", "chat"],
        ):
            clarification_questions.append(
                "¿Qué canal usarás en cada fase (alineación por videollamada, iteración por escrito y cierre por recap)?"
            )

        if _contains_any(data.context.negotiation_type + " " + data.strategy.concession_sequence, ["email", "mail", "asincr"]) and not _contains_any(
            data.strategy.concession_sequence + " " + data.risk.key_signal,
            ["plazo de respuesta", "cadencia", "48h", "24h", "resumen", "confirmación escrita"],
        ):
            suggestions.append(
                "En tramos por e-mail, definí cadencia de respuesta y cierre de cada ronda con resumen escrito para reducir malentendidos."
            )

        if _contains_any(data.context.negotiation_type + " " + data.strategy.concession_sequence, ["video", "zoom", "meet", "teams"]) and not _contains_any(
            data.strategy.concession_sequence + " " + data.risk.main_risk,
            ["rapport", "confianza", "apertura", "agenda", "turnos", "sin interrup"],
        ):
            observations.append(
                "En videonegociación conviene explicitar una apertura breve de rapport y reglas de interacción (agenda, turnos y recap)."
            )

    if _contains_any(data.risk.main_risk, ["malentendido", "interpret", "tono", "fricción digital"]) and not _contains_any(
        data.strategy.concession_sequence + " " + data.risk.key_signal,
        ["parafrase", "resumen", "confirmación", "check-back", "pregunta de validación"],
    ):
        inconsistencies.append(
            "Hay riesgo de malentendidos, pero no aparece un protocolo explícito de validación (paráfrasis + confirmación)."
        )

    if not _contains_any(
        data.strategy.concession_sequence + " " + data.risk.key_signal,
        ["ensayo", "rehears", "simulación", "práctica", "debrief", "aprendiz"],
    ):
        suggestions.append(
            "Antes de negociar, hacé un ensayo breve (10 min) y definí qué indicador revisarás en debrief para sostener aprendizaje transferible."
        )

    if not _contains_any(
        data.strategy.concession_sequence + " " + data.risk.key_signal,
        ["hábito", "microconducta", "si pasa", "entonces", "provoc", "coach", "interrup"],
    ):
        suggestions.append(
            "Definí una microconducta observable para practicar bajo presión (por ejemplo: pausar, parafrasear y preguntar antes de conceder)."
        )

    if _contains_any(data.context.negotiation_type, ["empresa", "b2b", "proveedor", "interna", "equipo"]) and not _contains_any(
        data.power_alternatives.counterpart_perceived_strength + " " + data.strategy.counterpart_hypothesis,
        ["incentivo", "métrica", "autoridad", "proceso", "estructura", "aprobación", "presupuesto"],
    ):
        observations.append(
            "Podrían faltar restricciones estructurales de la organización (métricas, incentivos, autoridad o proceso) que impactan el resultado."
        )

    if not observations:
        observations.append("La preparación cubre variables clave y mantiene un encuadre estratégico consistente.")

    if inconsistencies:
        suggestions.append("Ajustá los bloques en tensión antes de ejecutar para evitar concesiones incoherentes.")
    else:
        suggestions.append("Mantené la estructura actual y refiná la precisión de términos operativos por bloque.")

    if mode == FeedbackMode.CURSO:
        suggestions.append(
            "Conectá cada hipótesis de contraparte con evidencia observable para fortalecer criterio aplicado en clase."
        )
        suggestions.append(
            "Elegí foco pedagógico por ronda (ética, poder o conducta) y evaluá con evidencia observable, no solo con impresiones."
        )
        next_steps.append("Ensayá una apertura de 2 minutos centrada en objetivo real y punto de ruptura.")
    else:
        suggestions.append("Definí una línea roja explícita y el orden exacto de tus concesiones críticas.")
        next_steps.append("Validá MAAN y breakpoint con datos verificables antes de entrar a la reunión.")

    next_steps.append("Documentá la primera señal de cambio de poder esperada durante la conversación.")
    next_steps.append("Prepará una formulación de 'no positivo': interés propio, límite explícito y alternativa de avance.")
    next_steps.append("Antes de cerrar, validá intención de obligarse y un plan de implementación con responsables y hitos.")
    next_steps.append("Definí una respuesta ensayada para ultimátum/pregunta de mínimo aceptable antes de entrar a la reunión.")
    next_steps.append("Programá un debrief de 5 minutos post reunión: qué funcionó, qué no, qué ajustar en el próximo caso.")
    next_steps.append("Agendá un follow-up relacional breve (15 min) para consolidar confianza y prevenir conflictos latentes.")
    next_steps.append("Probá el mismo patrón en un caso análogo para verificar transferencia (no solo mejora en un caso puntual).")
    next_steps.append("Si la negociación es online, secuenciá canales: video para alinear y texto para confirmar compromisos y plazos.")
    next_steps.append("Checklist BATNA 4 pasos: alternativas, valor esperado, BATNA elegida y valor de reserva antes de decidir aceptar/rechazar.")
    next_steps.append("Mapeá BATNA organizacional e individual de la contraparte para ajustar concesiones sin ceder de más.")

    if clarification_questions:
        clarification_questions = clarification_questions[:3]

    score = 100 - (len(inconsistencies) * 20 + len(clarification_questions) * 10)
    if score < 45:
        level = "Inicial"
    elif score < 75:
        level = "Estructurado"
    else:
        level = "Avanzado"

    # Construir dashboards estructurados
    power_dashboard = _build_power_dashboard(data)
    risk_matrix = _build_risk_matrix(data)
    concession_map = _build_concession_map(data)
    pre_negotiation_summary = _build_pre_negotiation_summary(data, power_dashboard, inconsistencies)
    practical_sparring = _build_practical_sparring(data, mode)

    return AnalysisOutput(
        clarification_questions=clarification_questions,
        observations=observations,
        suggestions=suggestions,
        next_steps=next_steps,
        inconsistencies=inconsistencies,
        preparation_level=level,
        power_dashboard=power_dashboard,
        risk_matrix=risk_matrix,
        concession_map=concession_map,
        pre_negotiation_summary=pre_negotiation_summary,
        practical_sparring=practical_sparring,
    )


def analyze_debrief(
    preparation: PreparationInput,
    analysis: AnalysisOutput,
    debrief: DebriefInput,
) -> dict:
    """Segundo análisis automático: Comparar preparación vs. ejecución real.
    
    Genera insights sobre brechas estratégicas, errores, aciertos y oportunidades de mejora.
    """
    strategic_gaps: list[str] = []
    identified_errors: list[str] = []
    confirmed_successes: list[str] = []
    improvement_opportunities: list[str] = []
    personal_patterns: list[str] = []

    # BRECHAS ESTRATÉGICAS: Dónde la preparación no predijo la realidad
    
    # Brecha 1: Objetivo explícito vs. real logrado
    if _contains_any(debrief.real_result.explicit_objective_achieved, ["no", "no logr", "fracas", "no se", "fallé"]):
        strategic_gaps.append(
            f"Brecha crítica: Objetivo explícito no logrado. Preparaste para '{preparation.objective.explicit_objective}' pero no se concretó. "
            f"Posible causa: subestimaste poder relativo de contraparte o sobrestimaste tu MAAN."
        )
    
    # Brecha 2: Señales no observadas
    if _contains_any(debrief.observed_dynamics.where_power_shifted, ["no como", "inesperado", "sorpresa", "cambio"]):
        strategic_gaps.append(
            "Brecha de lectura: El poder se movió de forma distinta a lo esperado. Tu 'key_signal' no detectó la verdadera dinámica. "
            "Revisar qué indicadores realmente predecían cambios en esa negociación."
        )
    
    # Brecha 3: MAAN no fue el que esperabas
    if _contains_any(debrief.real_result.what_remains_open, ["opción", "alternativa", "backup"]) and \
       _contains_any(preparation.power_alternatives.maan + " " + preparation.power_alternatives.breakpoint, 
                    ["no tenía", "no existía", "distinto"]):
        strategic_gaps.append(
            "Brecha en alternativas: Tu MAAN puede haber sido distinto en la negociación real que en la preparación. "
            "Esto afectó tu poder de negociación percibido."
        )

    # ERRORES IDENTIFICADOS
    
    # Error 1: Secuencia de concesiones mal calibrada
    if _contains_any(debrief.self_diagnosis.main_strategic_error, ["concesión", "cedí", "rápido", "temprano", "mucho"]):
        identified_errors.append(
            f"Error estratégico confirmado por ti: {debrief.self_diagnosis.main_strategic_error}. "
            f"Tu preparación indicaba secuencia de concesiones: '{preparation.strategy.concession_sequence}'. "
            f"Aprendizaje: La ejecución validó que tu secuencia estaba mal calibrada."
        )
    
    # Error 2: Hipótesis sobre contraparte falló
    if _contains_any(debrief.observed_dynamics.decisive_objection, ["inesperado", "no anticipé", "no lo vi"]):
        identified_errors.append(
            f"Error en diagnóstico de contraparte: Anticipaste que la contraparte era '{preparation.strategy.counterpart_hypothesis}', "
            f"pero la objeción decisiva fue '{debrief.observed_dynamics.decisive_objection}'. "
            f"Esto sugiere una subestimación en tu lectura de motivaciones reales."
        )
    
    # Error 3: Variable emocional no manejada
    if _contains_any(debrief.self_diagnosis.main_strategic_error, ["emoción", "ansiedad", "frustración", "enojo", "miedo"]) or \
       _contains_any(debrief.observed_dynamics.where_power_shifted, ["emoc", "reac", "frustración"]):
        identified_errors.append(
            f"Gestión emocional: Tu variable emocional preparada era '{preparation.risk.emotional_variable}', "
            f"pero parece que en la ejecución esto afectó tu decisión. Este es un patrón donde práctica deliberada es crítica."
        )

    # ACIERTOS CONFIRMADOS: Qué funcionó exactamente como preparaste
    
    # Acierto 1: Objetivo real logrado
    if _contains_any(debrief.real_result.real_objective_achieved, ["sí", "logré", "se logró", "alcancé", "sí, se"]):
        confirmed_successes.append(
            f"Acierto estratégico: Lograste tu objetivo REAL: '{debrief.real_result.real_objective_achieved}'. "
            f"Ésto valida que tu diferenciación entre objetivo explícito y real estuvo bien pensada."
        )
    
    # Acierto 2: MAAN funcionó como respaldo
    if _contains_any(debrief.real_result.what_remains_open, ["pendiente", "poco", "menor"]) and \
       _contains_any(preparation.power_alternatives.maan, ["alternativa", "opción"]):
        confirmed_successes.append(
            "Acierto en poder de negociación: Tu MAAN te dio respaldo. La preparación fue correcta al definir una alternativa clara."
        )
    
    # Acierto 3: Señal clave observada correctamente
    if _contains_any(debrief.observed_dynamics.decisive_objection, preparation.risk.key_signal):
        confirmed_successes.append(
            f"Acierto en diagnóstico: Detectaste correctamente la señal clave '{preparation.risk.key_signal}' "
            f"que resultó ser la objeción decisiva. Tus skills de observación funcionaron."
        )

    # OPORTUNIDADES DE MEJORA
    
    # Mejora 1: Ciclo de información más denso
    if _contains_any(preparation.strategy.counterpart_hypothesis, ["pregun", "abrir"]) and \
       _contains_any(debrief.observed_dynamics.where_power_shifted, ["inesperado", "sorpresa"]):
        improvement_opportunities.append(
            "En la próxima: Amplía la fase de intercambio de información. Tu estrategia preparada sugería preguntas abiertas, "
            "pero parece que no fue suficiente para mapear las verdaderas limitaciones de la contraparte."
        )
    
    # Mejora 2: Protocolo de manejo de escalada
    if _contains_any(debrief.observed_dynamics.where_power_shifted, ["tensión", "conflicto", "difícil"]) and \
       _contains_any(preparation.strategy.concession_sequence, ["flexible", "ceder"]):
        improvement_opportunities.append(
            "En la próxima: Define explícitamente un protocolo de desescalada (pausas, reglas de turno, cierre escrito). "
            "Parece que necesitarás límites más explícitos en negociaciones con tensión real."
        )
    
    # Mejora 3: Reserva de valor
    if _contains_any(debrief.real_result.what_remains_open, ["precio", "término", "costo"]):
        improvement_opportunities.append(
            "En la próxima: Prepara variables no monetarias adicionales para sumar valor en etapa final. "
            "La negociación se jugó por precio/términos; tienes opciones de ampliar la mesa."
        )
    
    # Mejora 4: Autoconocimiento emocional
    if _contains_any(debrief.self_diagnosis.decision_to_change, ["emoción", "reac", "respuesta"]):
        improvement_opportunities.append(
            f"En la próxima: Prior a ejecutar, ejercita manejo de '{preparation.risk.emotional_variable}'. "
            f"Tu decisión de cambio es '{debrief.self_diagnosis.decision_to_change}'. Esto sugiere sesgo emocional predecible."
        )

    # PATRONES PERSONALES (si aplica - esto sería mejorado en casos múltiples)
    # Por ahora, agregamos un patrón inicial basado en el debrief actual
    
    if _contains_any(debrief.self_diagnosis.main_strategic_error, ["concesión", "cedí", "rápido"]) and \
       _contains_any(debrief.self_diagnosis.decision_to_change, ["no ceder", "más lento", "esperar"]):
        personal_patterns.append(
            "Patrón observado: Tendencia a ceder valor demasiado temprano. En próximas negociaciones, "
            "implementa una regla personal: 'esperar 3 contraoferta antes de mover'."
        )
    
    if _contains_any(debrief.self_diagnosis.main_strategic_error, ["emoción", "ansiedad"]):
        personal_patterns.append(
            "Patrón observado: Gestión emocional es tu punto crítico. Considera preparativa específica: "
            "prácticas de respiración, walk-away script escrito, checkpoint de realidad antes de ceder."
        )

    # Construir comparativa visual
    debrief_comparative = _build_debrief_comparative(preparation, debrief)

    emotional_regulation_score = 60
    listening_balance_score = 60
    role_play_score = 0
    rapport_activation_score = 0
    trap_detection_score = 0
    boundary_control_score = 0

    if debrief.incident_log:
        recoveries = sum(1 for item in debrief.incident_log if item.recovery_action.strip())
        recovery_ratio = recoveries / max(1, len(debrief.incident_log))
        emotional_regulation_score = min(100, 45 + int(recovery_ratio * 45))

    if debrief.live_support:
        total_minutes = debrief.live_support.listening_minutes + debrief.live_support.talking_minutes
        if total_minutes > 0:
            listening_ratio = debrief.live_support.listening_minutes / total_minutes
            listening_balance_score = max(0, 100 - int(abs(0.6 - listening_ratio) * 200))
        else:
            listening_balance_score = 50

        if debrief.live_support.red_alert_count > 0:
            reset_effectiveness = debrief.live_support.resets_used / debrief.live_support.red_alert_count
            emotional_regulation_score = min(
                100,
                max(emotional_regulation_score, 50 + int(min(1, reset_effectiveness) * 40)),
            )

        if debrief.live_support.current_zone == "amarilla":
            emotional_regulation_score = max(0, emotional_regulation_score - 8)
        elif debrief.live_support.current_zone == "roja":
            emotional_regulation_score = max(0, emotional_regulation_score - 18)

        if debrief.live_support.semaphore_transitions > 3:
            emotional_regulation_score = max(0, emotional_regulation_score - min(12, (debrief.live_support.semaphore_transitions - 3) * 2))
            improvement_opportunities.append(
                "El semáforo mostró cambios frecuentes de zona: entrená pausas tácticas para sostener claridad estratégica."
            )

    if debrief.role_play and debrief.role_play.completed:
        role_play_score = int(
            (debrief.role_play.self_score * 0.2)
            + (debrief.role_play.response_quality_score * 0.4)
            + (debrief.role_play.emotional_control_score * 0.4)
        )

        cold_actions = [item for item in debrief.role_play.cold_rapport_actions if item.strip()]
        if debrief.role_play.counterpart_temperature == "frio":
            rapport_activation_score = min(100, 35 + len(cold_actions) * 15 + int(debrief.role_play.response_quality_score * 0.35))
        else:
            rapport_activation_score = min(100, 45 + len(cold_actions) * 8 + int(debrief.role_play.response_quality_score * 0.25))

        detected_tricks = [item for item in debrief.role_play.dirty_tricks_detected if item.strip()]
        trick_note_quality = 20 if debrief.role_play.dirty_tricks_response_notes.strip() else 0
        trap_detection_score = min(100, 30 + len(detected_tricks) * 20 + trick_note_quality)
        boundary_control_score = int((debrief.role_play.emotional_control_score * 0.5) + (trap_detection_score * 0.5))

    clarity_level_score = int((emotional_regulation_score * 0.5) + (listening_balance_score * 0.5))
    advanced_score = int((clarity_level_score * 0.6) + (role_play_score * 0.4))

    anger_cost_amount = 0.0
    if debrief.emotional_cost:
        anger_cost_amount = max(
            0.0,
            debrief.emotional_cost.estimated_margin_without_anger - debrief.emotional_cost.actual_margin_after_anger,
        )
        if anger_cost_amount > 0:
            improvement_opportunities.append(
                f"Costo del enojo detectado: {anger_cost_amount:.2f} {debrief.emotional_cost.currency}. Diseña un reset preventivo para proteger margen."
            )

    exercise_results: list[RolePlayExerciseResult] = []
    if debrief.role_play and debrief.role_play.exercise_results:
        exercise_results = debrief.role_play.exercise_results

    completed_exercises = [item for item in exercise_results if item.completed]
    completed_exercises_count = len(completed_exercises)
    required_exercises_count = len(CERTIFICATION_EXERCISE_SERIES)

    covered_segments = {item.segment for item in completed_exercises}
    segment_coverage_ok = {"smb", "mid_market", "enterprise"}.issubset(covered_segments)

    series_scores: list[int] = []
    for item in completed_exercises:
        series_scores.append(int((item.calmness_score + item.signal_reading_score + item.discovery_question_score) / 3))
    exercise_series_score = int(sum(series_scores) / len(series_scores)) if series_scores else 0

    practiced_questions = [q.strip() for q in (debrief.role_play.practiced_discovery_questions if debrief.role_play else []) if q.strip()]
    question_practice_ok = len(practiced_questions) >= 3

    certified = (
        advanced_score >= 75
        and role_play_score >= 60
        and completed_exercises_count >= 4
        and segment_coverage_ok
        and question_practice_ok
        and exercise_series_score >= 65
    )

    pass_reasons: list[str] = []
    fail_reasons: list[str] = []

    if advanced_score >= 75:
        pass_reasons.append("Sostiene nivel avanzado de claridad bajo presión.")
    else:
        fail_reasons.append("Score avanzado insuficiente para certificar (mínimo 75).")

    if role_play_score >= 60:
        pass_reasons.append("Role-play con desempeño base aprobado (mínimo 60).")
    else:
        fail_reasons.append("Role-play por debajo del umbral mínimo (60).")

    if completed_exercises_count >= 4:
        pass_reasons.append(f"Completó {completed_exercises_count} ejercicios de la serie B2B.")
    else:
        fail_reasons.append("Debe completar al menos 4 ejercicios de certificación B2B.")

    if segment_coverage_ok:
        pass_reasons.append("Cubre contextos SMB, mid-market y enterprise.")
    else:
        fail_reasons.append("Falta cobertura de escenarios por tamaño de empresa (SMB/mid-market/enterprise).")

    if question_practice_ok:
        pass_reasons.append("Practicó preguntas de descubrimiento para destrabar problemas subyacentes.")
    else:
        fail_reasons.append("Debe practicar al menos 3 preguntas de descubrimiento orientadas a confianza mutua.")

    if exercise_series_score < 65:
        fail_reasons.append("Promedio de la serie de ejercicios por debajo de 65/100.")
    else:
        pass_reasons.append(f"Promedio de serie B2B: {exercise_series_score}/100.")

    if debrief.role_play and debrief.role_play.counterpart_temperature == "frio":
        if rapport_activation_score >= 65:
            pass_reasons.append("Logró activar rapport en escenario de cliente frío.")
        else:
            fail_reasons.append("Debe mejorar activación de rapport frente a cliente frío (mínimo 65).")

    if trap_detection_score >= 60:
        pass_reasons.append("Detecta y nombra tretas sucias sin perder foco.")
    else:
        fail_reasons.append("Necesita mayor detección y manejo de tretas sucias (mínimo 60).")

    certification_basis = (
        "Certificación basada en evidencia de entrenamiento: control emocional, lectura de señales, calidad de preguntas y cobertura de casos B2B reales."
    )
    if not certified:
        certification_basis = (
            "No certifica aún: faltan umbrales de desempeño o cobertura mínima de la serie de ejercicios B2B."
        )

    return {
        "strategic_gaps": strategic_gaps,
        "identified_errors": identified_errors,
        "confirmed_successes": confirmed_successes,
        "improvement_opportunities": improvement_opportunities,
        "personal_patterns": personal_patterns,
        "debrief_comparative": debrief_comparative.model_dump() if debrief_comparative else None,
        "emotional_regulation_score": emotional_regulation_score,
        "listening_balance_score": listening_balance_score,
        "role_play_score": role_play_score,
        "rapport_activation_score": rapport_activation_score,
        "trap_detection_score": trap_detection_score,
        "boundary_control_score": boundary_control_score,
        "certification": {
            "clarity_level_score": clarity_level_score,
            "advanced_score": advanced_score,
            "certified": certified,
            "certification_basis": certification_basis,
            "completed_exercises": completed_exercises_count,
            "required_exercises": required_exercises_count,
            "pass_reasons": pass_reasons,
            "fail_reasons": fail_reasons,
            "recommended_questions": RECOMMENDED_DISCOVERY_QUESTIONS,
        },
    }


def _build_debrief_comparative(preparation: PreparationInput, debrief: DebriefInput) -> DebriefComparative:
    """Construye comparativa visual preparación vs realidad"""
    comparisons: list[DebriefComparativeItem] = []
    
    # Comparación 1: Objetivo
    comparisons.append(DebriefComparativeItem(
        dimension="Objetivo",
        prepared=preparation.objective.explicit_objective,
        what_happened=debrief.real_result.explicit_objective_achieved,
        gap="Logrado" if _contains_any(debrief.real_result.explicit_objective_achieved, ["sí", "logr", "alcancé"]) else "No logrado - revisar supuestos de poder"
    ))
    
    # Comparación 2: MAAN
    maan_used = _contains_any(
        debrief.real_result.what_remains_open + " " + debrief.self_diagnosis.main_strategic_success,
        ["maan", "alternativa", "plan b", "otra opción", "activé"]
    )
    comparisons.append(DebriefComparativeItem(
        dimension="MAAN",
        prepared=preparation.power_alternatives.maan,
        what_happened="Activado exitosamente" if maan_used else "No se necesitó activar",
        gap="MAAN funcionó como respaldo" if maan_used else "Revisar si MAAN era realmente accionable"
    ))
    
    # Comparación 3: Riesgo Principal
    risk_materialized = _contains_any(
        debrief.observed_dynamics.decisive_objection + " " + debrief.self_diagnosis.main_strategic_error,
        preparation.risk.main_risk.lower().split()[:5]  # Primeras palabras del riesgo
    )
    comparisons.append(DebriefComparativeItem(
        dimension="Riesgo",
        prepared=preparation.risk.main_risk,
        what_happened=debrief.observed_dynamics.decisive_objection if debrief.observed_dynamics.decisive_objection else "Otro riesgo distinto",
        gap="Riesgo anticipado correctamente" if risk_materialized else "Falló diagnóstico - objeción real fue diferente"
    ))
    
    # Comparación 4: Poder relativo
    power_shifted = debrief.observed_dynamics.where_power_shifted
    comparisons.append(DebriefComparativeItem(
        dimension="Poder",
        prepared=f"Tu fortaleza: {preparation.power_alternatives.maan[:60]}...",
        what_happened=power_shifted if power_shifted else "No hubo cambio significativo",
        gap="Poder se movió distinto a lo esperado" if _contains_any(power_shifted, ["inesperado", "sorpresa", "cambio"]) else "Lectura de poder fue correcta"
    ))
    
    # Comparación 5: Secuencia de concesiones
    concession_changed = debrief.observed_dynamics.concession_that_changed_structure
    comparisons.append(DebriefComparativeItem(
        dimension="Concesiones",
        prepared=preparation.strategy.concession_sequence[:80] if preparation.strategy.concession_sequence else "No especificada",
        what_happened=concession_changed if concession_changed else "Secuencia según plan",
        gap="Hubo concesión no planeada que cambió estructura" if concession_changed and len(concession_changed) > 5 else "Secuencia mantenida"
    ))
    
    return DebriefComparative(comparisons=comparisons)


def build_final_memo(
    preparation: PreparationInput,
    analysis: AnalysisOutput,
    debrief: DebriefInput,
    debrief_analysis: dict | None = None,
) -> dict:
    synthesis = (
        f"Caso enfocado en {preparation.context.negotiation_type.lower()} con objetivo explícito '{preparation.objective.explicit_objective}'. "
        f"El objetivo real fue '{preparation.objective.real_objective}' y la MAAN definida fue '{preparation.power_alternatives.maan}'. "
        f"Resultado: {debrief.real_result.explicit_objective_achieved}."
    )

    thinking_pattern = (
        "Se observa un patrón de preparación orientado a estructura, con foco en control de concesiones y lectura de señales."
        if analysis.preparation_level in ["Estructurado", "Avanzado"]
        else "Se observa un patrón reactivo con definición parcial de variables críticas antes de negociar."
    )

    # Consolidar observaciones: del análisis de preparación + análisis de debrief (si existe)
    observations_and_next_steps = [*analysis.observations, *analysis.suggestions, *analysis.next_steps]
    
    if debrief_analysis:
        observations_and_next_steps.extend([
            "--- APRENDIZAJES DE LA EJECUCIÓN ---",
            *debrief_analysis.get("strategic_gaps", []),
            *debrief_analysis.get("identified_errors", []),
            *debrief_analysis.get("confirmed_successes", []),
            *debrief_analysis.get("improvement_opportunities", []),
            *debrief_analysis.get("personal_patterns", []),
        ])

    return {
        "strategic_synthesis": synthesis,
        "observations_and_next_steps": observations_and_next_steps,
        "open_inconsistencies": analysis.inconsistencies,
        "observed_thinking_pattern": thinking_pattern,
        "consolidated_transferable_principle": debrief.transferable_lesson or "El aprendizaje principal de este caso es observar la brecha entre lo preparado y lo ejecutado para mejorar la calibración estratégica en futuras negociaciones.",
    }


# GAMIFICATION ENGINE

ACHIEVEMENT_DEFINITIONS = [
    {"id": "first_case", "name": "🎯 Primer Paso", "description": "Completaste tu primer caso", "xp": 50},
    {"id": "five_cases", "name": "🚀 En Camino", "description": "5 casos completados", "xp": 150},
    {"id": "ten_cases", "name": "⚡ Velocidad", "description": "10 casos cerrados", "xp": 300},
    {"id": "all_segments", "name": "🗺️ Explorador", "description": "Practicaste los 3 segmentos (SMB, Mid-Market, Enterprise)", "xp": 200},
    {"id": "certified_case", "name": "✅ Certificado", "description": "Primer caso con certificación aprobada", "xp": 250},
    {"id": "three_certified", "name": "✅✅✅ Validado", "description": "3 casos certificados", "xp": 500},
    {"id": "perfect_streak", "name": "🔥 Racha Perfecta", "description": "5 casos cerrados consecutivamente", "xp": 150},
    {"id": "emotional_master", "name": "🧠 Control Emocional", "description": "Score emocional ≥90 en un caso", "xp": 100},
    {"id": "listener", "name": "👂 Buen Oyente", "description": "Score de escucha ≥85 en un caso", "xp": 80},
    {"id": "role_play_pro", "name": "🎭 Actuación Experta", "description": "Role-play score ≥85 en un caso", "xp": 100},
    {"id": "discovery_master", "name": "🔍 Preguntas Profundas", "description": "10+ preguntas de descubrimiento practicadas", "xp": 120},
    {"id": "cold_rapport", "name": "🧊➡️🤝 Rompehielo", "description": "Activó rapport en cliente frío", "xp": 180},
    {"id": "trick_detector", "name": "🛡️ Detector de Tretas", "description": "Manejó jugadas sucias sin escalar", "xp": 180},
    {"id": "final_certification", "name": "🎓 Graduado", "description": "Certificación final aprobada (multi-caso)", "xp": 1000},
]

LEVEL_THRESHOLDS = [
    {"level": 1, "xp_required": 0, "label": "Novicio"},
    {"level": 2, "xp_required": 500, "label": "Practicante"},
    {"level": 3, "xp_required": 1200, "label": "Competente"},
    {"level": 4, "xp_required": 2200, "label": "Experto"},
    {"level": 5, "xp_required": 3500, "label": "Maestro"},
]


def _calculate_gamification_progress(cases: list[dict]) -> dict:
    """Calcula el progreso de gamificación basado en los casos del usuario.
    
    Returns:
        Dict con total_xp, level, achievements, phase_progress, etc.
    """
    from datetime import datetime
    
    closed_cases = [c for c in cases if c.get("status") == "cerrado"]
    
    # Inicializar acumuladores
    total_xp = 0
    unlocked_achievements: list[dict] = []
    cases_closed_count = len(closed_cases)
    cases_certified_count = 0
    current_streak = 0
    highest_streak = 0
    
    # Contador por fase completada (preparación, ejecución, debrief, etc)
    prep_completed = sum(1 for c in closed_cases if c.get("preparation") and len(str(c.get("preparation", {}))) > 10)
    exec_completed = sum(1 for c in closed_cases if c.get("analysis") and len(str(c.get("analysis", {}))) > 10)
    debrief_completed = sum(1 for c in closed_cases if c.get("debrief") and len(str(c.get("debrief", {}))) > 10)
    
    # Procesar logros basados en milestones
    achievement_map = {a["id"]: a for a in ACHIEVEMENT_DEFINITIONS}
    
    # Logro: Primer caso
    if cases_closed_count >= 1 and "first_case" not in [a["id"] for a in unlocked_achievements]:
        unlocked_achievements.append({
            **achievement_map["first_case"],
            "unlocked_at": datetime.now().isoformat()
        })
        total_xp += achievement_map["first_case"]["xp"]
    
    # Logro: 5 casos
    if cases_closed_count >= 5 and "five_cases" not in [a["id"] for a in unlocked_achievements]:
        unlocked_achievements.append({
            **achievement_map["five_cases"],
            "unlocked_at": datetime.now().isoformat()
        })
        total_xp += achievement_map["five_cases"]["xp"]
    
    # Logro: 10 casos
    if cases_closed_count >= 10 and "ten_cases" not in [a["id"] for a in unlocked_achievements]:
        unlocked_achievements.append({
            **achievement_map["ten_cases"],
            "unlocked_at": datetime.now().isoformat()
        })
        total_xp += achievement_map["ten_cases"]["xp"]
    
    # Logro: Todos los segmentos (smart check)
    covered_segments = set()
    for case in closed_cases:
        debrief_data = case.get("debrief", {})
        if debrief_data and isinstance(debrief_data, dict):
            role_play = debrief_data.get("role_play", {})
            if isinstance(role_play, dict):
                exercise_results = role_play.get("exercise_results", [])
                for ex in exercise_results:
                    if isinstance(ex, dict) and ex.get("completed"):
                        covered_segments.add(ex.get("segment", ""))
    
    if {"smb", "mid_market", "enterprise"}.issubset(covered_segments) and "all_segments" not in [a["id"] for a in unlocked_achievements]:
        unlocked_achievements.append({
            **achievement_map["all_segments"],
            "unlocked_at": datetime.now().isoformat()
        })
        total_xp += achievement_map["all_segments"]["xp"]
    
    # Logro: Primer caso certificado
    for case in closed_cases:
        debrief_analysis = case.get("debrief_analysis", {})
        if isinstance(debrief_analysis, dict):
            certification = debrief_analysis.get("certification", {})
            if isinstance(certification, dict) and certification.get("certified"):
                cases_certified_count += 1
    
    if cases_certified_count >= 1 and "certified_case" not in [a["id"] for a in unlocked_achievements]:
        unlocked_achievements.append({
            **achievement_map["certified_case"],
            "unlocked_at": datetime.now().isoformat()
        })
        total_xp += achievement_map["certified_case"]["xp"]
    
    # Logro: 3 casos certificados
    if cases_certified_count >= 3 and "three_certified" not in [a["id"] for a in unlocked_achievements]:
        unlocked_achievements.append({
            **achievement_map["three_certified"],
            "unlocked_at": datetime.now().isoformat()
        })
        total_xp += achievement_map["three_certified"]["xp"]
    
    # Logro: Racha de 5 casos sin fallar (todos cerrados)
    if cases_closed_count >= 5:
        last_5_cases = closed_cases[-5:]
        if all(c.get("status") == "cerrado" for c in last_5_cases):
            current_streak = 5
            highest_streak = max(highest_streak, 5)
            if "perfect_streak" not in [a["id"] for a in unlocked_achievements]:
                unlocked_achievements.append({
                    **achievement_map["perfect_streak"],
                    "unlocked_at": datetime.now().isoformat()
                })
                total_xp += achievement_map["perfect_streak"]["xp"]
    else:
        current_streak = cases_closed_count
        highest_streak = cases_closed_count
    
    # Logro: Emotional master (≥90 emotional_regulation en algún caso)
    for case in closed_cases:
        debrief_analysis = case.get("debrief_analysis", {})
        if isinstance(debrief_analysis, dict):
            emotional_score = debrief_analysis.get("emotional_regulation_score", 0)
            if emotional_score >= 90 and "emotional_master" not in [a["id"] for a in unlocked_achievements]:
                unlocked_achievements.append({
                    **achievement_map["emotional_master"],
                    "unlocked_at": datetime.now().isoformat()
                })
                total_xp += achievement_map["emotional_master"]["xp"]
                break
    
    # Logro: Listener (≥85 listening_balance en algún caso)
    for case in closed_cases:
        debrief_analysis = case.get("debrief_analysis", {})
        if isinstance(debrief_analysis, dict):
            listening_score = debrief_analysis.get("listening_balance_score", 0)
            if listening_score >= 85 and "listener" not in [a["id"] for a in unlocked_achievements]:
                unlocked_achievements.append({
                    **achievement_map["listener"],
                    "unlocked_at": datetime.now().isoformat()
                })
                total_xp += achievement_map["listener"]["xp"]
                break
    
    # Logro: Role-play pro (≥85 role_play en algún caso)
    for case in closed_cases:
        debrief_analysis = case.get("debrief_analysis", {})
        if isinstance(debrief_analysis, dict):
            role_play_score = debrief_analysis.get("role_play_score", 0)
            if role_play_score >= 85 and "role_play_pro" not in [a["id"] for a in unlocked_achievements]:
                unlocked_achievements.append({
                    **achievement_map["role_play_pro"],
                    "unlocked_at": datetime.now().isoformat()
                })
                total_xp += achievement_map["role_play_pro"]["xp"]
                break
    
    # Logro: Discovery master (10+ preguntas practicadas)
    total_questions = 0
    for case in closed_cases:
        debrief = case.get("debrief", {})
        if debrief and isinstance(debrief, dict):
            role_play = debrief.get("role_play", {})
            if isinstance(role_play, dict):
                questions = role_play.get("practiced_discovery_questions", [])
                total_questions += len([q for q in questions if isinstance(q, str) and q.strip()])
    
    if total_questions >= 10 and "discovery_master" not in [a["id"] for a in unlocked_achievements]:
        unlocked_achievements.append({
            **achievement_map["discovery_master"],
            "unlocked_at": datetime.now().isoformat()
        })
        total_xp += achievement_map["discovery_master"]["xp"]

    has_cold_rapport = False
    has_trick_detection = False
    for case in closed_cases:
        debrief_analysis = case.get("debrief_analysis", {})
        if isinstance(debrief_analysis, dict):
            if debrief_analysis.get("rapport_activation_score", 0) >= 65:
                has_cold_rapport = True
            if debrief_analysis.get("trap_detection_score", 0) >= 60:
                has_trick_detection = True

    if has_cold_rapport and "cold_rapport" not in [a["id"] for a in unlocked_achievements]:
        unlocked_achievements.append({
            **achievement_map["cold_rapport"],
            "unlocked_at": datetime.now().isoformat()
        })
        total_xp += achievement_map["cold_rapport"]["xp"]

    if has_trick_detection and "trick_detector" not in [a["id"] for a in unlocked_achievements]:
        unlocked_achievements.append({
            **achievement_map["trick_detector"],
            "unlocked_at": datetime.now().isoformat()
        })
        total_xp += achievement_map["trick_detector"]["xp"]
    
    # Logro: Final certification (multi-caso) - esto se validaría en endpoint separado de final_certification
    # Por ahora lo marcamos como placeholder
    
    # XP por casos cerrados (bonus cada 5 casos)
    xp_base = cases_closed_count * 10  # 10 XP por caso cerrado
    total_xp += xp_base
    
    # XP por casos certificados (bonus)
    xp_cert = cases_certified_count * 25
    total_xp += xp_cert
    
    # Calcular level
    current_level = 1
    next_level_xp = LEVEL_THRESHOLDS[0]["xp_required"]
    for threshold in LEVEL_THRESHOLDS:
        if total_xp >= threshold["xp_required"]:
            current_level = threshold["level"]
            next_level_xp = threshold["xp_required"]
    
    # Encontrar XP para siguiente nivel
    next_level_threshold = LEVEL_THRESHOLDS[current_level] if current_level < len(LEVEL_THRESHOLDS) else LEVEL_THRESHOLDS[-1]
    if current_level < len(LEVEL_THRESHOLDS):
        next_level_xp = LEVEL_THRESHOLDS[current_level]["xp_required"]
    else:
        next_level_xp = LEVEL_THRESHOLDS[-1]["xp_required"] + 1000
    
    # Progress por fase
    phase_progress_list = [
        {
            "phase_name": "preparacion",
            "phase_label": "Preparación Pre-Negociación",
            "completion_percentage": min(100, int((prep_completed / max(1, cases_closed_count)) * 100)) if cases_closed_count > 0 else 0,
            "cases_completed": prep_completed,
            "next_milestone": f"Completar {cases_closed_count + 2} casos de Preparación" if prep_completed < cases_closed_count else "✓ Completo",
            "xp_earned": prep_completed * 5,
        },
        {
            "phase_name": "ejecucion",
            "phase_label": "Ejecución en Vivo",
            "completion_percentage": min(100, int((exec_completed / max(1, cases_closed_count)) * 100)) if cases_closed_count > 0 else 0,
            "cases_completed": exec_completed,
            "next_milestone": f"Ejecutar {cases_closed_count + 2} casos" if exec_completed < cases_closed_count else "✓ Completo",
            "xp_earned": exec_completed * 5,
        },
        {
            "phase_name": "debrief",
            "phase_label": "Debrief y Reflexión",
            "completion_percentage": min(100, int((debrief_completed / max(1, cases_closed_count)) * 100)) if cases_closed_count > 0 else 0,
            "cases_completed": debrief_completed,
            "next_milestone": f"Debriefear {cases_closed_count + 2} casos" if debrief_completed < cases_closed_count else "✓ Completo",
            "xp_earned": debrief_completed * 5,
        },
        {
            "phase_name": "certificacion",
            "phase_label": "Certificación de Ejercicios",
            "completion_percentage": min(100, int((cases_certified_count / max(1, cases_closed_count)) * 100 * 1.5)) if cases_closed_count > 0 else 0,
            "cases_completed": cases_certified_count,
            "next_milestone": f"Certificar {min(4, cases_closed_count + 1)} casos" if cases_certified_count < min(4, cases_closed_count) else "✓ Listo para graduación final",
            "xp_earned": cases_certified_count * 25,
        },
    ]
    
    # Hint para próximo badge
    next_badge_hint = None
    if cases_closed_count == 4 and "five_cases" not in [a["id"] for a in unlocked_achievements]:
        next_badge_hint = "¡Solo 1 caso más para desbloquear 'En Camino'!"
    elif cases_certified_count == 2 and "three_certified" not in [a["id"] for a in unlocked_achievements]:
        next_badge_hint = "¡1 certificación más para 'Validado'!"
    elif total_questions == 9 and "discovery_master" not in [a["id"] for a in unlocked_achievements]:
        next_badge_hint = "¡1 pregunta más para desbloquear 'Preguntas Profundas'!"
    elif cases_closed_count == 9 and "ten_cases" not in [a["id"] for a in unlocked_achievements]:
        next_badge_hint = "¡1 caso más para desbloquear 'Velocidad'!"
    else:
        all_badge_ids = {a["id"] for a in unlocked_achievements}
        remaining_badges = [a for a in ACHIEVEMENT_DEFINITIONS if a["id"] not in all_badge_ids and a["id"] != "final_certification"]
        if remaining_badges:
            next_badge_hint = f"Próximo desafío: {remaining_badges[0]['name']}"
    
    return {
        "total_xp": total_xp,
        "level": current_level,
        "next_level_xp": next_level_xp,
        "current_streak": current_streak,
        "highest_streak": highest_streak,
        "cases_closed": cases_closed_count,
        "cases_certified": cases_certified_count,
        "achievements": unlocked_achievements,
        "phase_progress": phase_progress_list,
        "unlocked_badges_count": len(unlocked_achievements),
        "next_badge_hint": next_badge_hint,
        "heat_level": max(0, min(5, int((100 - sum([
            c.get("debrief_analysis", {}).get("emotional_regulation_score", 60)
            for c in closed_cases
            if isinstance(c.get("debrief_analysis", {}), dict)
        ]) / max(1, len(closed_cases))) / 15))),
        "thermal_phase": (
            "cool"
            if len(closed_cases) == 0
            else "cool"
            if (sum([
                c.get("debrief_analysis", {}).get("emotional_regulation_score", 60)
                for c in closed_cases
                if isinstance(c.get("debrief_analysis", {}), dict)
            ]) / max(1, len(closed_cases))) >= 80
            else "warm"
            if (sum([
                c.get("debrief_analysis", {}).get("emotional_regulation_score", 60)
                for c in closed_cases
                if isinstance(c.get("debrief_analysis", {}), dict)
            ]) / max(1, len(closed_cases))) >= 60
            else "hot"
        ),
    }
