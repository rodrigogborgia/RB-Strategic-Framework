from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace

from fastapi.testclient import TestClient
from sqlmodel import SQLModel, Session, create_engine, select

from app import auth, db, main
from app.models import Case, User, UserRole


ADMIN_EMAIL = "admin@rb.local"
ADMIN_PASSWORD = "admin1234"


REQUIRED_PREPARATION = {
    "context": {
        "negotiation_type": "Negociación salarial",
        "impact_level": "Alto",
        "counterpart_relationship": "Relación en curso",
    },
    "objective": {
        "explicit_objective": "Acordar incremento de 15%",
        "real_objective": "Mejorar paquete total",
        "minimum_acceptable_result": "10%",
    },
    "power_alternatives": {
        "maan": "Oferta externa alternativa",
        "counterpart_perceived_strength": "Media",
        "breakpoint": "Menos de 10%",
    },
    "strategy": {
        "estimated_zopa": "10%-18%",
        "concession_sequence": "Concesiones graduales",
        "counterpart_hypothesis": "Prioriza retención",
    },
    "risk": {
        "emotional_variable": "Ansiedad",
        "main_risk": "Cerrar sin revisar condiciones",
        "key_signal": "Resistencia a revisar salario fijo",
    },
}


VALID_DEBRIEF = {
    "real_result": {
        "explicit_objective_achieved": "Logrado",
        "real_objective_achieved": "Parcial",
        "what_remains_open": "Revisión semestral",
    },
    "observed_dynamics": {
        "where_power_shifted": "Al presentar alternativa",
        "decisive_objection": "Presupuesto anual",
        "concession_that_changed_structure": "Ajuste variable",
    },
    "self_diagnosis": {
        "main_strategic_error": "Concedí temprano",
        "main_strategic_success": "Sostuve MAAN",
        "decision_to_change": "Preparar apertura escrita",
    },
    "transferable_lesson": "Preparar anclaje y MAAN mejora resultados.",
    "free_disclaimer": "",
}


def _login(client: TestClient, email: str, password: str) -> str:
    response = client.post("/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


def _auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _create_case_lifecycle(client: TestClient, token: str) -> int:
    case_response = client.post(
        "/cases",
        json={"title": "Caso métrico", "mode": "curso", "confidence_start": 6},
        headers=_auth_headers(token),
    )
    assert case_response.status_code == 200, case_response.text
    case_id = case_response.json()["id"]

    prep_response = client.put(
        f"/cases/{case_id}/preparation",
        json=REQUIRED_PREPARATION,
        headers=_auth_headers(token),
    )
    assert prep_response.status_code == 200, prep_response.text

    analyze_response = client.post(f"/cases/{case_id}/analyze", headers=_auth_headers(token))
    assert analyze_response.status_code == 200, analyze_response.text

    execute_response = client.post(f"/cases/{case_id}/execute", headers=_auth_headers(token))
    assert execute_response.status_code == 200, execute_response.text

    debrief_response = client.put(
        f"/cases/{case_id}/debrief",
        json=VALID_DEBRIEF,
        headers=_auth_headers(token),
    )
    assert debrief_response.status_code == 200, debrief_response.text

    close_response = client.post(
        f"/cases/{case_id}/close",
        json={
            "confidence_end": 8,
            "agreement_quality_result": 4,
            "agreement_quality_relationship": 5,
            "agreement_quality_sustainability": 4,
        },
        headers=_auth_headers(token),
    )
    assert close_response.status_code == 200, close_response.text

    return case_id


def _create_student(client: TestClient, admin_token: str, idx: int = 1) -> dict:
    payload = {
        "email": f"student{idx}@rb.local",
        "password": "student1234",
        "full_name": f"Student {idx}",
        "role": "student",
    }
    response = client.post("/admin/users", json=payload, headers=_auth_headers(admin_token))
    assert response.status_code == 200, response.text
    return response.json()


def _create_cohort(client: TestClient, admin_token: str, idx: int = 1) -> dict:
    payload = {
        "name": f"Cohorte Test {idx}",
        "start_date": "2026-01-01T00:00:00Z",
        "end_date": "2026-12-31T23:59:59Z",
        "status": "active",
    }
    response = client.post("/admin/cohorts", json=payload, headers=_auth_headers(admin_token))
    assert response.status_code == 200, response.text
    return response.json()


def _build_test_client(tmp_path: Path, monkeypatch) -> TestClient:
    test_db_path = tmp_path / "test_backend.db"
    test_engine = create_engine(f"sqlite:///{test_db_path}", echo=False)

    monkeypatch.setattr(db, "engine", test_engine)
    monkeypatch.setattr(main, "engine", test_engine)

    patched_settings = SimpleNamespace(**main.settings.__dict__)
    patched_settings.analysis_provider = "rules"
    monkeypatch.setattr(main, "settings", patched_settings)

    SQLModel.metadata.create_all(test_engine)
    db._ensure_case_columns()
    db._ensure_leader_evaluation_columns()

    with Session(test_engine) as session:
        existing_admin = session.exec(select(User).where(User.email == ADMIN_EMAIL)).first()
        if not existing_admin:
            session.add(
                User(
                    email=ADMIN_EMAIL,
                    password_hash=auth.hash_password(ADMIN_PASSWORD),
                    full_name="Administrador Test",
                    role=UserRole.ADMIN,
                    is_active=True,
                )
            )
            session.commit()

    return TestClient(main.app)


def test_health_and_bootstrap_login(monkeypatch, tmp_path: Path):
    client = _build_test_client(tmp_path, monkeypatch)

    health = client.get("/health")
    assert health.status_code == 200
    assert health.json() == {"ok": True}

    token = _login(client, ADMIN_EMAIL, ADMIN_PASSWORD)
    assert isinstance(token, str) and len(token) > 20


def test_case_lifecycle_persists_metrics(monkeypatch, tmp_path: Path):
    client = _build_test_client(tmp_path, monkeypatch)
    admin_token = _login(client, ADMIN_EMAIL, ADMIN_PASSWORD)

    case_id = _create_case_lifecycle(client, admin_token)

    case_response = client.get(f"/cases/{case_id}", headers=_auth_headers(admin_token))
    assert case_response.status_code == 200
    case_data = case_response.json()

    assert case_data["status"] == "cerrado"
    assert case_data["confidence_start"] == 6
    assert case_data["confidence_end"] == 8
    assert case_data["agreement_quality_result"] == 4
    assert case_data["agreement_quality_relationship"] == 5
    assert case_data["agreement_quality_sustainability"] == 4
    assert case_data["closed_at"] is not None


def test_metrics_me_returns_confidence_and_cycle(monkeypatch, tmp_path: Path):
    client = _build_test_client(tmp_path, monkeypatch)
    admin_token = _login(client, ADMIN_EMAIL, ADMIN_PASSWORD)

    _create_case_lifecycle(client, admin_token)

    metrics_response = client.get("/metrics/me", headers=_auth_headers(admin_token))
    assert metrics_response.status_code == 200
    payload = metrics_response.json()

    assert payload["cases_total"] >= 1
    assert payload["cases_closed"] >= 1
    assert payload["close_rate"] > 0
    assert payload["cycle_days_avg"] is not None
    assert payload["agreement_quality_avg"] is not None
    assert payload["confidence_delta_avg"] is not None
    assert isinstance(payload["confidence_delta_trend"], list)


def test_admin_anonymous_metrics_endpoint(monkeypatch, tmp_path: Path):
    client = _build_test_client(tmp_path, monkeypatch)
    admin_token = _login(client, ADMIN_EMAIL, ADMIN_PASSWORD)

    _create_case_lifecycle(client, admin_token)

    metrics_response = client.get("/admin/metrics/anonymous", headers=_auth_headers(admin_token))
    assert metrics_response.status_code == 200
    payload = metrics_response.json()

    assert "active_students_with_cases" in payload
    assert "confidence_delta_trend" in payload
    assert payload["cases_total"] >= payload["cases_closed"]


def test_leader_evaluation_admin_create_and_student_read(monkeypatch, tmp_path: Path):
    client = _build_test_client(tmp_path, monkeypatch)
    admin_token = _login(client, ADMIN_EMAIL, ADMIN_PASSWORD)

    student = _create_student(client, admin_token, idx=1)
    cohort = _create_cohort(client, admin_token, idx=1)

    eval_payload = {
        "target_user_id": student["id"],
        "cohort_id": cohort["id"],
        "follow_up_date": "2026-03-01T00:00:00Z",
        "summary_note": "Avanzó en preparación.",
        "next_action": "Practicar cierre con objeciones.",
    }

    create_response = client.post(
        "/admin/leader-evaluations",
        json=eval_payload,
        headers=_auth_headers(admin_token),
    )
    assert create_response.status_code == 200, create_response.text

    student_token = _login(client, student["email"], "student1234")
    me_response = client.get("/leader-evaluations/me", headers=_auth_headers(student_token))
    assert me_response.status_code == 200
    items = me_response.json()
    assert len(items) == 1
    assert items[0]["target_user_id"] == student["id"]
    assert items[0]["next_action"] == "Practicar cierre con objeciones."


def test_student_cannot_access_admin_leader_evaluations(monkeypatch, tmp_path: Path):
    client = _build_test_client(tmp_path, monkeypatch)
    admin_token = _login(client, ADMIN_EMAIL, ADMIN_PASSWORD)
    student = _create_student(client, admin_token, idx=2)
    student_token = _login(client, student["email"], "student1234")

    post_response = client.post(
        "/admin/leader-evaluations",
        json={
            "target_user_id": student["id"],
            "follow_up_date": "2026-03-01T00:00:00Z",
            "summary_note": "No debería poder.",
            "next_action": "No aplica",
        },
        headers=_auth_headers(student_token),
    )
    assert post_response.status_code == 403

    get_response = client.get("/admin/leader-evaluations", headers=_auth_headers(student_token))
    assert get_response.status_code == 403


def test_close_case_rejects_invalid_metrics(monkeypatch, tmp_path: Path):
    client = _build_test_client(tmp_path, monkeypatch)
    admin_token = _login(client, ADMIN_EMAIL, ADMIN_PASSWORD)

    case_response = client.post(
        "/cases",
        json={"title": "Caso inválido cierre", "mode": "curso", "confidence_start": 5},
        headers=_auth_headers(admin_token),
    )
    case_id = case_response.json()["id"]

    client.put(f"/cases/{case_id}/preparation", json=REQUIRED_PREPARATION, headers=_auth_headers(admin_token))
    client.post(f"/cases/{case_id}/analyze", headers=_auth_headers(admin_token))
    client.post(f"/cases/{case_id}/execute", headers=_auth_headers(admin_token))
    client.put(f"/cases/{case_id}/debrief", json=VALID_DEBRIEF, headers=_auth_headers(admin_token))

    close_response = client.post(
        f"/cases/{case_id}/close",
        json={
            "confidence_end": 11,
            "agreement_quality_result": 4,
            "agreement_quality_relationship": 4,
            "agreement_quality_sustainability": 4,
        },
        headers=_auth_headers(admin_token),
    )
    assert close_response.status_code == 422


def test_unauthenticated_requests_are_blocked(monkeypatch, tmp_path: Path):
    client = _build_test_client(tmp_path, monkeypatch)

    me_response = client.get("/auth/me")
    assert me_response.status_code == 401

    cases_response = client.get("/cases")
    assert cases_response.status_code == 401


def test_case_ownership_is_enforced_between_students(monkeypatch, tmp_path: Path):
    client = _build_test_client(tmp_path, monkeypatch)
    admin_token = _login(client, ADMIN_EMAIL, ADMIN_PASSWORD)

    student_a = _create_student(client, admin_token, idx=10)
    student_b = _create_student(client, admin_token, idx=11)

    token_a = _login(client, student_a["email"], "student1234")
    token_b = _login(client, student_b["email"], "student1234")

    create_case_response = client.post(
        "/cases",
        json={"title": "Caso privado student A", "mode": "curso", "confidence_start": 7},
        headers=_auth_headers(token_a),
    )
    assert create_case_response.status_code == 200
    case_id = create_case_response.json()["id"]

    unauthorized_read = client.get(f"/cases/{case_id}", headers=_auth_headers(token_b))
    assert unauthorized_read.status_code == 403

    unauthorized_delete = client.delete(f"/cases/{case_id}", headers=_auth_headers(token_b))
    assert unauthorized_delete.status_code == 403

    admin_read = client.get(f"/cases/{case_id}", headers=_auth_headers(admin_token))
    assert admin_read.status_code == 200


def test_non_admin_cannot_create_admin_user(monkeypatch, tmp_path: Path):
    client = _build_test_client(tmp_path, monkeypatch)
    admin_token = _login(client, ADMIN_EMAIL, ADMIN_PASSWORD)
    student = _create_student(client, admin_token, idx=20)
    student_token = _login(client, student["email"], "student1234")

    response = client.post(
        "/admin/users",
        json={
            "email": "hacker@rb.local",
            "password": "12345678",
            "full_name": "Should Fail",
            "role": "student",
        },
        headers=_auth_headers(student_token),
    )
    assert response.status_code == 403


def test_cohort_membership_add_is_idempotent_and_remove_works(monkeypatch, tmp_path: Path):
    client = _build_test_client(tmp_path, monkeypatch)
    admin_token = _login(client, ADMIN_EMAIL, ADMIN_PASSWORD)

    student = _create_student(client, admin_token, idx=30)
    cohort = _create_cohort(client, admin_token, idx=30)

    first_add = client.post(
        f"/admin/cohorts/{cohort['id']}/members",
        json={"user_ids": [student["id"]]},
        headers=_auth_headers(admin_token),
    )
    assert first_add.status_code == 200
    assert first_add.json()["added"] == 1

    second_add = client.post(
        f"/admin/cohorts/{cohort['id']}/members",
        json={"user_ids": [student["id"]]},
        headers=_auth_headers(admin_token),
    )
    assert second_add.status_code == 200
    assert second_add.json()["added"] == 0

    members_before = client.get(
        f"/admin/cohorts/{cohort['id']}/members",
        headers=_auth_headers(admin_token),
    )
    assert members_before.status_code == 200
    assert len(members_before.json()) == 1

    remove = client.delete(
        f"/admin/cohorts/{cohort['id']}/members/{student['id']}",
        headers=_auth_headers(admin_token),
    )
    assert remove.status_code == 200
    assert remove.json()["ok"] is True

    members_after = client.get(
        f"/admin/cohorts/{cohort['id']}/members",
        headers=_auth_headers(admin_token),
    )
    assert members_after.status_code == 200
    assert len(members_after.json()) == 0


def test_case_template_origin_depends_on_active_cohort_membership(monkeypatch, tmp_path: Path):
    client = _build_test_client(tmp_path, monkeypatch)
    admin_token = _login(client, ADMIN_EMAIL, ADMIN_PASSWORD)

    student = _create_student(client, admin_token, idx=40)
    cohort = _create_cohort(client, admin_token, idx=40)

    add_membership = client.post(
        f"/admin/cohorts/{cohort['id']}/members",
        json={"user_ids": [student["id"]]},
        headers=_auth_headers(admin_token),
    )
    assert add_membership.status_code == 200

    student_token = _login(client, student["email"], "student1234")

    templates_response = client.get("/case-templates", headers=_auth_headers(student_token))
    assert templates_response.status_code == 200
    template_id = templates_response.json()[0]["id"]

    from_template_live = client.post(
        f"/cases/from-template/{template_id}",
        json={"confidence_start": 6},
        headers=_auth_headers(student_token),
    )
    assert from_template_live.status_code == 200
    case_live = from_template_live.json()
    assert case_live["confidence_start"] == 6

    with Session(db.engine) as session:
        live_entity = session.get(Case, case_live["id"])
        assert live_entity is not None
        assert live_entity.origin == "live_session"
        assert live_entity.cohort_id == cohort["id"]

    remove_membership = client.delete(
        f"/admin/cohorts/{cohort['id']}/members/{student['id']}",
        headers=_auth_headers(admin_token),
    )
    assert remove_membership.status_code == 200

    from_template_sparring = client.post(
        f"/cases/from-template/{template_id}",
        json={"confidence_start": 5},
        headers=_auth_headers(student_token),
    )
    assert from_template_sparring.status_code == 200
    case_sparring = from_template_sparring.json()
    assert case_sparring["confidence_start"] == 5

    with Session(db.engine) as session:
        sparring_entity = session.get(Case, case_sparring["id"])
        assert sparring_entity is not None
        assert sparring_entity.origin == "sparring"
        assert sparring_entity.cohort_id is None


def test_leader_evaluation_rejects_invalid_period_label(monkeypatch, tmp_path: Path):
    client = _build_test_client(tmp_path, monkeypatch)
    admin_token = _login(client, ADMIN_EMAIL, ADMIN_PASSWORD)
    student = _create_student(client, admin_token, idx=50)

    response = client.post(
        "/admin/leader-evaluations",
        json={
            "target_user_id": student["id"],
            "period_label": "2026/03",
            "summary_note": "Periodo inválido",
            "next_action": "Corregir",
        },
        headers=_auth_headers(admin_token),
    )
    assert response.status_code == 400
