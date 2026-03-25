import pandas as pd
import sqlite3
import os
import glob

# TO USE: SIMPLY PLACE TXT FILES IN THE "TXT Files" FOLDER AND RUN THE SCRIPT. A dATABASE FILE BY THE NAME OF "combined_data.db" WILL BE CREATED IN THE TXT FILES FOLDER

# Hardcoded folder
folder_path = os.path.join(os.path.dirname(__file__), "TXT Files")

# Validate folder
if not os.path.isdir(folder_path):
    print(f'Folder "{folder_path}" not found.')
    exit()

# Get all TXT files
txt_files = glob.glob(os.path.join(folder_path, "*.txt"))

# Exit if no txt files found
if not txt_files:
    print("No TXT files found.")
    exit()

# Create database in same folder
db_filename = os.path.join(folder_path, "combined_data.db")
conn = sqlite3.connect(db_filename)

loaded_tables = []
failed_files = []

for file in txt_files:
    try:
        print(f'Processing: {os.path.basename(file)}')

        # Step 1: Read as strings
        df = pd.read_csv(
            file,
            sep=r"\|\|",
            engine="python",
            encoding="cp1252",
            dtype=str
        )

        # Step 2: Clean quotes and whitespace
        df = df.apply(lambda col: col.str.strip().str.strip('"'))
        df.columns = df.columns.str.strip().str.strip('"')

        # Step 3: Infer types
        df = df.apply(pd.to_numeric, errors="ignore")

        # Table name = filename (cleaned)
        table_name = os.path.splitext(os.path.basename(file))[0]
        table_name = table_name.replace(" ", "_").replace("-", "_")

        # Map dtypes → SQLite
        dtypes = {}
        for col, dtype in df.dtypes.items():
            if pd.api.types.is_integer_dtype(dtype):
                dtypes[col] = "INTEGER"
            elif pd.api.types.is_float_dtype(dtype):
                dtypes[col] = "REAL"
            else:
                dtypes[col] = "TEXT"

        # Write to DB
        df.to_sql(
            table_name,
            conn,
            if_exists="replace",
            index=False,
            dtype=dtypes
        )

        loaded_tables.append((table_name, len(df)))
        print(f'  Loaded → {table_name} ({len(df)} rows)')

    except Exception as e:
        failed_files.append((os.path.basename(file), str(e)))
        print(f'  Failed → {os.path.basename(file)}: {e}')

conn.close()

# Summary
print(f'\nDatabase created: "{db_filename}"')

print("\nTables loaded:")
for name, rows in loaded_tables:
    print(f'  {name}: {rows} rows')

if failed_files:
    print("\nErrors:")
    for name, err in failed_files:
        print(f'  {name}: {err}')