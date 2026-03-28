// Overall script file
let SQLPromise = null;
let dbPromise = null;

// Helper function which is used to check if SQL.js is functional
function getSqlJs() {
  if (!SQLPromise) {
    SQLPromise = initSqlJs({
      locateFile: file =>
        `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
    });
  }
  return SQLPromise;
}

// Helper function which is used to check if our db file is present and load it if so
async function getDatabase() {
  if (!dbPromise) {
    dbPromise = (async () => {
      const SQL = await getSqlJs();
      // NOTE: Name of central db file is hard coded:
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

// Erase the etch-e-sketch
function clearDashboard() {
  document.getElementById("dashboard").innerHTML = "";
  document.getElementById("dashboard_message").textContent = "";
}

// Alter text content on the site for users to read
function showMessage(message) {
  document.getElementById("dashboard_message").textContent = message;
}
function showQuery(query) {
  document.getElementById("query_preview").textContent = "Query executed: " + query;
}

// Draw the content of our SQL query using html table elements
function renderTable(result) {
  const table = document.getElementById("dashboard");
  table.innerHTML = "";

  const columns = result[0].columns;
  const values = result[0].values;

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  for (const col of columns) {
    const th = document.createElement("th");
    th.textContent = col;
    headerRow.appendChild(th);
  }

  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  for (const row of values) {
    const tr = document.createElement("tr");

    for (const cell of row) {
      const td = document.createElement("td");
      td.textContent = cell;
      tr.appendChild(td);
    }

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);
}

// Single method for handling queries using the functions defined above
async function runQuery(query) {
  clearDashboard();
  showQuery(query);

  try {
    const db = await getDatabase();
    const result = db.exec(query);

    if (result.length === 0) {
      showMessage("Query ran successfully, but returned no rows.");
      return;
    }

    renderTable(result);
  } catch (error) {
    showMessage(`Error: ${error.message}`);
  }
}

// Create a listener for our central dashboard form
document.getElementById("dashboard_form").addEventListener("submit", async function (event) {
  event.preventDefault();

  const select = document.getElementById("dashboard_select").value;
  const from = document.getElementById("dashboard_from").value;
  const where = document.getElementById("dashboard_where").value;
  const limit = document.getElementById("dashboard_limit").value;

  let query;

  if (where === "none") {
    query = `SELECT ${select} FROM ${from} LIMIT ${limit}`;
  } else {
    query = `SELECT ${select} FROM ${from} WHERE ${where} LIMIT ${limit}`;
  }

  await runQuery(query);
});