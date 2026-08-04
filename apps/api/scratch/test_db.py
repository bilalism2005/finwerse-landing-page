import psycopg2

password = "QnYAilwAcTk2tJu8"
project_ref = "zamjqukgoolsqxllnfvs"

# Test configs on aws-1 instead of aws-0
configs = [
    # 1. Pooler aws-1 on Port 6543 (Transaction Mode)
    f"postgresql://postgres.{project_ref}:{password}@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require",
    # 2. Pooler aws-1 on Port 5432 (Session Mode)
    f"postgresql://postgres.{project_ref}:{password}@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require",
]

for conn_str in configs:
    print(f"Testing connection string (masked password): {conn_str.replace(password, '****')}")
    try:
        conn = psycopg2.connect(conn_str, connect_timeout=5)
        cur = conn.cursor()
        cur.execute("SELECT version();")
        db_version = cur.fetchone()
        print(f"  -> SUCCESS! DB version: {db_version[0]}")
        cur.close()
        conn.close()
        break
    except Exception as e:
        print(f"  -> FAILED: {e}")
    print("-" * 50)
