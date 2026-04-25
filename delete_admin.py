import psycopg2
try:
    conn = psycopg2.connect('postgresql://postgres:604730@localhost:5432/e_commerce')
    cur = conn.cursor()
    cur.execute("DELETE FROM users WHERE email = 'admin@shoplens.com'")
    conn.commit()
    print("User admin@shoplens.com deleted. You can now register it via UI.")
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
