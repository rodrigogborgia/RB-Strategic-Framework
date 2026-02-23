from __future__ import annotations

from .models import FeedbackMode
from .schemas import AnalysisOutput, DebriefInput, PreparationInput


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

    return AnalysisOutput(
        clarification_questions=clarification_questions,
        observations=observations,
        suggestions=suggestions,
        next_steps=next_steps,
        inconsistencies=inconsistencies,
        preparation_level=level,
    )


def build_final_memo(
    preparation: PreparationInput,
    analysis: AnalysisOutput,
    debrief: DebriefInput,
) -> dict:
    synthesis = (
        f"Caso enfocado en {preparation.context.negotiation_type.lower()} con objetivo explícito '{preparation.objective.explicit_objective}'. "
        f"El objetivo real fue '{preparation.objective.real_objective}' y la MAAN definida fue '{preparation.power_alternatives.maan}'."
    )

    thinking_pattern = (
        "Se observa un patrón de preparación orientado a estructura, con foco en control de concesiones y lectura de señales."
        if analysis.preparation_level in ["Estructurado", "Avanzado"]
        else "Se observa un patrón reactivo con definición parcial de variables críticas antes de negociar."
    )

    return {
        "strategic_synthesis": synthesis,
        "observations_and_next_steps": [*analysis.observations, *analysis.suggestions, *analysis.next_steps],
        "open_inconsistencies": analysis.inconsistencies,
        "observed_thinking_pattern": thinking_pattern,
        "consolidated_transferable_principle": debrief.transferable_lesson,
    }
