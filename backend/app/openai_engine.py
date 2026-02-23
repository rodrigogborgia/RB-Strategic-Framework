from __future__ import annotations

import json
from textwrap import dedent

from openai import OpenAI
from pydantic import ValidationError

from .models import FeedbackMode
from .schemas import AnalysisOutput, PreparationInput
from .settings import settings


def _system_prompt(mode: FeedbackMode) -> str:
    tone = (
        "Modo Curso: feedback pedagógico, breve referencia a conceptos de clase, sin perder estructura ejecutiva."
        if mode == FeedbackMode.CURSO
        else "Modo Profesional: feedback directo, exigente, ejecutivo, sin explicaciones largas."
    )

    return dedent(
        f"""
        Eres un analista estratégico de negociación consultiva.
        Evalúas cómo fue pensada la estrategia, no si se ganó o perdió.
        {tone}

        Reglas obligatorias:
        - Respuesta SOLO en JSON válido.
        - Máximo 3 preguntas de aclaración.
        - No redactar mails.
        - No dar scripts de conversación.
        - No prometer resultados.
        - Señalar incoherencias entre bloques cuando existan.
        - Entregar tono ejecutivo, directo y estructurado.

        Esquema JSON exacto:
        {{
          "clarification_questions": ["..."],
          "observations": ["..."],
          "suggestions": ["..."],
          "next_steps": ["..."],
          "inconsistencies": ["..."],
          "preparation_level": "Inicial|Estructurado|Avanzado"
        }}
        """
    ).strip()


def _user_prompt(preparation: PreparationInput) -> str:
    return dedent(
        f"""
        Caso de preparación estratégica:

        Contexto:
        - Tipo de negociación: {preparation.context.negotiation_type}
        - Nivel de impacto: {preparation.context.impact_level}
        - Relación contraparte: {preparation.context.counterpart_relationship}

        Objetivo:
        - Objetivo explícito: {preparation.objective.explicit_objective}
        - Objetivo real: {preparation.objective.real_objective}
        - Resultado mínimo aceptable: {preparation.objective.minimum_acceptable_result}

        Poder y alternativas:
        - MAAN: {preparation.power_alternatives.maan}
        - Fortaleza percibida del otro: {preparation.power_alternatives.counterpart_perceived_strength}
        - Punto de ruptura: {preparation.power_alternatives.breakpoint}

        Estrategia:
        - ZOPA estimada: {preparation.strategy.estimated_zopa}
        - Secuencia de concesiones: {preparation.strategy.concession_sequence}
        - Hipótesis sobre contraparte: {preparation.strategy.counterpart_hypothesis}

        Riesgos:
        - Variable emocional propia: {preparation.risk.emotional_variable}
        - Riesgo principal: {preparation.risk.main_risk}
        - Señal clave: {preparation.risk.key_signal}
        """
    ).strip()


def analyze_preparation_with_openai(
    preparation: PreparationInput,
    mode: FeedbackMode,
) -> AnalysisOutput:
    if not settings.openai_api_key:
        raise RuntimeError("OPENAI_API_KEY no configurada")

    client = OpenAI(api_key=settings.openai_api_key)

    completion = client.chat.completions.create(
        model=settings.openai_model,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": _system_prompt(mode)},
            {"role": "user", "content": _user_prompt(preparation)},
        ],
        temperature=0.2,
    )

    content = completion.choices[0].message.content
    if not content:
        raise RuntimeError("OpenAI devolvió respuesta vacía")

    try:
        payload = json.loads(content)
    except json.JSONDecodeError as exc:
        raise RuntimeError("OpenAI devolvió JSON inválido") from exc

    try:
        analysis = AnalysisOutput.model_validate(payload)
    except ValidationError as exc:
        raise RuntimeError("Respuesta OpenAI no cumple el esquema esperado") from exc

    if len(analysis.clarification_questions) > 3:
        analysis.clarification_questions = analysis.clarification_questions[:3]

    return analysis
