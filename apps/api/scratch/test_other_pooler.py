import psycopg2

password = "QnYAilwAcTk2tJu8"

# Test configs
configs = [
    # Test Dumpo project pooler
    f"postgresql://postgres.paicgjcwwwzlvcqkergu:{password}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require",
    # Test plain postgres user on pooler
    f"postgresql://postgres:{password}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require",
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
