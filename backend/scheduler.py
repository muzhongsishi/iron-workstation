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
                # 💡 逻辑升级：智能检测到期后是否有其他同学抢占了坑
                stmt_next = select(Reservation).where(
                    (Reservation.workstation_id == ws.id) &
                    (Reservation.status == "active") &
                    (Reservation.start_date > tomorrow)
                )
                next_bookings = session.exec(stmt_next).all()
                
                if next_bookings:
                    # 后继有人
                    next_user_name = next_bookings[0].user.name
                    tip = (
                        f"⚠️ 注意交接：在您的预约到期后，该设备已有其他同学预约（紧接预约人: {next_user_name}，自 {next_bookings[0].start_date} 起）。\n"
                        f"为了不影响他人的研究计划，请您务必在明天到期前，及时迁出并备份您的数据、清理运行环境，并做好交接准备，十分感谢配合！"
                    )
                else:
                    # 暂无预约，可延期
                    tip = (
                        f"💡 延期提示：经系统检测，在您的预约到期后，该设备目前【暂无其他同学预约】。\n"
                        f"如果您仍需继续占用运行任务，可立即登录系统办理“延期预约”以延长您的使用期限，防止到期后设备自动变为空闲（Idle）被他人提前抢订。"
                    )
                
                subject = f"【到期预警】工作站 {ws.name} 预约即将结束"
                content = (
                    f"你好 {user.name}，\n\n"
                    f"您在 {ws.room} 预约的工作站/共享设备 {ws.name} 的预约期限将在明天 ({res.end_date}) 正式结束。\n\n"
                    f"{tip}\n\n"
                    f"祝您科研顺利！\n\n"
                    f"钢铁工作站 2.0 自动服务系统\n(Iron Workstation System)"
                )
                send_email(user.email, subject, content)

def check_1800_renew_reminder():
    """
    Check active reservations at 18:00.
    If the reservation hasn't been renewed TODAY (i.e. last_renewed_at is before today's 00:00:00),
    send an email reminder to the user to keep it active.
    """
    print("Running 18:00 Renew Reminder Check...")
    with Session(engine) as session:
        today = date.today()
        # Active reservations relevant to today (started before or today, ending today or later)
        stmt = select(Reservation).where(
            (Reservation.status == "active") &
            (Reservation.start_date <= today) &
            (Reservation.end_date >= today)
        )
        active_res = session.exec(stmt).all()
        
        # Today's start (00:00:00)
        today_start = datetime.combine(today, datetime.min.time())
        
        for res in active_res:
            # If last_renewed_at is older than today's 00:00:00, they haven't renewed today!
            if res.last_renewed_at < today_start:
                user = res.user
                ws = res.workstation
                if user and user.email:
                    subject = f"【每日续活提醒】工作站 {ws.name} 尚未进行今日续活"
                    content = (
                        f"你好 {user.name}，\n\n"
                        f"系统检测到你在 {ws.room} 预约的工作站/设备 {ws.name} 今天尚未进行续活。\n\n"
                        f"按照课题组计算资源管理规范，为了防止闲置占用，请在今晚 24:00 前登录系统点击“每日续活”按钮。\n"
                        f"如果今天 24:00 前仍未续活，该设备将被自动释放为 Idle 状态，供其他同学预约。\n\n"
                        f"如已结束使用，请忽略并登录系统释放资源。\n\n"
                        f"钢铁工作站 2.0 自动提醒系统\n(Iron Workstation System)"
                    )
                    send_email(user.email, subject, content)
                    print(f"Sent 18:00 reminder email to {user.name} for {ws.name}")

def start_scheduler():
    scheduler.add_job(check_heartbeat, 'interval', hours=24) # In prod, maybe specific time via cron trigger
    scheduler.add_job(check_expiry, 'cron', hour=9, minute=0) # Every morning at 9am
    scheduler.add_job(check_1800_renew_reminder, 'cron', hour=18, minute=0) # Daily warning at 6pm
    scheduler.start()
