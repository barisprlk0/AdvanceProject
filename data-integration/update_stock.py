import psycopg2
import random

def update_stock():
    try:
        conn = psycopg2.connect(
            dbname="e_commerce",
            user="postgres",
            password="604730",
            host="localhost",
            port="5432"
        )
        cur = conn.cursor()
        
        # Fetch all product IDs
        cur.execute("SELECT id FROM products WHERE stock_quantity IS NULL OR stock_quantity = 0")
        rows = cur.fetchall()
        
        print(f"Found {len(rows)} products with 0 or NULL stock.")
        
        for row in rows:
            new_stock = random.randint(0, 200)
            cur.execute("UPDATE products SET stock_quantity = %s WHERE id = %s", (new_stock, row[0]))
            
        conn.commit()
        print("Stock update complete.")
        
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    update_stock()
