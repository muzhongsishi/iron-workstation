import smtplib
from email.mime.text import MIMEText
from email.header import Header
from email.utils import formataddr
import os
from dotenv import load_dotenv

load_dotenv()

SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.qq.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 465))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")

def send_email(to_addr: str, subject: str, content: str):
    if not SMTP_USER or not SMTP_PASSWORD:
        print(f"[Mock Email] To: {to_addr} | Subject: {subject} | Content: {content[:50]}...")
        return

    message = MIMEText(content, 'plain', 'utf-8')
    message['From'] = formataddr(["Iron Workstation", SMTP_USER])
    message['To'] = formataddr(["User", to_addr])
    message['Subject'] = Header(subject, 'utf-8')

    try:
        server = smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT)
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.sendmail(SMTP_USER, [to_addr], message.as_string())
        server.quit()
        print(f"Email sent to {to_addr}")
    except Exception as e:
        print(f"Failed to send email: {e}")
