const points = [
  { name: "BM", description: "Bench Mark", zone: "A", altName: "BENCH", notes: "Control point" },
  { name: "TP", description: "Traverse Point", zone: "A", altName: "TRAV", notes: "" },
  { name: "CL", description: "Centerline", zone: "B", altName: "CTR", notes: "Often roadway" },
  { name: "EP", description: "Edge of Pavement", zone: "B", altName: "EOP", notes: "" },
  { name: "MH", description: "Manhole", zone: "C", altName: "MANH", notes: "Check lid type" },
  { name: "FH", description: "Fire Hydrant", zone: "C", altName: "HYD", notes: "" },
  { name: "PO", description: "Power Pole", zone: "D", altName: "PWR", notes: "Tag if numbered" },
  { name: "WM", description: "Water Meter", zone: "D", altName: "WTRM", notes: "" }
];

const columns = [
  { key: "name", label: "Name" },
  { key: "description", label: "Description" },
  { key: "zone", label: "Zone" },
  { key: "altName", label: "Alt-Name" },
  { key: "notes", label: "Notes" }
];

const searchInput = document.getElementById("searchInput");
const tableBody = document.getElementById("tableBody");
const settingsBtn = document.getElementById("settingsBtn");
const modalOverlay = document.getElementById("modalOverlay");
const settingsModal = document.getElementById("settingsModal");
const closeModalBtn = document.getElementById("closeModalBtn");
const enableAllBtn = document.getElementById("enableAllBtn");
const disableAllBtn = document.getElementById("disableAllBtn");

const searchEnabled = Object.fromEntries(columns.map(c => [c.key, true]));

let sortKey = "name";
let sortDir = "asc";

function normalize(s) {
  return (s ?? "").toString().trim().toLowerCase();
}

function compareAlpha(a, b) {
  return a.localeCompare(b, undefined, { sensitivity: "base", numeric: true });
}

function getEnabledKeys() {
  return columns.map(c => c.key).filter(k => searchEnabled[k]);
}

function matchesQuery(row, q, enabledKeys) {
  if (!q) return true;
  for (const k of enabledKeys) {
    if (normalize(row[k]).includes(q)) return true;
  }
  return false;
}

function filteredAndSorted() {
  const q = normalize(searchInput.value);
  const enabledKeys = getEnabledKeys();

  const rows = points.filter(r => matchesQuery(r, q, enabledKeys));

  rows.sort((ra, rb) => {
    const av = (ra[sortKey] ?? "").toString();
    const bv = (rb[sortKey] ?? "").toString();
    const c = compareAlpha(av, bv);
    return sortDir === "asc" ? c : -c;
  });

  return rows;
}

function renderTable() {
  const rows = filteredAndSorted();
  tableBody.innerHTML = "";

  for (const r of rows) {
    const tr = document.createElement("tr");

    for (const c of columns) {
      const td = document.createElement("td");
      td.textContent = (r[c.key] ?? "").toString();
      tr.appendChild(td);
    }

    tableBody.appendChild(tr);
  }
}

function setHeaderArrows() {
  const ths = document.querySelectorAll("thead th");
  for (const th of ths) {
    const key = th.getAttribute("data-key");
    const arrow = th.querySelector(".th-arrow");
    if (!arrow) continue;

    if (key === sortKey) {
      arrow.textContent = sortDir === "asc" ? "↑" : "↓";
    } else {
      arrow.textContent = "↕";
    }
  }
}

function setSort(key) {
  if (sortKey === key) {
    sortDir = sortDir === "asc" ? "desc" : "asc";
  } else {
    sortKey = key;
    sortDir = "asc";
  }
  setHeaderArrows();
  renderTable();
}

function openModal() {
  modalOverlay.hidden = false;
  settingsModal.hidden = false;
  const first = settingsModal.querySelector('input[type="checkbox"]');
  if (first) first.focus();
}

function closeModal() {
  modalOverlay.hidden = true;
  settingsModal.hidden = true;
  settingsBtn.focus();
}

function syncCheckboxesFromState() {
  for (const c of columns) {
    const chk = document.querySelector(`input[type="checkbox"][data-key="${c.key}"]`);
    if (chk) chk.checked = !!searchEnabled[c.key];
  }
}

function setAllCheckboxes(v) {
  for (const c of columns) searchEnabled[c.key] = v;
  syncCheckboxesFromState();
  renderTable();
}

searchInput.addEventListener("input", renderTable);

settingsBtn.addEventListener("click", () => {
  syncCheckboxesFromState();
  openModal();
});

closeModalBtn.addEventListener("click", closeModal);
modalOverlay.addEventListener("click", closeModal);

document.addEventListener("keydown", (e) => {
  if (!settingsModal.hidden && e.key === "Escape") closeModal();
});

for (const c of columns) {
  const chk = document.querySelector(`input[type="checkbox"][data-key="${c.key}"]`);
  if (chk) {
    chk.addEventListener("change", () => {
      searchEnabled[c.key] = chk.checked;
      renderTable();
    });
  }
}

enableAllBtn.addEventListener("click", () => setAllCheckboxes(true));
disableAllBtn.addEventListener("click", () => setAllCheckboxes(false));

const thButtons = document.querySelectorAll("thead th .th-btn");
for (const btn of thButtons) {
  btn.addEventListener("click", () => {
    const th = btn.closest("th");
    const key = th?.getAttribute("data-key");
    if (key) setSort(key);
  });
}

setHeaderArrows();
renderTable();
