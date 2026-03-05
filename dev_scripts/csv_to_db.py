import pandas as pd
import sqlite3
import os

# Prompt user
filename = input('Please enter the CSV\'s full path including filename: ').strip()
# Handle missing .csv
l = len(filename)
if filename[l-4:l] != '.csv':
    filename = filename + '.csv'
# Handle non-existant file
if not os.path.exists(filename):
    print('A File with that name was not found.')
    exit()
# File must exist, load into dataframe
# TODO For now we will interperet each row as string
df = pd.read_csv(filename, dtype=str)

# Create vars for execution
db_filename = os.path.splitext(filename[0:l-4])[0] + '.db'
conn = sqlite3.connect(db_filename)
dtypes = {}
for e in df.columns:
    dtypes[e] = 'VARCHAR'

# Execute
df.to_sql(
    'Sample_Table',
    conn,
    if_exists='replace',
    index=False,
    dtype=dtypes
)

conn.close()
print(f'Database created successfully "{db_filename}"')