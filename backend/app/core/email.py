"""Email service for sending verification and notification emails"""
import os
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
        if os.environ.get("SEND_EMAILS", "true").lower() == "false":
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
        subject = "Verify your Wrestling Federation account"

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
                    <h1>Welcome to Wrestling Federation!</h1>
                </div>
                <div class="content">
                    <h2>Hello {username},</h2>
                    <p>Thank you for registering! Please verify your email address to activate your account.</p>
                    <p>Click the button below to verify your email:</p>
                    <div style="text-align: center;">
                        <a href="{verification_link}" class="button">Verify Email Address</a>
                    </div>
                    <p>Or copy and paste this link into your browser:</p>
                    <p style="word-break: break-all; color: #1e40af;">{verification_link}</p>
                    <p><strong>This link will expire in 24 hours.</strong></p>
                    <p>If you didn't create this account, please ignore this email.</p>
                </div>
                <div class="footer">
                    <p>&copy; 2025 Wrestling Federation. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """

        text_content = f"""
        Welcome to Wrestling Federation!

        Hello {username},

        Thank you for registering! Please verify your email address to activate your account.

        Verification link: {verification_link}

        This link will expire in 24 hours.

        If you didn't create this account, please ignore this email.

        ---
        Wrestling Federation
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
        subject = "Reset Your Wrestling Federation Password"

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
                    <h1>Password Reset Request</h1>
                </div>
                <div class="content">
                    <h2>Hello {username},</h2>
                    <p>We received a request to reset your password for your Wrestling Federation account.</p>
                    <p>Click the button below to reset your password:</p>
                    <div style="text-align: center;">
                        <a href="{reset_link}" class="button">Reset Password</a>
                    </div>
                    <p>Or copy and paste this link into your browser:</p>
                    <p style="word-break: break-all; color: #dc2626;">{reset_link}</p>
                    <div class="warning">
                        <strong>⚠️ Security Notice:</strong><br>
                        • This link will expire in 1 hour<br>
                        • A new random password will be generated and sent to your email<br>
                        • If you didn't request this reset, please ignore this email
                    </div>
                </div>
                <div class="footer">
                    <p>&copy; 2025 Wrestling Federation. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """

        text_content = f"""
        Password Reset Request

        Hello {username},

        We received a request to reset your password for your Wrestling Federation account.

        Reset link: {reset_link}

        This link will expire in 1 hour.
        A new random password will be generated and sent to your email.

        If you didn't request this reset, please ignore this email.

        ---
        Wrestling Federation
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
        subject = "Your New Wrestling Federation Password"

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
                    <h1>✅ Password Reset Successful</h1>
                </div>
                <div class="content">
                    <h2>Hello {username},</h2>
                    <p>Your password has been successfully reset!</p>
                    <p>Here is your new temporary password:</p>
                    <div class="password-box">
                        {new_password}
                    </div>
                    <div class="warning">
                        <strong>⚠️ Important:</strong><br>
                        • Copy this password and keep it safe<br>
                        • We recommend changing it after your first login<br>
                        • Never share your password with anyone
                    </div>
                    <p>You can now log in with this password at: <a href="{settings.frontend_url}">{settings.frontend_url}</a></p>
                </div>
                <div class="footer">
                    <p>&copy; 2025 Wrestling Federation. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """

        text_content = f"""
        Password Reset Successful

        Hello {username},

        Your password has been successfully reset!

        Your new temporary password: {new_password}

        IMPORTANT:
        - Copy this password and keep it safe
        - We recommend changing it after your first login
        - Never share your password with anyone

        You can now log in at: {settings.frontend_url}

        ---
        Wrestling Federation
        """

        return self.send_email(to_email, subject, html_content, text_content)


# Singleton instance
email_service = EmailService()
