import pandas as pd
import numpy as np
import os

# Diagnostic script to check mapping success
raw_data_dir = r"c:\Users\baris\Documents\GitHub\AdvanceProject\data-integration\raw-datasets"
ds1 = pd.read_csv(os.path.join(raw_data_dir, "E-Commerce Sales Forecast (UCI Online Retail).csv"), encoding='ISO-8859-1')
ds2 = pd.read_csv(os.path.join(raw_data_dir, "E-Commerce Customer Behavior.csv"))
ds6 = pd.read_csv(os.path.join(raw_data_dir, "amazon us customer reviews.csv"))

def clean_id(x):
    if pd.isna(x): return x
    s = str(x).split('.')[0].strip()
    return s

# USERS match check
u1 = ds1['CustomerID'].apply(clean_id).dropna().unique()
u2 = ds2['Customer ID'].apply(clean_id).dropna().unique()
u6 = ds6['customer_id'].apply(clean_id).dropna().unique()

print(f"DS1 Unique Customers: {len(u1)}")
print(f"DS2 Unique Customers: {len(u2)}")
print(f"DS6 Unique Customers: {len(u6)}")

inter_1_2 = set(u1).intersection(set(u2))
inter_1_6 = set(u1).intersection(set(u6))
inter_2_6 = set(u2).intersection(set(u6))

print(f"Intersection DS1-DS2: {len(inter_1_2)}")
print(f"Intersection DS1-DS6: {len(inter_1_6)}")
print(f"Intersection DS2-DS6: {len(inter_2_6)}")

# Check REVIEWS matching
print("\n--- Review Match Check ---")
product_ids_ds1 = set(ds1['StockCode'].apply(clean_id).dropna())
review_product_ids = set(ds6['product_id'].apply(clean_id).dropna())
prod_intersection = product_ids_ds1.intersection(review_product_ids)
print(f"Products in DS1: {len(product_ids_ds1)}")
print(f"Products in DS6: {len(review_product_ids)}")
print(f"Common Products: {len(prod_intersection)}")
