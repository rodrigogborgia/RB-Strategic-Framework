from __future__ import annotations

from datetime import datetime

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select

from .analysis_engine import analyze_preparation, build_final_memo
from .db import get_session, init_db
from .models import Case, CaseStatus, CaseVersion
from .openai_engine import analyze_preparation_with_openai
from .schemas import (
    AnalysisOutput,
    CaseCreate,
    CaseListItem,
    CaseRead,
    CaseTemplate,
    DebriefInput,
    FinalMemo,
    PreparationInput,
)
from .settings import settings
from .templates import CASE_TEMPLATES

app = FastAPI(title="RB Strategic Framework API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    init_db()


def _save_version(session: Session, case_id: int, event: str, payload: dict) -> None:
    session.add(CaseVersion(case_id=case_id, event=event, payload=payload))


def _get_case_or_404(session: Session, case_id: int) -> Case:
    case = session.get(Case, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Caso no encontrado")
    return case


@app.get("/health")
def health_check() -> dict:
    return {"ok": True}


@app.post("/cases", response_model=CaseRead)
def create_case(case_in: CaseCreate, session: Session = Depends(get_session)) -> Case:
    case = Case(title=case_in.title, mode=case_in.mode)
    session.add(case)
    session.commit()
    session.refresh(case)

    _save_version(session, case.id, "case_created", {"title": case.title, "mode": case.mode.value})
    session.commit()

    return case


@app.get("/cases", response_model=list[CaseListItem])
def list_cases(session: Session = Depends(get_session)) -> list[Case]:
    statement = select(Case).order_by(Case.updated_at.desc())
    return list(session.exec(statement).all())


@app.get("/case-templates", response_model=list[CaseTemplate])
def list_case_templates() -> list[CaseTemplate]:
    return [
        CaseTemplate(
            id=item["id"],
            title=item["title"],
            mode=item["mode"],
            ideal_for=item.get("ideal_for", ""),
        )
        for item in CASE_TEMPLATES
    ]


@app.post("/cases/from-template/{template_id}", response_model=CaseRead)
def create_case_from_template(template_id: str, session: Session = Depends(get_session)) -> Case:
    template = next((item for item in CASE_TEMPLATES if item["id"] == template_id), None)
    if not template:
        raise HTTPException(status_code=404, detail="Plantilla no encontrada")

    case = Case(
        title=template["title"],
        mode=template["mode"],
        preparation=template["preparation"],
        status=CaseStatus.EN_PREPARACION,
    )
    session.add(case)
    session.commit()
    session.refresh(case)

    _save_version(
        session,
        case.id,
        "case_created_from_template",
        {"template_id": template_id, "title": case.title},
    )
    session.commit()

    return case


@app.get("/cases/{case_id}", response_model=CaseRead)
def get_case(case_id: int, session: Session = Depends(get_session)) -> Case:
    return _get_case_or_404(session, case_id)


@app.delete("/cases/{case_id}")
def delete_case(case_id: int, session: Session = Depends(get_session)) -> dict:
    case = _get_case_or_404(session, case_id)

    versions_stmt = select(CaseVersion).where(CaseVersion.case_id == case_id)
    versions = list(session.exec(versions_stmt).all())
    for version in versions:
        session.delete(version)

    session.delete(case)
    session.commit()
    return {"ok": True}


@app.put("/cases/{case_id}/preparation", response_model=CaseRead)
def upsert_preparation(
    case_id: int,
    preparation: PreparationInput,
    session: Session = Depends(get_session),
) -> Case:
    case = _get_case_or_404(session, case_id)
    if case.status == CaseStatus.CERRADO:
        raise HTTPException(status_code=400, detail="No se puede editar un caso cerrado")

    case.preparation = preparation.model_dump()
    case.updated_at = datetime.utcnow()
    case.status = CaseStatus.EN_PREPARACION

    _save_version(session, case_id, "preparation_updated", case.preparation)

    session.add(case)
    session.commit()
    session.refresh(case)
    return case


@app.post("/cases/{case_id}/analyze", response_model=AnalysisOutput)
def analyze_case(case_id: int, session: Session = Depends(get_session)) -> AnalysisOutput:
    case = _get_case_or_404(session, case_id)
    if not case.preparation:
        raise HTTPException(status_code=400, detail="Completa preparación antes de analizar")

    preparation = PreparationInput.model_validate(case.preparation)
    provider_used = "rules"
    if settings.analysis_provider == "openai":
        try:
            analysis = analyze_preparation_with_openai(preparation, case.mode)
            provider_used = "openai"
        except Exception:
            analysis = analyze_preparation(preparation, case.mode)
            provider_used = "rules_fallback"
    else:
        analysis = analyze_preparation(preparation, case.mode)

    case.analysis = analysis.model_dump()
    case.inconsistency_count = len(analysis.inconsistencies)
    case.clarity_score = 100 - min(90, len(analysis.inconsistencies) * 20 + len(analysis.clarification_questions) * 10)
    case.status = CaseStatus.PREPARADO
    case.updated_at = datetime.utcnow()

    _save_version(session, case_id, "analysis_generated", {**case.analysis, "provider": provider_used})

    session.add(case)
    session.commit()

    return analysis


@app.post("/cases/{case_id}/execute", response_model=CaseRead)
def mark_executed(case_id: int, session: Session = Depends(get_session)) -> Case:
    case = _get_case_or_404(session, case_id)
    if case.status != CaseStatus.PREPARADO:
        raise HTTPException(status_code=400, detail="Solo un caso preparado puede pasar a ejecutado")

    case.status = CaseStatus.EJECUTADO_PENDIENTE_DEBRIEF
    case.updated_at = datetime.utcnow()

    _save_version(session, case_id, "marked_executed", {"status": case.status.value})

    session.add(case)
    session.commit()
    session.refresh(case)
    return case


@app.put("/cases/{case_id}/debrief", response_model=CaseRead)
def submit_debrief(
    case_id: int,
    debrief_in: DebriefInput,
    session: Session = Depends(get_session),
) -> Case:
    case = _get_case_or_404(session, case_id)
    if case.status not in [CaseStatus.EJECUTADO_PENDIENTE_DEBRIEF, CaseStatus.CERRADO]:
        raise HTTPException(status_code=400, detail="Debrief solo disponible luego de ejecutar")

    case.debrief = debrief_in.model_dump()
    case.updated_at = datetime.utcnow()

    _save_version(session, case_id, "debrief_submitted", case.debrief)

    session.add(case)
    session.commit()
    session.refresh(case)
    return case


@app.post("/cases/{case_id}/close", response_model=FinalMemo)
def close_case(case_id: int, session: Session = Depends(get_session)) -> FinalMemo:
    case = _get_case_or_404(session, case_id)

    if case.status != CaseStatus.EJECUTADO_PENDIENTE_DEBRIEF:
        raise HTTPException(status_code=400, detail="Solo un caso ejecutado puede cerrarse")

    if not case.preparation or not case.analysis or not case.debrief:
        raise HTTPException(status_code=400, detail="Se requiere preparación, análisis y debrief completos")

    preparation = PreparationInput.model_validate(case.preparation)
    analysis = AnalysisOutput.model_validate(case.analysis)
    debrief = DebriefInput.model_validate(case.debrief)

    memo = build_final_memo(preparation, analysis, debrief)

    case.final_memo = memo
    case.status = CaseStatus.CERRADO
    case.updated_at = datetime.utcnow()

    _save_version(session, case_id, "case_closed", memo)

    session.add(case)
    session.commit()

    return FinalMemo.model_validate(memo)


@app.get("/cases/{case_id}/memo", response_model=FinalMemo)
def get_memo(case_id: int, session: Session = Depends(get_session)) -> FinalMemo:
    case = _get_case_or_404(session, case_id)
    if not case.final_memo:
        raise HTTPException(status_code=404, detail="Memo final aún no generado")
    return FinalMemo.model_validate(case.final_memo)


@app.get("/cases/{case_id}/versions")
def get_versions(case_id: int, session: Session = Depends(get_session)) -> list[CaseVersion]:
    _get_case_or_404(session, case_id)
    statement = select(CaseVersion).where(CaseVersion.case_id == case_id).order_by(CaseVersion.created_at.asc())
    return list(session.exec(statement).all())
