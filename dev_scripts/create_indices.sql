CREATE INDEX IF NOT EXISTS idx_FullMainData_store_account_calendar
ON FullMainData(StoreID, AccountID, CalendarID);

CREATE INDEX IF NOT EXISTS idx_FullMainData_store_calendar
ON FullMainData(StoreID, CalendarID);

CREATE INDEX IF NOT EXISTS idx_FullMainData_account_calendar
ON FullMainData(AccountID, CalendarID);

CREATE INDEX IF NOT EXISTS idx_FullMainData_year_store_account_calendar
ON FullMainData(FiscalYearID, StoreID, AccountID, CalendarID);