from sqlmodel import SQLModel, create_engine, Session
import os

# 读取数据库连接环境变量（适用于 Supabase 等 PostgreSQL 服务）
database_url = os.environ.get("DATABASE_URL")

# 兼容 Hugging Face Docker 空间：在 Docker 模式下，HF 的 Secrets 默认不注入环境变量，而是作为文件挂载在 /secrets/ 目录下
if not database_url and os.path.exists("/secrets/DATABASE_URL"):
    try:
        with open("/secrets/DATABASE_URL", "r", encoding="utf-8") as f:
            database_url = f.read().strip()
        print("🔑 Loaded DATABASE_URL from Hugging Face secrets file")
    except Exception as e:
        print(f"⚠️ Failed to read /secrets/DATABASE_URL: {e}")

if database_url:

    # 兼容处理：SQLAlchemy 要求连接串以 postgresql:// 开头，而部分平台（如 Render）默认以 postgres:// 开头
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)
    
    db_url = database_url
    connect_args = {}
    print("🔌 Using PostgreSQL Database (Cloud)")
else:
    # 回退到 SQLite 本地数据库
    if os.path.exists("/data"):
        sqlite_file_name = "/data/database.db"
    else:
        sqlite_file_name = "database.db"
    
    db_url = f"sqlite:///{sqlite_file_name}"
    connect_args = {"check_same_thread": False}
    print(f"📁 Using SQLite Database: {sqlite_file_name}")

engine = create_engine(db_url, echo=True, connect_args=connect_args)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session

