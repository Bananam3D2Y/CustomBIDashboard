// Globals
let SQLPromise = null;
let dbPromise = null;
let performanceChart = null;

// v CHECK FOR SQL & DB LOAD THEM IF SO
function getSqlJsInstance() {
  // Helper which loads sql object from cloudflare
  if (!SQLPromise) {
    SQLPromise = initSqlJs({
      locateFile: function (file) {
        return `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`;
      }
    });
  }
  return SQLPromise;
}

async function getDatabase() {
  // Helper which loads the db, depends on SQL object
  if (!dbPromise) {
    dbPromise = (async function () {
      const SQL = await getSqlJsInstance();
      // Database path is currently hard coded, which is fine
      const response = await fetch("data/data.db");

      if (!response.ok) {
        throw new Error(`Could not load database: ${response.status} ${response.statusText}`);
      }

      const buffer = await response.arrayBuffer();
      return new SQL.Database(new Uint8Array(buffer));
    })();
  }
  return dbPromise;
}
// ^ CHECK FOR SQL & DB LOAD THEM IF SO

// v HELPER FUNCTIONS FOR ALTERING TEXT CONTENT
function escapeSqlString(value) {
  return String(value).replace(/'/g, "''");
}

function showMessage(message) {
  const el = document.getElementById("dashboard_message");
  if (el) {
    el.textContent = message;
  }
}

function showQuery(query) {
  const el = document.getElementById("query_preview");
  if (el) {
    el.textContent = "Code Executed:\n" + query.trim();
  }
}
// ^ HELPER FUNCTIONS FOR ALTERING TEXT CONTENT

// v TABLE FUNCTIONS
function clearTable() {
  const table = document.getElementById("dashboard");
  if (table) {
    table.innerHTML = "";
  }
}

function renderTable(result) {
  const table = document.getElementById("dashboard");
  if (!table) {
    return;
  }

  table.innerHTML = "";

  if (!result || result.length === 0 || !result[0].values.length) {
    return;
  }

  const columns = result[0].columns;
  const values = result[0].values;

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  for (let i = 0; i < columns.length; i++) {
    const th = document.createElement("th");
    th.textContent = columns[i];
    headerRow.appendChild(th);
  }

  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  for (let i = 0; i < values.length; i++) {
    const tr = document.createElement("tr");

    for (let j = 0; j < values[i].length; j++) {
      const td = document.createElement("td");
      td.textContent = values[i][j] ?? "";
      tr.appendChild(td);
    }

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
}
// ^ TABLE FUNCTIONS

// v CHART FUNCTIONS
function destroyChart() {
  if (performanceChart) {
    performanceChart.destroy();
    performanceChart = null;
  }
}

function renderChart(rows, labelText, yAxisLabel) {
  // Logic for placeholder img
  const placeholder = document.getElementById("chart_placeholder");
  if (placeholder) {
    placeholder.style.display = "none";
  }

  const canvas = document.getElementById("performance_chart");
  if (!canvas) {
    return;
  }

  destroyChart();

  const labels = [];
  const values = [];

  for (let i = 0; i < rows.length; i++) {
    labels.push(String(rows[i][0]));
    values.push(Number(rows[i][1] ?? 0));
  }

  const ctx = canvas.getContext("2d");

  performanceChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: labelText,
          data: values,
          tension: 0.2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 500,
        easing: "easeOutQuart"
      },
      animations: {
        y: {
          from: 30,
          duration: 500,
          easing: "easeOutQuart"
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: "CalendarID"
          }
        },
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: yAxisLabel
          }
        }
      }
    }
  });
}
// ^ CHART FUNCTIONS

// v POPULATE OPTIONS FOR THE USER'S DROPDOWN MENU AUTOMATICALLY 
function fillSelect(selectId, rows, allLabel, valueIndex, textIndex) {
  const select = document.getElementById(selectId);
  if (!select) {
    return;
  }

  select.innerHTML = "";

  const allOption = document.createElement("option");
  allOption.value = "";
  allOption.textContent = allLabel;
  select.appendChild(allOption);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const option = document.createElement("option");
    option.value = row[valueIndex];
    option.textContent = row[textIndex] != null ? row[textIndex] : row[valueIndex];
    select.appendChild(option);
  }
}

async function populateFilters() {
  try {
    const db = await getDatabase();

    const storeResult = db.exec(`
      SELECT StoreID, StoreName
      FROM Stores
      WHERE StoreID > 0
      ORDER BY StoreID
    `);

    const accountResult = db.exec(`
      SELECT AccountID, AccountName
      FROM Accounts
      ORDER BY AccountID
    `);

    const storeRows = storeResult.length ? storeResult[0].values : [];
    const accountRows = accountResult.length ? accountResult[0].values : [];

    fillSelect("store_select", storeRows, "All Stores", 0, 1);
    fillSelect("account_select", accountRows, "All Accounts", 0, 1);
  } catch (error) {
    showMessage(`Failed to load filters: ${error.message}`);
  }
}


// ^ POPULATE OPTIONS FOR THE USER'S DROPDOWN MENU AUTOMATICALLY 

// v CONSTRUCT SQL QUERIES 
function buildMainDataQuery(storeId, accountId) {
  const whereParts = [];

  if (storeId !== "") {
    whereParts.push(`StoreID = ${Number(storeId)}`);
  }

  if (accountId !== "") {
    whereParts.push(`AccountID = ${Number(accountId)}`);
  }

  let whereClause = "";
  if (whereParts.length > 0) {
    whereClause = `WHERE ${whereParts.join(" AND ")}`;
  }

  return `
    SELECT
      CalendarID,
      ROUND(SUM(Amount), 2) AS TotalAmount 
    FROM FullMainData
    ${whereClause}
    GROUP BY CalendarID
    ORDER BY CalendarID
  `;
}
// ^ CONSTRUCT SQL QUERIES 

// Helper which constructs and returns an array containing the parts of the query
function buildChartLabel(storeId, accountId) {
  const parts = [];
  parts.push("MainData Amount");

  // Fetch all accounts, eg "All Accounts, Product Sales, Food, ..." 
  if (storeId) {
    parts.push(`Store ${storeId}`);
  } else {
    parts.push("All Stores");
  }
  // Fetch all accounts, eg "All Accounts, Product Sales, Food, ..." 
  if (accountId) {
    parts.push(`Account ${accountId}`);
  } else {
    parts.push("All Accounts");
  }


  return parts.join(" · ");
}

// Actually runs the SQL query
async function runDashboardQuery(event) {
  event.preventDefault();

  clearTable();
  showMessage("");

  const storeSelectEl = document.getElementById("store_select");
  const accountSelectEl = document.getElementById("account_select");

  if (!storeSelectEl || !accountSelectEl) {
    showMessage("Dashboard form elements are missing.");
    return;
  }

  const storeId = storeSelectEl.value;
  const accountId = accountSelectEl.value;

  let query = "";
  query = buildMainDataQuery(storeId, accountId);
  showQuery(query);

  try {
    const db = await getDatabase();
    const result = db.exec(query);

    if (!result.length || !result[0].values.length) {
      destroyChart();
      showMessage("No rows returned for that selection.");
      return;
    }

    renderTable(result);
    renderChart(
      result[0].values,
      buildChartLabel(storeId, accountId),
      "Amount $"
    );
  } catch (error) {
    destroyChart();
    showMessage(`Error: ${error.message}`);
  }
}

function attachEventListeners() {
  const dashboardForm = document.getElementById("dashboard_form");
  if (dashboardForm) {
    dashboardForm.addEventListener("submit", runDashboardQuery);
  }
}

// ATTATCH ALL LISTENERS AS NEEDED TO THE SITE
attachEventListeners();
populateFilters();