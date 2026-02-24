document.addEventListener("DOMContentLoaded", () => {
  const columns = [
    { key: "featureCode", label: "Feature Code" },
    { key: "levelName", label: "Level Name" },
    { key: "levelDescription", label: "Level Description" },
    { key: "pointLine", label: "Point / Line" },
    { key: "zone", label: "Zone" }
  ];

  const searchInput = document.getElementById("searchInput");
  const tableBody = document.getElementById("tableBody");
  const settingsBtn = document.getElementById("settingsBtn");
  const modalOverlay = document.getElementById("modalOverlay");
  const settingsModal = document.getElementById("settingsModal");
  const closeModalBtn = document.getElementById("closeModalBtn");
  const enableAllBtn = document.getElementById("enableAllBtn");
  const disableAllBtn = document.getElementById("disableAllBtn");
  const showAllBtn = document.getElementById("showAllBtn");
  const hideAllBtn = document.getElementById("hideAllBtn");

  if (!searchInput || !tableBody || !settingsBtn || !modalOverlay || !settingsModal || !closeModalBtn || !enableAllBtn || !disableAllBtn || !showAllBtn || !hideAllBtn) {
    return;
  }

  const searchEnabled = Object.fromEntries(columns.map(c => [c.key, true]));
  const showEnabled = Object.fromEntries(columns.map(c => [c.key, true]));

  let sortKey = "featureCode";
  let sortDir = "asc";
  let points = [];

  function normalize(s) {
    return (s ?? "").toString().trim().toLowerCase();
  }

  function compareAlpha(a, b) {
    return a.localeCompare(b, undefined, { sensitivity: "base", numeric: true });
  }

  function parseCsvLine(line) {
    const out = [];
    let cur = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];

      if (ch === '"') {
        if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }

      if (ch === "," && !inQuotes) {
        out.push(cur);
        cur = "";
        continue;
      }

      cur += ch;
    }

    out.push(cur);
    return out.map(v => v.trim());
  }

  function parseCodesCsv(text) {
    const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").map(l => l.trim()).filter(l => l.length > 0);

    const rows = [];
    for (const line of lines) {
      const parts = parseCsvLine(line);
      if (parts.length < 5) continue;

      const first = normalize(parts[0]);
      const second = normalize(parts[1]);

      if (first.includes("fdot") && (line.includes(",,,") || parts.length >= 5)) continue;
      if (first === "feature code" || first === '"feature code"' || first.replace(/"/g, "") === "feature code") continue;
      if (first === "" && second === "") continue;

      rows.push({
        featureCode: (parts[0] ?? "").trim(),
        levelName: (parts[1] ?? "").trim(),
        levelDescription: (parts[2] ?? "").trim(),
        pointLine: (parts[3] ?? "").trim(),
        zone: (parts[4] ?? "").trim()
      });
    }
    return rows;
  }

  function getSearchKeys() {
    return columns.map(c => c.key).filter(k => searchEnabled[k]);
  }

  function getVisibleColumns() {
    return columns.filter(c => showEnabled[c.key]);
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
    const enabledKeys = getSearchKeys();
    const rows = points.filter(r => matchesQuery(r, q, enabledKeys));

    rows.sort((ra, rb) => {
      const av = (ra[sortKey] ?? "").toString();
      const bv = (rb[sortKey] ?? "").toString();
      const c = compareAlpha(av, bv);
      return sortDir === "asc" ? c : -c;
    });

    return rows;
  }

  function applyColumnVisibilityToHeader() {
    const ths = document.querySelectorAll("thead th");
    for (const th of ths) {
      const key = th.getAttribute("data-key");
      const visible = !!showEnabled[key];
      th.style.display = visible ? "" : "none";
    }
  }

  function setHeaderArrows() {
    const ths = document.querySelectorAll("thead th");
    for (const th of ths) {
      const key = th.getAttribute("data-key");
      const arrow = th.querySelector(".th-arrow");
      if (!arrow) continue;

      if (!showEnabled[key]) {
        arrow.textContent = "";
        continue;
      }

      if (key === sortKey) arrow.textContent = sortDir === "asc" ? "↑" : "↓";
      else arrow.textContent = "↕";
    }
  }

  function renderTable() {
    const rows = filteredAndSorted();
    const visibleCols = getVisibleColumns();

    tableBody.innerHTML = "";

    for (const r of rows) {
      const tr = document.createElement("tr");
      for (const c of visibleCols) {
        const td = document.createElement("td");
        td.textContent = (r[c.key] ?? "").toString();
        tr.appendChild(td);
      }
      tableBody.appendChild(tr);
    }

    applyColumnVisibilityToHeader();
    setHeaderArrows();
  }

  function setSort(key) {
    if (!showEnabled[key]) return;

    if (sortKey === key) sortDir = sortDir === "asc" ? "desc" : "asc";
    else { sortKey = key; sortDir = "asc"; }

    setHeaderArrows();
    renderTable();
  }

  function openModal() {
    modalOverlay.hidden = false;
    settingsModal.hidden = false;
  }

  function closeModal() {
    modalOverlay.hidden = true;
    settingsModal.hidden = true;
  }

  function syncSettingsUI() {
    const searchChecks = document.querySelectorAll(`input[type="checkbox"][data-search-key]`);
    for (const chk of searchChecks) {
      const k = chk.getAttribute("data-search-key");
      chk.checked = !!searchEnabled[k];
    }

    const showChecks = document.querySelectorAll(`input[type="checkbox"][data-show-key]`);
    for (const chk of showChecks) {
      const k = chk.getAttribute("data-show-key");
      chk.checked = !!showEnabled[k];
    }
  }

  function setAllSearch(v) {
    for (const c of columns) searchEnabled[c.key] = v;
    syncSettingsUI();
    renderTable();
  }

  function setAllShow(v) {
    for (const c of columns) showEnabled[c.key] = v;

    if (!showEnabled[sortKey]) {
      const firstVisible = columns.find(col => showEnabled[col.key]);
      sortKey = firstVisible ? firstVisible.key : columns[0].key;
      sortDir = "asc";
    }

    syncSettingsUI();
    renderTable();
  }

  async function loadCsvFromRepo() {
    const res = await fetch("./codes.csv", { cache: "no-store" });
    if (!res.ok) throw new Error("codes.csv_not_found");
    const text = await res.text();
    points = parseCodesCsv(text);
    renderTable();
  }

  closeModal();

  searchInput.addEventListener("input", renderTable);

  settingsBtn.addEventListener("click", () => {
    syncSettingsUI();
    openModal();
  });

  closeModalBtn.addEventListener("click", () => closeModal());
  modalOverlay.addEventListener("click", () => closeModal());

  document.addEventListener("keydown", (e) => {
    if (!settingsModal.hidden && e.key === "Escape") closeModal();
  });

  enableAllBtn.addEventListener("click", () => setAllSearch(true));
  disableAllBtn.addEventListener("click", () => setAllSearch(false));
  showAllBtn.addEventListener("click", () => setAllShow(true));
  hideAllBtn.addEventListener("click", () => setAllShow(false));

  const searchChecks = document.querySelectorAll(`input[type="checkbox"][data-search-key]`);
  for (const chk of searchChecks) {
    chk.addEventListener("change", () => {
      const k = chk.getAttribute("data-search-key");
      searchEnabled[k] = chk.checked;
      renderTable();
    });
  }

  const showChecks = document.querySelectorAll(`input[type="checkbox"][data-show-key]`);
  for (const chk of showChecks) {
    chk.addEventListener("change", () => {
      const k = chk.getAttribute("data-show-key");
      showEnabled[k] = chk.checked;

      if (!showEnabled[sortKey]) {
        const firstVisible = columns.find(col => showEnabled[col.key]);
        sortKey = firstVisible ? firstVisible.key : columns[0].key;
        sortDir = "asc";
      }

      renderTable();
    });
  }

  const thButtons = document.querySelectorAll("thead th .th-btn");
  for (const btn of thButtons) {
    btn.addEventListener("click", () => {
      const th = btn.closest("th");
      const key = th?.getAttribute("data-key");
      if (key) setSort(key);
    });
  }

  syncSettingsUI();
  loadCsvFromRepo().catch(() => {
    points = [];
    renderTable();
  });
});
