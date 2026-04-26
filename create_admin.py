import psycopg2
try:
    conn = psycopg2.connect('postgresql://postgres:604730@localhost:5432/e_commerce')
    cur = conn.cursor()
    # password123
    pw_hash = '$2a$10$50k2jdYHYQbj7ClsOUZq1e0efDftzYXx952eaU1ehpInTRXlLFITe'
    users = [
        ('admin@shoplens.com', 'ADMIN', 'Male'),
        ('corp@shoplens.com', 'Corporate', 'Other'),
        ('user@shoplens.com', 'Individual', 'Other'),
        ('musteri@gmail.com', 'Individual', 'Other'),
    ]
    for email, role, gender in users:
        cur.execute(
            """
            INSERT INTO users (email, password_hash, role_type, gender)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (email) DO UPDATE
            SET password_hash = EXCLUDED.password_hash,
                role_type = EXCLUDED.role_type,
                gender = EXCLUDED.gender
            """,
            (email, pw_hash, role, gender)
        )
    conn.commit()
    print("Demo users are ready. Password for all demo accounts: password123")
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
