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

    source_labels = {
        "lead_magnet": "Lead Magnet: Protocolo IA",
        "modal": "Lead Magnet: Asesoría Equipos",
        "demo": "Demo: Exploración Framework",
        "solicitar_asesoria": "Solicitud: Asesoría Directa",
        "protocolo_48h": "Solicitud: Asesoramiento 48h",
    }
    source_label = source_labels.get(source, "Lead Magnet: Asesoría Equipos")

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


def send_admin_notification(
    lead_email: str,
    source: str,
    nombre: str | None = None,
    tamaño_equipo: str | None = None,
    preocupacion: str | None = None,
) -> None:
    """Send admin notification via Brevo email"""
    if not settings.brevo_api_key:
        logger.warning("BREVO_API_KEY no configurada, no se envió notificación al admin")
        return

    try:
        import sib_api_v3_sdk
        from sib_api_v3_sdk.rest import ApiException
    except ImportError as exc:
        logger.error(f"Dependencia sib_api_v3_sdk no instalada: {exc}")
        return

    configuration = sib_api_v3_sdk.Configuration()
    configuration.api_key["api-key"] = settings.brevo_api_key

    api_client = sib_api_v3_sdk.ApiClient(configuration)
    transactional_api = sib_api_v3_sdk.TransactionalEmailsApi(api_client)

    source_labels = {
        "lead_magnet": "Protocolo IA",
        "modal": "Asesoría Equipos",
        "demo": "Demo Framework",
        "solicitar_asesoria": "Asesoría Directa",
        "protocolo_48h": "Asesoramiento 48h",
    }
    source_label = source_labels.get(source, "Contacto Público")

    # Build HTML email body
    html_body = f"""
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6;">
    <h2>📧 Captura de Lead Público</h2>
    
    <p><strong>Fuente:</strong> {source_label}</p>
    <p><strong>Email:</strong> <a href="mailto:{lead_email}">{lead_email}</a></p>
    
    {f'<p><strong>Nombre:</strong> {nombre}</p>' if nombre else ''}
    {f'<p><strong>Tamaño de Equipo:</strong> {tamaño_equipo}</p>' if tamaño_equipo else ''}
    {f'<p><strong>Preocupación:</strong> {preocupacion}</p>' if preocupacion else ''}
</body>
</html>
"""

    sender = {
        "name": settings.brevo_sender_name,
        "email": settings.brevo_sender_email,
    }
    
    to = [
        {
            "email": settings.public_lead_notification_email,
        }
    ]

    send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
        to=to,
        html_content=html_body,
        sender=sender,
        subject=f"[{source_label}] Nuevo lead: {lead_email}",
    )

    try:
        response = transactional_api.send_transac_email(send_smtp_email)
        logger.info(f"Notificación enviada al admin ({settings.public_lead_notification_email})")
    except ApiException as exc:
        logger.warning(f"No se pudo enviar notificación al admin: {exc}")

