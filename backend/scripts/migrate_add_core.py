import sqlite3

def migrate():
    try:
        conn = sqlite3.connect('database.db')
        cursor = conn.cursor()
        cursor.execute("ALTER TABLE workstation ADD COLUMN core_count TEXT")
        conn.commit()
        print("Migration successful: added core_count column.")
        conn.close()
    except Exception as e:
        print(f"Migration failed (maybe column exists?): {e}")

if __name__ == "__main__":
    migrate()
