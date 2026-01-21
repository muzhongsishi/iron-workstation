from apscheduler.schedulers.asyncio import AsyncIOScheduler
from datetime import datetime, timedelta, date
from sqlmodel import Session, select
from .database import engine
from .models import Reservation, User, Workstation
from .services.email import send_email

scheduler = AsyncIOScheduler()

def check_heartbeat():
    """
    Check for active reservations that haven't been renewed in > 24 hours.
    """
    print("Running Heartbeat Check...")
    with Session(engine) as session:
        today = date.today()
        # Active reservations relevant to today (started before or today, ending today or later)
        stmt = select(Reservation).where(
            (Reservation.status == "active") &
            (Reservation.start_date <= today) &
            (Reservation.end_date >= today)
        )
        active_res = session.exec(stmt).all()
        
        cutoff = datetime.now() - timedelta(hours=24)
        
        for res in active_res:
            # If last_renewed_at is older than 24h
            if res.last_renewed_at < cutoff:
                user = res.user
                ws = res.workstation
                if user.email:
                    subject = f"【请确认】工作站 {ws.name} 使用续活提醒"
                    content = f"你好 {user.name}，\n\n系统检测到你在 {ws.room} 的工作站 {ws.name} 上的预约正在进行中，但已超过 24 小时未点击“续活”。\n\n如果任务仍在运行，请登录系统点击“续活”。如果任务已结束，请及时释放资源。\n\nIron Workstation System"
                    send_email(user.email, subject, content)
                    
                    # CC Admin logic could go here if admins had emails in DB
                    if ws.admin_name:
                         # For now just log or mock admin email
                         print(f"Should copy admin {ws.admin_name} for user {user.name}")


def check_expiry():
    """
    Check for reservations ending tomorrow.
    """
    print("Running Expiry Check...")
    with Session(engine) as session:
        tomorrow = date.today() + timedelta(days=1)
        stmt = select(Reservation).where(
            (Reservation.status == "active") &
            (Reservation.end_date == tomorrow)
        )
        expiring_res = session.exec(stmt).all()
        
        for res in expiring_res:
            user = res.user
            ws = res.workstation
            if user.email:
                subject = f"【到期预警】工作站 {ws.name} 预约即将结束"
                content = f"你好 {user.name}，\n\n你在 {ws.name} 的预约将在明天 ({res.end_date}) 结束。\n\n请准备迁移数据或释放资源。如需延期，请登录系统进行新的预约（如果无冲突）。\n\nIron Workstation System"
                send_email(user.email, subject, content)

def start_scheduler():
    scheduler.add_job(check_heartbeat, 'interval', hours=24) # In prod, maybe specific time via cron trigger
    scheduler.add_job(check_expiry, 'cron', hour=9, minute=0) # Every morning at 9am
    scheduler.start()
