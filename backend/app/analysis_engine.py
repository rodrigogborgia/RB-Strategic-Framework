from __future__ import annotations

from .models import FeedbackMode
from .schemas import (
    AnalysisOutput,
    ConcessionMap,
    ConcessionMapItem,
    DebriefComparative,
    DebriefComparativeItem,
    DebriefInput,
    PowerDashboard,
    PreNegotiationSummary,
    PreparationInput,
    RiskMatrix,
    RiskMatrixItem,
)


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
        suggestions.append("Ajusta los bloques en tensión antes de ejecutar para evitar concesiones incoherentes.")
    else:
        suggestions.append("Mantén la estructura actual y refina la precisión de términos operativos por bloque.")

    if mode == FeedbackMode.CURSO:
        suggestions.append(
            "Conecta cada hipótesis de contraparte con evidencia observable para fortalecer criterio aplicado en clase."
        )
        suggestions.append(
            "Elegí foco pedagógico por ronda (ética, poder o conducta) y evaluá con evidencia observable, no solo con impresiones."
        )
        next_steps.append("Ensaya una apertura de 2 minutos centrada en objetivo real y punto de ruptura.")
    else:
        suggestions.append("Define una línea roja explícita y el orden exacto de tus concesiones críticas.")
        next_steps.append("Valida MAAN y breakpoint con datos verificables antes de entrar a la reunión.")

    next_steps.append("Documenta la primera señal de cambio de poder esperada durante la conversación.")
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

    return {
        "strategic_gaps": strategic_gaps,
        "identified_errors": identified_errors,
        "confirmed_successes": confirmed_successes,
        "improvement_opportunities": improvement_opportunities,
        "personal_patterns": personal_patterns,
        "debrief_comparative": debrief_comparative.model_dump() if debrief_comparative else None,
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
