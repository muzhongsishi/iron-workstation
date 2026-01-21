import smtplib
from email.mime.text import MIMEText
from email.header import Header
from email.utils import formataddr
import sys

def test_email(user, password, host="smtp.exmail.qq.com", port=465):
    print(f"Testing SMTP with:\nUser: {user}\nHost: {host}:{port}")
    
    msg = MIMEText('This is a test email from Iron Workstation.', 'plain', 'utf-8')
    msg['From'] = formataddr(["Iron Test", user])
    msg['To'] = formataddr(["User", user])
    msg['Subject'] = Header('Iron Workstation Test Email', 'utf-8')

    try:
        server = smtplib.SMTP_SSL(host, port)
        print("Connecting...")
        server.connect(host, port)
        print("Connected. Logging in...")
        server.login(user, password)
        print("Logged in. Sending...")
        server.sendmail(user, [user], msg.as_string())
        server.quit()
        print("Success! Email sent.")
        return True
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python test_email_manual.py <user> <password> [host]")
        sys.exit(1)
        
    u = sys.argv[1]
    p = sys.argv[2]
    h = sys.argv[3] if len(sys.argv) > 3 else "smtp.exmail.qq.com"
    
    # Auto-detect host for QQ
    if h == "auto":
        if "@qq.com" in u:
            h = "smtp.qq.com"
        else:
            h = "smtp.exmail.qq.com"
            
    test_email(u, p, h)
