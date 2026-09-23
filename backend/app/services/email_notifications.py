import logging
import smtplib
from datetime import datetime
from email.message import EmailMessage
from html import escape
from typing import Any

from app.core.config import settings
from app.models.application import Application
from app.models.contract import Contract
from app.models.interview import Interview

logger = logging.getLogger(__name__)

SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 587


def _configured() -> bool:
    return bool(settings.smtp_email and settings.smtp_app_password)


def _send_html_email(*, to_email: str, subject: str, html_body: str) -> bool:
    if not _configured():
        logger.info("Recruitify email skipped because SMTP_EMAIL/SMTP_APP_PASSWORD are not configured.")
        return False
    message = EmailMessage()
    message["From"] = f"Recruitify <{settings.smtp_email}>"
    message["To"] = to_email
    message["Subject"] = subject
    message.set_content(_html_to_plain_text(html_body))
    message.add_alternative(html_body, subtype="html")
    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as smtp:
            smtp.starttls()
            smtp.login(settings.smtp_email, settings.smtp_app_password)
            smtp.send_message(message)
        return True
    except smtplib.SMTPException as exc:
        logger.warning("Recruitify SMTP email failed for %s: %s", to_email, exc.__class__.__name__)
    except OSError as exc:
        logger.warning("Recruitify SMTP connection failed for %s: %s", to_email, exc.__class__.__name__)
    return False


def _html_to_plain_text(html: str) -> str:
    return html.replace("<br>", "\n").replace("<br />", "\n").replace("</p>", "\n\n").replace("</li>", "\n")


def _layout(title: str, greeting: str, body: str, cta: str | None = None) -> str:
    cta_html = f'<p style="margin:24px 0 0;"><strong style="color:#126044;">{escape(cta)}</strong></p>' if cta else ""
    return f"""
    <div style="margin:0;padding:0;background:#f5f8f6;font-family:Arial,Helvetica,sans-serif;color:#17231d;">
      <div style="max-width:640px;margin:0 auto;padding:28px 18px;">
        <div style="background:#10251d;color:#ffffff;border-radius:18px 18px 0 0;padding:22px 26px;">
          <div style="font-size:20px;font-weight:800;letter-spacing:-0.4px;">Recruitify</div>
          <div style="margin-top:6px;color:#cfe5d7;font-size:13px;">Recruitment update</div>
        </div>
        <div style="background:#ffffff;border:1px solid #dfe8e2;border-top:0;border-radius:0 0 18px 18px;padding:28px 26px;">
          <h1 style="margin:0 0 16px;color:#102119;font-size:24px;line-height:1.2;">{escape(title)}</h1>
          <p style="margin:0 0 18px;font-size:15px;line-height:1.6;">{escape(greeting)}</p>
          <div style="font-size:14px;line-height:1.65;color:#314139;">{body}</div>
          {cta_html}
          <p style="margin:28px 0 0;color:#728078;font-size:12px;line-height:1.5;">This message was sent by Recruitify. Please sign in to your account for the latest application details.</p>
        </div>
      </div>
    </div>
    """


def _full_name(application: Application) -> str:
    return f"{application.applicant.first_name} {application.applicant.last_name}".strip()


def _format_datetime(value: datetime | None) -> str:
    if value is None:
        return "To be confirmed"
    return value.strftime("%B %d, %Y at %I:%M %p")


def _detail_rows(rows: list[tuple[str, Any]]) -> str:
    items = "".join(
        f'<tr><td style="padding:8px 12px;color:#607168;font-size:13px;">{escape(label)}</td><td style="padding:8px 12px;color:#17231d;font-size:13px;font-weight:700;">{escape(str(value or "Not specified"))}</td></tr>'
        for label, value in rows
    )
    return f'<table style="width:100%;border-collapse:collapse;background:#f8fbf9;border-radius:12px;overflow:hidden;">{items}</table>'


def send_application_submitted_email(application: Application) -> bool:
    title = "Application received"
    body = f"<p>We received your application for <strong>{escape(application.job.title)}</strong>.</p>" + _detail_rows([
        ("Job", application.job.title),
        ("Department", application.job.department),
        ("Submitted", _format_datetime(application.submitted_at)),
    ])
    return _send_html_email(to_email=application.applicant.email, subject=f"Recruitify: Application received for {application.job.title}", html_body=_layout(title, f"Hi {_full_name(application)},", body, "Thank you for applying."))


def send_interview_scheduled_email(interview: Interview) -> bool:
    application = interview.application
    body = f"<p>Your interview for <strong>{escape(application.job.title)}</strong> has been scheduled.</p>" + _detail_rows([
        ("Job", application.job.title),
        ("Interview time", _format_datetime(interview.scheduled_at)),
        ("Duration", f"{interview.duration_minutes} minutes"),
        ("Type", interview.interview_type.value.replace("_", " ").title()),
        ("Meeting / Location", interview.location_or_link or "To be confirmed"),
    ])
    return _send_html_email(to_email=application.applicant.email, subject=f"Recruitify: Interview scheduled for {application.job.title}", html_body=_layout("Interview scheduled", f"Hi {_full_name(application)},", body, "Please review the interview details in Recruitify."))


def send_interview_rescheduled_email(interview: Interview) -> bool:
    application = interview.application
    body = f"<p>Your interview for <strong>{escape(application.job.title)}</strong> has been rescheduled.</p>" + _detail_rows([
        ("New interview time", _format_datetime(interview.scheduled_at)),
        ("Duration", f"{interview.duration_minutes} minutes"),
        ("Type", interview.interview_type.value.replace("_", " ").title()),
        ("Meeting / Location", interview.location_or_link or "To be confirmed"),
    ])
    return _send_html_email(to_email=application.applicant.email, subject=f"Recruitify: Interview rescheduled for {application.job.title}", html_body=_layout("Interview rescheduled", f"Hi {_full_name(application)},", body, "Please use the updated interview details."))


def send_candidate_selected_email(application: Application) -> bool:
    body = f"<p>Congratulations. You have been selected for <strong>{escape(application.job.title)}</strong>.</p>" + _detail_rows([
        ("Job", application.job.title),
        ("Department", application.job.department),
        ("Status", "Selected"),
    ])
    return _send_html_email(to_email=application.applicant.email, subject=f"Recruitify: You have been selected for {application.job.title}", html_body=_layout("You have been selected", f"Hi {_full_name(application)},", body, "The hiring team will share next steps soon."))


def send_contract_sent_email(contract: Contract) -> bool:
    application = contract.application
    salary = "Not specified"
    if contract.salary_amount is not None and contract.salary_currency:
        salary = f"{contract.salary_amount:,.2f} {contract.salary_currency}"
    body = f"<p>Your offer contract for <strong>{escape(application.job.title)}</strong> is ready for review.</p>" + _detail_rows([
        ("Job", application.job.title),
        ("Contract type", contract.contract_type.value.replace("_", " ").title()),
        ("Start date", contract.start_date),
        ("Work location", contract.work_location),
        ("Salary", salary),
    ])
    return _send_html_email(to_email=application.applicant.email, subject=f"Recruitify: Contract ready for {application.job.title}", html_body=_layout("Contract ready for review", f"Hi {_full_name(application)},", body, "Please sign in to Recruitify to review your contract."))


def send_candidate_rejected_email(application: Application, feedback: str) -> bool:
    safe_feedback = escape(feedback).replace("\n", "<br>")
    body = f"<p>Thank you for your interest in <strong>{escape(application.job.title)}</strong>.</p><p>The hiring team shared the following feedback:</p><div style=\"padding:14px 16px;border-left:4px solid #126044;background:#f8fbf9;border-radius:10px;\">{safe_feedback}</div>"
    return _send_html_email(to_email=application.applicant.email, subject=f"Recruitify: Update on your application for {application.job.title}", html_body=_layout("Application update", f"Hi {_full_name(application)},", body))
