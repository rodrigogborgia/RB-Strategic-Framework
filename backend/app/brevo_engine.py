from __future__ import annotations

import logging

from .settings import settings

logger = logging.getLogger(__name__)


def upsert_contact_in_brevo(email: str, concern: str, source: str = "modal") -> None:
    if not settings.brevo_api_key:
        raise RuntimeError("BREVO_API_KEY no configurada")

    try:
        import sib_api_v3_sdk
        from sib_api_v3_sdk.rest import ApiException
    except ImportError as exc:
        raise RuntimeError("Dependencia sib_api_v3_sdk no instalada") from exc

    configuration = sib_api_v3_sdk.Configuration()
    configuration.api_key["api-key"] = settings.brevo_api_key

    api_client = sib_api_v3_sdk.ApiClient(configuration)
    contacts_api = sib_api_v3_sdk.ContactsApi(api_client)

    source_label = "Lead Magnet: Protocolo IA" if source == "lead_magnet" else "Lead Magnet: Asesoría Equipos"

    attributes = {
        settings.brevo_interest_attribute: concern,
        settings.brevo_source_attribute: source_label,
    }

    payload = sib_api_v3_sdk.CreateContact(
        email=email,
        list_ids=[settings.brevo_list_id],
        update_enabled=True,
        attributes=attributes,
    )

    try:
        result = contacts_api.create_contact(payload)
        logger.info(
            f"Lead capturado exitosamente: email={email}, source={source_label}, list_id={settings.brevo_list_id}"
        )
    except ApiException as exc:
        logger.error(f"Brevo API error para {email}: {exc}")
        raise RuntimeError(f"Brevo API error: {exc}") from exc
