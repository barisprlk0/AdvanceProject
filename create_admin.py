import psycopg2
try:
    conn = psycopg2.connect('postgresql://postgres:604730@localhost:5432/e_commerce')
    cur = conn.cursor()
    # password123
    pw_hash = '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xd00DMxs.TVuHOn2'
    cur.execute("INSERT INTO users (email, password_hash, role_type, gender) VALUES (%s, %s, %s, %s) ON CONFLICT (email) DO UPDATE SET role_type = 'ADMIN'", 
                ('admin@shoplens.com', pw_hash, 'ADMIN', 'Male'))
    conn.commit()
    print("Admin user created: admin@shoplens.com / password123")
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
