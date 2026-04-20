import pandas as pd
import numpy as np
from sqlalchemy import create_engine, Column, Integer, String, Numeric, ForeignKey, DateTime, Text, text
from sqlalchemy.orm import sessionmaker, declarative_base
import datetime
import logging
import os
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

# Logging setup
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

Base = declarative_base()

# SQLAlchemy Models aligned with your SQL schema
class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role_type = Column(String(50), nullable=False)
    gender = Column(String(10))

class Store(Base):
    __tablename__ = 'stores'
    id = Column(Integer, primary_key=True)
    owner_id = Column(Integer, ForeignKey('users.id'))
    name = Column(String(100))
    status = Column(String(20))

class CustomerProfile(Base):
    __tablename__ = 'customer_profiles'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), unique=True)
    age = Column(Integer)
    city = Column(String(100))
    membership_type = Column(String(50))

class Category(Base):
    __tablename__ = 'categories'
    id = Column(Integer, primary_key=True)
    name = Column(String(100))
    parent_id = Column(Integer, ForeignKey('categories.id'), nullable=True)

class Product(Base):
    __tablename__ = 'products'
    id = Column(Integer, primary_key=True)
    store_id = Column(Integer, ForeignKey('stores.id'))
    category_id = Column(Integer, ForeignKey('categories.id'))
    sku = Column(String(100))
    name = Column(String(255))
    unit_price = Column(Numeric(10, 2))

class Order(Base):
    __tablename__ = 'orders'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    store_id = Column(Integer, ForeignKey('stores.id'))
    status = Column(String(50))
    grand_total = Column(Numeric(10, 2))

class OrderItem(Base):
    __tablename__ = 'order_items'
    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey('orders.id'))
    product_id = Column(Integer, ForeignKey('products.id'))
    quantity = Column(Integer)
    price = Column(Numeric(10, 2))

class Shipment(Base):
    __tablename__ = 'shipments'
    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey('orders.id'))
    warehouse = Column(String(50))
    mode = Column(String(50))
    status = Column(String(50))

class Review(Base):
    __tablename__ = 'reviews'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    product_id = Column(Integer, ForeignKey('products.id'))
    star_rating = Column(Integer)
    sentiment = Column(String(50))

# ETL Pipeline Class
class ETLPipeline:
    def __init__(self, db_url, raw_data_dir, sql_schema):
        base_url, db_name = db_url.rsplit('/', 1)
        self.db_name = db_name
        self.full_url = db_url
        self.engine = create_engine(db_url)
        self.raw_data_dir = raw_data_dir
        self.sql_schema = sql_schema
        self.datasets = {}

    def ensure_database_exists(self):
        logger.info(f"Checking if database '{self.db_name}' exists...")
        from sqlalchemy.engine.url import make_url
        url = make_url(self.full_url)
        conn = psycopg2.connect(dbname='postgres', user=url.username, password=url.password, host=url.host, port=url.port)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cur = conn.cursor()
        cur.execute(f"SELECT 1 FROM pg_catalog.pg_database WHERE datname = '{self.db_name}'")
        if not cur.fetchone():
            logger.info(f"Creating database '{self.db_name}'...")
            cur.execute(f'CREATE DATABASE "{self.db_name}"')
        cur.close()
        conn.close()

    def apply_sql_schema(self):
        logger.info("Applying direct SQL schema...")
        with self.engine.connect() as conn:
            trans = conn.begin()
            try:
                drop_sql = "DROP TABLE IF EXISTS reviews, shipments, order_items, orders, products, categories, customer_profiles, stores, users CASCADE;"
                conn.execute(text(drop_sql))
                conn.execute(text(self.sql_schema))
                trans.commit()
            except Exception as e:
                trans.rollback()
                raise e

    def load_raw_data(self):
        files = {'ds1': 'E-Commerce Sales Forecast (UCI Online Retail).csv', 'ds2': 'E-Commerce Customer Behavior.csv', 'ds3': 'E-Commerce Shipping Data.csv', 'ds4': 'E-Commerce Sales (Amazon).csv', 'ds5': 'Pakistan E-commerce Orders.csv', 'ds6': 'amazon us customer reviews.csv'}
        for key, filename in files.items():
            path = os.path.join(self.raw_data_dir, filename)
            for enc in ['utf-8', 'ISO-8859-1', 'cp1252']:
                try:
                    self.datasets[key] = pd.read_csv(path, low_memory=False, encoding=enc)
                    logger.info(f"Loaded {key} with {enc}")
                    break
                except UnicodeDecodeError: continue

    def _clean_id(self, x):
        if pd.isna(x): return x
        return str(x).split('.')[0].strip()

    def _normalize_currency(self, amount, source):
        rates = {'ds1': 1.25, 'ds5': 0.0036} # GBP to USD, PKR to USD
        return amount * rates.get(source, 1.0)

    def transform_and_load(self):
        logger.info("Starting master entity pool transformation...")
        
        # 1. Master Categories Pool
        cat_names = set()
        for ds, col in {'ds4': 'Category', 'ds5': 'category_name_1', 'ds6': 'product_category'}.items():
            if ds in self.datasets: cat_names.update(self.datasets[ds][col].dropna().unique())
        categories_df = pd.DataFrame({'name': list(cat_names)})
        categories_df.to_sql('categories', self.engine, if_exists='append', index=False)
        cat_map = dict(zip(categories_df['name'], range(1, len(categories_df)+1)))

        # 2. Master Users Pool
        u1_ids = self.datasets['ds1']['CustomerID'].apply(self._clean_id).dropna().unique()
        u2_data = self.datasets['ds2'][['Customer ID', 'Gender', 'Age', 'City', 'Membership Type']].copy()
        u2_data['Customer ID'] = u2_data['Customer ID'].apply(self._clean_id)
        u5_ids = self.datasets['ds5']['Customer ID'].apply(self._clean_id).dropna().unique()
        u6_ids = self.datasets['ds6']['customer_id'].apply(self._clean_id).dropna().unique()
        
        all_ext_ids = sorted(list(set(u1_ids) | set(u2_data['Customer ID']) | set(u5_ids) | set(u6_ids)))
        users_master = pd.DataFrame({'ext_id': all_ext_ids})
        
        # Enrich with DS2 demographics
        users_master = pd.merge(users_master, u2_data.rename(columns={'Customer ID': 'ext_id', 'Membership Type': 'membership_type', 'Gender': 'gender_ds2', 'Age': 'age', 'City': 'city'}), on='ext_id', how='left')
        
        # Enrich with DS3 Gender
        if 'ds3' in self.datasets:
            ds3_gender = self.datasets['ds3'][['Gender']].copy()
            n_ship = len(ds3_gender)
            users_master.loc[:n_ship-1, 'gender_ds3'] = ds3_gender['Gender'].values
        
        users_master['role_type'] = 'individual'
        if 'membership_type' in users_master.columns:
            users_master.loc[users_master['membership_type'].isin(['Gold', 'Premium', 'Platinum']), 'role_type'] = 'corporate'
        users_master.loc[0, 'role_type'] = 'admin'
        
        users_master['email'] = users_master['ext_id'].apply(lambda x: f"user_{x}@example.com")
        users_master['password_hash'] = 'argon2_hashed_pw'
        users_master['gender'] = users_master['gender_ds2'].fillna(users_master.get('gender_ds3', 'Unknown')).str.slice(0, 10)
        
        users_final = users_master[['email', 'password_hash', 'role_type', 'gender']].drop_duplicates(subset=['email'])
        users_final.to_sql('users', self.engine, if_exists='append', index=False)
        user_id_map = dict(zip(users_master['ext_id'], range(1, len(users_final)+1)))

        # Customer Profiles
        profiles_df = users_master.dropna(subset=['age', 'city', 'membership_type']).copy()
        profiles_df['user_id'] = profiles_df['ext_id'].map(user_id_map)
        profiles_df = profiles_df[['user_id', 'age', 'city', 'membership_type']].dropna(subset=['user_id'])
        profiles_df['age'] = profiles_df['age'].astype(int)
        profiles_df.to_sql('customer_profiles', self.engine, if_exists='append', index=False)

        # 3. Stores
        corp_users_ids = users_final[users_final['role_type'] == 'corporate'].index + 1
        stores_df = pd.DataFrame({'owner_id': list(corp_users_ids), 'name': [f"Store_{i+1}" for i in range(len(corp_users_ids))], 'status': 'active'})
        stores_df.to_sql('stores', self.engine, if_exists='append', index=False)
        store_ids_pool = list(range(1, len(stores_df)+1))

        # 4. Master Products Pool
        p1 = self.datasets['ds1'][['StockCode', 'Description', 'UnitPrice']].rename(columns={'StockCode': 'sku', 'Description': 'name', 'UnitPrice': 'price'})
        p1['price'] = p1['price'].apply(lambda x: self._normalize_currency(x, 'ds1'))
        
        p4 = self.datasets['ds4'][['SKU', 'Category']].rename(columns={'SKU': 'sku', 'Category': 'cat_name'})
        
        p5 = self.datasets['ds5'][['sku', 'price', 'category_name_1']].rename(columns={'category_name_1': 'cat_name'})
        p5['price'] = p5['price'].apply(lambda x: self._normalize_currency(x, 'ds5'))

        # Add products from DS6 to ensure reviews can link
        p6 = self.datasets['ds6'][['product_id', 'product_title', 'product_category']].rename(columns={'product_id': 'sku', 'product_title': 'name', 'product_category': 'cat_name'})
        
        p1['sku'] = p1['sku'].apply(self._clean_id)
        p4['sku'] = p4['sku'].apply(self._clean_id)
        p5['sku'] = p5['sku'].apply(self._clean_id)
        p6['sku'] = p6['sku'].apply(self._clean_id)
        
        products_master = pd.concat([p1, p4, p5, p6]).drop_duplicates(subset=['sku'])
        products_master['store_id'] = np.random.choice(store_ids_pool, len(products_master))
        products_master['category_id'] = products_master['cat_name'].map(cat_map).fillna(1).astype(int)
        
        # Note: Ensure price is numeric and handle missing names
        products_final = products_master[['store_id', 'category_id', 'sku', 'name', 'price']].rename(columns={'price': 'unit_price'}).copy()
        products_final['name'] = products_final['name'].fillna('Product from Source')
        products_final['unit_price'] = pd.to_numeric(products_final['unit_price'], errors='coerce').fillna(0.0)
        
        products_final.to_sql('products', self.engine, if_exists='append', index=False)
        product_id_map = dict(zip(products_final['sku'], range(1, len(products_final)+1)))

        # 5. Orders & Items
        o_ds1 = self.datasets['ds1'][['InvoiceNo', 'CustomerID']].drop_duplicates()
        o_ds1['CustomerID'] = o_ds1['CustomerID'].apply(self._clean_id)
        o_ds1['user_id'] = o_ds1['CustomerID'].map(user_id_map)
        orders_ds1 = pd.DataFrame({'user_id': o_ds1['user_id'], 'store_id': np.random.choice(store_ids_pool, len(o_ds1)), 'status': 'Completed', 'grand_total': 0.0, 'source_ref': o_ds1['InvoiceNo']})
        
        o_ds5 = self.datasets['ds5'][['increment_id', 'Customer ID', 'status', 'grand_total']].drop_duplicates(subset=['increment_id'])
        o_ds5['Customer ID'] = o_ds5['Customer ID'].apply(self._clean_id)
        o_ds5['user_id'] = o_ds5['Customer ID'].map(user_id_map)
        orders_ds5 = pd.DataFrame({
            'user_id': o_ds5['user_id'], 
            'store_id': np.random.choice(store_ids_pool, len(o_ds5)),
            'status': o_ds5['status'].fillna('Processing'),
            'grand_total': o_ds5['grand_total'].apply(lambda x: self._normalize_currency(x, 'ds5')),
            'source_ref': o_ds5['increment_id']
        })
        
        orders_combined = pd.concat([orders_ds1, orders_ds5]).dropna(subset=['user_id'])
        orders_combined.drop(columns=['source_ref']).to_sql('orders', self.engine, if_exists='append', index=False)
        
        order_ds1_map = dict(zip(o_ds1['InvoiceNo'], range(1, len(orders_ds1)+1)))
        order_ds5_map = dict(zip(o_ds5['increment_id'], range(len(orders_ds1)+1, len(orders_combined)+1)))

        i1 = self.datasets['ds1'][['InvoiceNo', 'StockCode', 'Quantity', 'UnitPrice']].copy()
        i1['StockCode'] = i1['StockCode'].apply(self._clean_id)
        i1['order_id'] = i1['InvoiceNo'].map(order_ds1_map)
        i1['product_id'] = i1['StockCode'].map(product_id_map)
        i1['price'] = i1['UnitPrice'].apply(lambda x: self._normalize_currency(x, 'ds1'))
        items1 = i1[['order_id', 'product_id', 'Quantity', 'price']].rename(columns={'Quantity': 'quantity'})

        i5 = self.datasets['ds5'][['increment_id', 'sku', 'qty_ordered', 'price']].copy()
        i5['sku'] = i5['sku'].apply(self._clean_id)
        i5['order_id'] = i5['increment_id'].map(order_ds5_map)
        i5['product_id'] = i5['sku'].map(product_id_map)
        i5['price'] = i5['price'].apply(lambda x: self._normalize_currency(x, 'ds5'))
        items5 = i5[['order_id', 'product_id', 'qty_ordered', 'price']].rename(columns={'qty_ordered': 'quantity'})

        pd.concat([items1, items5]).dropna().to_sql('order_items', self.engine, if_exists='append', index=False)

        # 6. Shipments
        ship_ds3 = self.datasets['ds3'].head(len(orders_combined))
        shipments_final = pd.DataFrame({
            'order_id': list(range(1, len(ship_ds3)+1)),
            'warehouse': ship_ds3['Warehouse_block'],
            'mode': ship_ds3['Mode_of_Shipment'],
            'status': 'Delivered'
        })
        shipments_final.to_sql('shipments', self.engine, if_exists='append', index=False)

        # 7. Reviews
        rev_ds6 = self.datasets['ds6'].head(5000).copy()
        rev_ds6['customer_id'] = rev_ds6['customer_id'].apply(self._clean_id)
        rev_ds6['product_id_orig'] = rev_ds6['product_id'].apply(self._clean_id)
        reviews_final = pd.DataFrame({
            'user_id': rev_ds6['customer_id'].map(user_id_map),
            'product_id': rev_ds6['product_id_orig'].map(product_id_map),
            'star_rating': rev_ds6['star_rating'],
            'sentiment': rev_ds6['review_headline'].str.slice(0, 50)
        }).dropna()
        reviews_final.to_sql('reviews', self.engine, if_exists='append', index=False)

        logger.info(f"ETL Complete. Tables populated: Users({len(users_final)}), Products({len(products_final)}), Orders({len(orders_combined)}), Shipments({len(shipments_final)}), Reviews({len(reviews_final)})")

if __name__ == "__main__":
    USER_SQL = """
    CREATE TABLE users (id SERIAL PRIMARY KEY, email VARCHAR(255) UNIQUE NOT NULL, password_hash VARCHAR(255) NOT NULL, role_type VARCHAR(50) NOT NULL, gender VARCHAR(10));
    CREATE TABLE stores (id SERIAL PRIMARY KEY, owner_id INT, name VARCHAR(100), status VARCHAR(20), FOREIGN KEY (owner_id) REFERENCES users(id));
    CREATE TABLE customer_profiles (id SERIAL PRIMARY KEY, user_id INT UNIQUE, age INT, city VARCHAR(100), membership_type VARCHAR(50), FOREIGN KEY (user_id) REFERENCES users(id));
    CREATE TABLE categories (id SERIAL PRIMARY KEY, name VARCHAR(100), parent_id INT, FOREIGN KEY (parent_id) REFERENCES categories(id));
    CREATE TABLE products (id SERIAL PRIMARY KEY, store_id INT, category_id INT, sku VARCHAR(100), name VARCHAR(255), unit_price DECIMAL(10,2), FOREIGN KEY (store_id) REFERENCES stores(id), FOREIGN KEY (category_id) REFERENCES categories(id));
    CREATE TABLE orders (id SERIAL PRIMARY KEY, user_id INT, store_id INT, status VARCHAR(50), grand_total DECIMAL(10,2), FOREIGN KEY (user_id) REFERENCES users(id), FOREIGN KEY (store_id) REFERENCES stores(id));
    CREATE TABLE order_items (id SERIAL PRIMARY KEY, order_id INT, product_id INT, quantity INT, price DECIMAL(10,2), FOREIGN KEY (order_id) REFERENCES orders(id), FOREIGN KEY (product_id) REFERENCES products(id));
    CREATE TABLE shipments (id SERIAL PRIMARY KEY, order_id INT, warehouse VARCHAR(50), mode VARCHAR(50), status VARCHAR(50), FOREIGN KEY (order_id) REFERENCES orders(id));
    CREATE TABLE reviews (id SERIAL PRIMARY KEY, user_id INT, product_id INT, star_rating INT, sentiment VARCHAR(50), FOREIGN KEY (user_id) REFERENCES users(id), FOREIGN KEY (product_id) REFERENCES products(id));
    """
    DB_URL = "postgresql://postgres:604730@localhost:5432/e_commerce"
    pipeline = ETLPipeline(DB_URL, "data-integration/raw-datasets", USER_SQL)
    pipeline.ensure_database_exists()
    pipeline.apply_sql_schema()
    pipeline.load_raw_data()
    pipeline.transform_and_load()
