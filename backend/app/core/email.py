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
        """
        Send an email via SMTP

        Args:
            to_email: Recipient email address
            subject: Email subject
            html_content: HTML content of the email
            text_content: Plain text fallback (optional)

        Returns:
            bool: True if email was sent successfully, False otherwise
        """
        if not settings.send_emails:
            logger.info(f"[SEND_EMAILS=false] Skipping email to {to_email}: {subject}")
            return True

        try:
            # Create message
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = f"{self.from_name} <{self.from_email}>"
            message["To"] = to_email

            # Add text and HTML parts
            if text_content:
                part1 = MIMEText(text_content, "plain")
                message.attach(part1)

            part2 = MIMEText(html_content, "html")
            message.attach(part2)

            # Send email
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_user, self.smtp_password)
                server.send_message(message)

            logger.info(f"Email sent successfully to {to_email}")
            return True

        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            return False

    def send_verification_email(
        self,
        to_email: str,
        username: str,
        verification_link: str
    ) -> bool:
        """
        Send email verification link to user

        Args:
            to_email: User's email address
            username: User's username
            verification_link: Full verification URL with token

        Returns:
            bool: True if email was sent successfully
        """
        subject = "Overenie e-mailovej adresy – Wrestlingová federácia"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #1e40af; color: white; padding: 20px; text-align: center; }}
                .content {{ background-color: #f9fafb; padding: 30px; }}
                .button {{
                    display: inline-block;
                    background-color: #1e40af;
                    color: white;
                    padding: 12px 30px;
                    text-decoration: none;
                    border-radius: 5px;
                    margin: 20px 0;
                }}
                .footer {{ text-align: center; padding: 20px; font-size: 12px; color: #6b7280; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Vitajte vo Wrestlingovej federácii!</h1>
                </div>
                <div class="content">
                    <h2>Ahoj {username},</h2>
                    <p>Ďakujeme za registráciu! Pre aktiváciu účtu prosím overte svoju e-mailovú adresu.</p>
                    <p>Kliknite na tlačidlo nižšie pre overenie:</p>
                    <div style="text-align: center;">
                        <a href="{verification_link}" class="button">Overiť e-mailovú adresu</a>
                    </div>
                    <p>Alebo skopírujte a vložte tento odkaz do prehliadača:</p>
                    <p style="word-break: break-all; color: #1e40af;">{verification_link}</p>
                    <p><strong>Platnosť tohto odkazu vyprší za 24 hodín.</strong></p>
                    <p>Ak ste si nevytvorili tento účet, tento e-mail ignorujte.</p>
                </div>
                <div class="footer">
                    <p>&copy; 2025 Wrestlingová federácia. Všetky práva vyhradené.</p>
                </div>
            </div>
        </body>
        </html>
        """

        text_content = f"""
        Vitajte vo Wrestlingovej federácii!

        Ahoj {username},

        Ďakujeme za registráciu! Pre aktiváciu účtu prosím overte svoju e-mailovú adresu.

        Overovací odkaz: {verification_link}

        Platnosť tohto odkazu vyprší za 24 hodín.

        Ak ste si nevytvorili tento účet, tento e-mail ignorujte.

        ---
        Wrestlingová federácia
        """

        return self.send_email(to_email, subject, html_content, text_content)

    def send_password_reset_email(
        self,
        to_email: str,
        username: str,
        reset_link: str
    ) -> bool:
        """
        Send password reset link to user

        Args:
            to_email: User's email address
            username: User's username
            reset_link: Full password reset URL with token

        Returns:
            bool: True if email was sent successfully
        """
        subject = "Obnovenie hesla – Wrestlingová federácia"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #dc2626; color: white; padding: 20px; text-align: center; }}
                .content {{ background-color: #f9fafb; padding: 30px; }}
                .button {{
                    display: inline-block;
                    background-color: #dc2626;
                    color: white;
                    padding: 12px 30px;
                    text-decoration: none;
                    border-radius: 5px;
                    margin: 20px 0;
                }}
                .footer {{ text-align: center; padding: 20px; font-size: 12px; color: #6b7280; }}
                .warning {{ background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Žiadosť o obnovenie hesla</h1>
                </div>
                <div class="content">
                    <h2>Ahoj {username},</h2>
                    <p>Dostali sme žiadosť o obnovenie hesla pre váš účet vo Wrestlingovej federácii.</p>
                    <p>Kliknite na tlačidlo nižšie pre obnovenie hesla:</p>
                    <div style="text-align: center;">
                        <a href="{reset_link}" class="button">Obnoviť heslo</a>
                    </div>
                    <p>Alebo skopírujte a vložte tento odkaz do prehliadača:</p>
                    <p style="word-break: break-all; color: #dc2626;">{reset_link}</p>
                    <div class="warning">
                        <strong>⚠️ Bezpečnostné upozornenie:</strong><br>
                        • Platnosť tohto odkazu vyprší za 1 hodinu<br>
                        • Po kliknutí vám bude vygenerované nové náhodné heslo<br>
                        • Ak ste o obnovenie nežiadali, tento e-mail ignorujte
                    </div>
                </div>
                <div class="footer">
                    <p>&copy; 2025 Wrestlingová federácia. Všetky práva vyhradené.</p>
                </div>
            </div>
        </body>
        </html>
        """

        text_content = f"""
        Žiadosť o obnovenie hesla

        Ahoj {username},

        Dostali sme žiadosť o obnovenie hesla pre váš účet vo Wrestlingovej federácii.

        Odkaz na obnovenie hesla: {reset_link}

        Platnosť tohto odkazu vyprší za 1 hodinu.
        Po kliknutí vám bude vygenerované nové náhodné heslo.

        Ak ste o obnovenie nežiadali, tento e-mail ignorujte.

        ---
        Wrestlingová federácia
        """

        return self.send_email(to_email, subject, html_content, text_content)

    def send_new_password_email(
        self,
        to_email: str,
        username: str,
        new_password: str
    ) -> bool:
        """
        Send new password to user after successful reset

        Args:
            to_email: User's email address
            username: User's username
            new_password: The new generated password

        Returns:
            bool: True if email was sent successfully
        """
        subject = "Vaše nové heslo – Wrestlingová federácia"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #16a34a; color: white; padding: 20px; text-align: center; }}
                .content {{ background-color: #f9fafb; padding: 30px; }}
                .password-box {{
                    background-color: #1e293b;
                    color: #22d3ee;
                    padding: 20px;
                    border-radius: 5px;
                    font-family: 'Courier New', monospace;
                    font-size: 18px;
                    text-align: center;
                    margin: 20px 0;
                    letter-spacing: 2px;
                }}
                .footer {{ text-align: center; padding: 20px; font-size: 12px; color: #6b7280; }}
                .warning {{ background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>✅ Heslo bolo úspešne obnovené</h1>
                </div>
                <div class="content">
                    <h2>Ahoj {username},</h2>
                    <p>Vaše heslo bolo úspešne obnovené!</p>
                    <p>Tu je vaše nové dočasné heslo:</p>
                    <div class="password-box">
                        {new_password}
                    </div>
                    <div class="warning">
                        <strong>⚠️ Dôležité:</strong><br>
                        • Skopírujte si toto heslo a uchovajte ho na bezpečnom mieste<br>
                        • Odporúčame ho zmeniť po prvom prihlásení<br>
                        • Nikdy nezdieľajte svoje heslo s nikým
                    </div>
                    <p>Prihlásiť sa môžete na: <a href="{settings.frontend_url}">{settings.frontend_url}</a></p>
                </div>
                <div class="footer">
                    <p>&copy; 2025 Wrestlingová federácia. Všetky práva vyhradené.</p>
                </div>
            </div>
        </body>
        </html>
        """

        text_content = f"""
        Heslo bolo úspešne obnovené

        Ahoj {username},

        Vaše heslo bolo úspešne obnovené!

        Vaše nové dočasné heslo: {new_password}

        DÔLEŽITÉ:
        - Skopírujte si toto heslo a uchovajte ho na bezpečnom mieste
        - Odporúčame ho zmeniť po prvom prihlásení
        - Nikdy nezdieľajte svoje heslo s nikým

        Prihlásiť sa môžete na: {settings.frontend_url}

        ---
        Wrestlingová federácia
        """

        return self.send_email(to_email, subject, html_content, text_content)


# Singleton instance
email_service = EmailService()
