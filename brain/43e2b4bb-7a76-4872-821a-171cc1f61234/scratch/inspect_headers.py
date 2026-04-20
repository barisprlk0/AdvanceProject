import os
import pandas as pd

dataset_dir = r"c:\Users\baris\Documents\GitHub\AdvanceProject\data-integration\dataset"
files = [f for f in os.listdir(dataset_dir) if f.endswith('.csv')]

for f in files:
    try:
        df = pd.read_csv(os.path.join(dataset_dir, f), nrows=0)
        print(f"--- {f} ---")
        print(", ".join(df.columns))
    except Exception as e:
        print(f"Error reading {f}: {e}")
