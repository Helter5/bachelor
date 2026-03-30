"""Email service for sending verification and notification emails"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import logging

from ..config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)


class EmailService:
    """Service for sending emails via SMTP"""

    def __init__(self):
        self.smtp_host = settings.smtp_host
        self.smtp_port = settings.smtp_port
        self.smtp_user = settings.smtp_user
        self.smtp_password = settings.smtp_password
        self.from_email = settings.smtp_from_email
        self.from_name = settings.smtp_from_name

    def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> bool:
        if not settings.send_emails:
            logger.info(f"[SEND_EMAILS=false] Skipping email to {to_email}: {subject}")
            return True

        try:
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = f"{self.from_name} <{self.from_email}>"
            message["To"] = to_email

            if text_content:
                message.attach(MIMEText(text_content, "plain"))
            message.attach(MIMEText(html_content, "html"))

            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_user, self.smtp_password)
                server.send_message(message)

            logger.info(f"Email sent successfully to {to_email}")
            return True

        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            return False

    def send_verification_email(self, to_email: str, username: str, verification_link: str) -> bool:
        subject = "Overenie e-mailovej adresy"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }}
                .container {{ max-width: 560px; margin: 30px auto; padding: 0 20px; }}
                .content {{ background-color: #f9fafb; padding: 30px; border-radius: 8px; }}
                .button {{
                    display: inline-block;
                    background-color: #1e40af;
                    color: white !important;
                    padding: 12px 28px;
                    text-decoration: none;
                    border-radius: 6px;
                    margin: 20px 0;
                    font-weight: bold;
                }}
                .link {{ word-break: break-all; color: #1e40af; font-size: 13px; }}
                .footer {{ margin-top: 24px; font-size: 12px; color: #9ca3af; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="content">
                    <p>Ahoj <strong>{username}</strong>,</p>
                    <p>zaregistroval si sa do systému Wrestlingovej federácie. Pre dokončenie registrácie prosím over svoju e-mailovú adresu.</p>
                    <div style="text-align: center;">
                        <a href="{verification_link}" class="button">Overiť e-mail</a>
                    </div>
                    <p>Ak tlačidlo nefunguje, skopíruj tento odkaz do prehliadača:</p>
                    <p class="link">{verification_link}</p>
                    <p>Odkaz je platný 24 hodín. Ak si sa neregistroval, tento e-mail ignoruj.</p>
                </div>
                <div class="footer">Wrestlingová federácia</div>
            </div>
        </body>
        </html>
        """

        text_content = f"""Ahoj {username},

zaregistroval si sa do systému Wrestlingovej federácie. Pre dokončenie registrácie prosím over svoju e-mailovú adresu.

Overovací odkaz: {verification_link}

Odkaz je platný 24 hodín. Ak si sa neregistroval, tento e-mail ignoruj.

-- Wrestlingová federácia"""

        return self.send_email(to_email, subject, html_content, text_content)

    def send_password_reset_email(self, to_email: str, username: str, reset_link: str) -> bool:
        subject = "Obnovenie hesla"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }}
                .container {{ max-width: 560px; margin: 30px auto; padding: 0 20px; }}
                .content {{ background-color: #f9fafb; padding: 30px; border-radius: 8px; }}
                .button {{
                    display: inline-block;
                    background-color: #dc2626;
                    color: white !important;
                    padding: 12px 28px;
                    text-decoration: none;
                    border-radius: 6px;
                    margin: 20px 0;
                    font-weight: bold;
                }}
                .link {{ word-break: break-all; color: #dc2626; font-size: 13px; }}
                .note {{ background-color: #fef3c7; border-left: 3px solid #f59e0b; padding: 10px 14px; margin: 20px 0; font-size: 14px; }}
                .footer {{ margin-top: 24px; font-size: 12px; color: #9ca3af; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="content">
                    <p>Ahoj <strong>{username}</strong>,</p>
                    <p>dostali sme žiadosť o obnovenie hesla pre tvoj účet.</p>
                    <div style="text-align: center;">
                        <a href="{reset_link}" class="button">Obnoviť heslo</a>
                    </div>
                    <p>Ak tlačidlo nefunguje, skopíruj tento odkaz do prehliadača:</p>
                    <p class="link">{reset_link}</p>
                    <div class="note">
                        Odkaz je platný 1 hodinu. Po kliknutí ti bude vygenerované nové heslo a zaslané e-mailom.
                        Ak si o obnovenie nežiadal, tento e-mail ignoruj.
                    </div>
                </div>
                <div class="footer">Wrestlingová federácia</div>
            </div>
        </body>
        </html>
        """

        text_content = f"""Ahoj {username},

dostali sme žiadosť o obnovenie hesla pre tvoj účet.

Odkaz na obnovenie: {reset_link}

Odkaz je platný 1 hodinu. Po kliknutí ti bude vygenerované nové heslo a zaslané e-mailom.
Ak si o obnovenie nežiadal, tento e-mail ignoruj.

-- Wrestlingová federácia"""

        return self.send_email(to_email, subject, html_content, text_content)

    def send_new_password_email(self, to_email: str, username: str, new_password: str) -> bool:
        subject = "Tvoje nové heslo"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }}
                .container {{ max-width: 560px; margin: 30px auto; padding: 0 20px; }}
                .content {{ background-color: #f9fafb; padding: 30px; border-radius: 8px; }}
                .password-box {{
                    background-color: #1e293b;
                    color: #22d3ee;
                    padding: 18px;
                    border-radius: 6px;
                    font-family: 'Courier New', monospace;
                    font-size: 20px;
                    text-align: center;
                    margin: 20px 0;
                    letter-spacing: 2px;
                }}
                .note {{ background-color: #fef3c7; border-left: 3px solid #f59e0b; padding: 10px 14px; margin: 20px 0; font-size: 14px; }}
                .footer {{ margin-top: 24px; font-size: 12px; color: #9ca3af; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="content">
                    <p>Ahoj <strong>{username}</strong>,</p>
                    <p>tvoje heslo bolo obnovené. Tu je tvoje nové dočasné heslo:</p>
                    <div class="password-box">{new_password}</div>
                    <div class="note">
                        Po prihlásení si ho odporúčame zmeniť v nastaveniach účtu.
                    </div>
                    <p>Prihlásiť sa môžeš na: <a href="{settings.frontend_url}">{settings.frontend_url}</a></p>
                </div>
                <div class="footer">Wrestlingová federácia</div>
            </div>
        </body>
        </html>
        """

        text_content = f"""Ahoj {username},

tvoje heslo bolo obnovené. Tu je tvoje nové dočasné heslo:

{new_password}

Po prihlásení si ho odporúčame zmeniť v nastaveniach účtu.

Prihlásiť sa môžeš na: {settings.frontend_url}

-- Wrestlingová federácia"""

        return self.send_email(to_email, subject, html_content, text_content)


# Singleton instance
email_service = EmailService()
