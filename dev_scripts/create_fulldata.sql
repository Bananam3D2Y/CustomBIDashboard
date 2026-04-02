DROP TABLE IF EXISTS FullMainData;

CREATE TABLE FullMainData AS
WITH
cte_MainData AS (
    SELECT
        m.FranID,
        m.StoreID,
        m.FiscalYearID,
        m.CalendarID,
        m.AccountID,
        m.Amount
    FROM MainData m
),
cte_POSSales AS (
    SELECT DISTINCT
        f.FranID,
        f.StoreID,
        f.FiscalYearID,
        f.CalendarID,
        -10 AS AccountID,
        g.Sales AS Amount
    FROM cte_MainData f
    JOIN POSSales g
      ON f.StoreID = g.StoreID
     AND f.FiscalYearID = g.FiscalYearId
     AND f.CalendarID = g.CalendarID
),
cte_Calculated AS (
    SELECT
        m.FranID,
        m.StoreID,
        m.FiscalYearID,
        m.CalendarID,
        x.DestAccountID AS AccountID,
        SUM(m.Amount * x.Multiplier) AS Amount
    FROM cte_MainData m
    JOIN AccountCalc x
      ON m.AccountID = x.SourceAccountID
    GROUP BY
        m.FranID,
        m.StoreID,
        m.FiscalYearID,
        m.CalendarID,
        x.DestAccountID
),
cte_Missing AS (
    SELECT
        m.FranID,
        m.StoreID,
        m.FiscalYearID,
        m.CalendarID,
        a.AccountID,
        0.00 AS Amount
    FROM (
        SELECT DISTINCT
            FranID, StoreID, FiscalYearID, CalendarID
        FROM cte_MainData
    ) m
    JOIN (
        SELECT AccountID FROM Accounts
        UNION
        SELECT -10 AS AccountID
    ) a
      ON 1 = 1
    WHERE NOT EXISTS (
        SELECT 1
        FROM (
            SELECT FranID, StoreID, FiscalYearID, CalendarID, AccountID FROM cte_MainData
            UNION
            SELECT FranID, StoreID, FiscalYearID, CalendarID, AccountID FROM cte_POSSales
            UNION
            SELECT FranID, StoreID, FiscalYearID, CalendarID, AccountID FROM cte_Calculated
        ) q
        WHERE q.FranID = m.FranID
          AND q.StoreID = m.StoreID
          AND q.FiscalYearID = m.FiscalYearID
          AND q.CalendarID = m.CalendarID
          AND q.AccountID = a.AccountID
    )
),
cte_AllData AS (
    SELECT FranID, StoreID, FiscalYearID, CalendarID, AccountID, Amount FROM cte_MainData
    UNION ALL
    SELECT FranID, StoreID, FiscalYearID, CalendarID, AccountID, Amount FROM cte_POSSales
    UNION ALL
    SELECT FranID, StoreID, FiscalYearID, CalendarID, AccountID, Amount FROM cte_Calculated
    UNION ALL
    SELECT FranID, StoreID, FiscalYearID, CalendarID, AccountID, Amount FROM cte_Missing
),
cte_Accounts AS (
    SELECT AccountID, AccountName FROM Accounts
    UNION ALL
    SELECT -10 AS AccountID, 'POS Sales' AS AccountName
),
cte_Ownership AS (
    SELECT DISTINCT
        OrgID,
        OrgName,
        FranID,
        FranchiseeName,
        StoreID,
        StoreName
    FROM Ownership
)
SELECT
    o.OrgID,
    o.OrgName,
    x.FranID,
    o.FranchiseeName,
    x.StoreID,
    COALESCE(s.StoreName, o.StoreName) AS StoreName,
    x.FiscalYearID,
    x.CalendarID,
    x.AccountID,
    a.AccountName,
    x.Amount
FROM cte_AllData x
JOIN cte_Accounts a
  ON x.AccountID = a.AccountID
LEFT JOIN cte_Ownership o
  ON x.FranID = o.FranID
 AND x.StoreID = o.StoreID
LEFT JOIN Stores s
  ON x.StoreID = s.StoreID;