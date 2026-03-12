document.addEventListener("DOMContentLoaded", () => {
  const columns = [
    { key: "featureCode", label: "Feature Code" },
    { key: "levelName", label: "Level Name" },
    { key: "levelDescription", label: "Level Description" },
    { key: "pointLine", label: "Point / Line" },
    { key: "zone", label: "Zone" }
  ];

  const searchInput = document.getElementById("searchInput");
  const codeListSelect = document.getElementById("codeListSelect");
  const tableBody = document.getElementById("tableBody");
  const settingsBtn = document.getElementById("settingsBtn");
  const modalOverlay = document.getElementById("modalOverlay");
  const settingsModal = document.getElementById("settingsModal");
  const closeModalBtn = document.getElementById("closeModalBtn");
  const enableAllBtn = document.getElementById("enableAllBtn");
  const disableAllBtn = document.getElementById("disableAllBtn");
  const showAllBtn = document.getElementById("showAllBtn");
  const hideAllBtn = document.getElementById("hideAllBtn");

  if (!searchInput || !codeListSelect || !tableBody || !settingsBtn || !modalOverlay || !settingsModal || !closeModalBtn || !enableAllBtn || !disableAllBtn || !showAllBtn || !hideAllBtn) {
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
    const lines = text
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .split("\n")
      .map(l => l.trim())
      .filter(l => l.length > 0);

    const rows = [];
    for (const line of lines) {
      const parts = parseCsvLine(line);
      if (parts.length < 5) continue;

      const first = normalize(parts[0]);
      const firstNoQuotes = first.replace(/"/g, "");

      if (first.includes("fdot") && line.includes(",,,,")) continue;
      if (firstNoQuotes === "feature code") continue;

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
      th.style.display = showEnabled[key] ? "" : "none";
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

      arrow.textContent = key === sortKey ? (sortDir === "asc" ? "↑" : "↓") : "↕";
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
    else {
      sortKey = key;
      sortDir = "asc";
    }

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
    const searchChecks = document.querySelectorAll('input[type="checkbox"][data-search-key]');
    for (const chk of searchChecks) {
      const k = chk.getAttribute("data-search-key");
      chk.checked = !!searchEnabled[k];
    }

    const showChecks = document.querySelectorAll('input[type="checkbox"][data-show-key]');
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

  function setupColumnResizers() {
    const table = document.getElementById("dataTable");
    if (!table) return;

    const colEls = table.querySelectorAll("colgroup col[data-col-key]");
    const colMap = new Map();
    for (const col of colEls) colMap.set(col.getAttribute("data-col-key"), col);

    let active = null;

    function getClientX(e) {
      if (e.touches && e.touches.length) return e.touches[0].clientX;
      return e.clientX;
    }

    function onMove(e) {
      if (!active) return;
      const x = getClientX(e);
      const dx = x - active.startX;
      const w = Math.max(active.minW, active.startW + dx);
      active.col.style.width = w + "px";
      e.preventDefault();
    }

    function end() {
      if (!active) return;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      active = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("mouseup", end);
      window.removeEventListener("touchend", end);
    }

    const resizers = table.querySelectorAll(".col-resizer[data-resize-key]");
    for (const rz of resizers) {
      const key = rz.getAttribute("data-resize-key");
      const col = colMap.get(key);
      if (!col) continue;

      function start(e) {
        e.preventDefault();
        e.stopPropagation();

        const startW = parseFloat((col.style.width || "0").replace("px", "")) || rz.parentElement.getBoundingClientRect().width;
        active = {
          col,
          startX: getClientX(e),
          startW,
          minW: 60
        };

        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";

        window.addEventListener("mousemove", onMove, { passive: false });
        window.addEventListener("touchmove", onMove, { passive: false });
        window.addEventListener("mouseup", end);
        window.addEventListener("touchend", end);
      }

      rz.addEventListener("mousedown", start);
      rz.addEventListener("touchstart", start, { passive: false });
    }
  }

  function buildSelectOptions(items) {
    codeListSelect.innerHTML = "";
    for (const item of items) {
      const opt = document.createElement("option");
      opt.value = item.file;
      opt.textContent = item.label;
      codeListSelect.appendChild(opt);
    }
  }

  async function loadCodeListManifest() {
    const res = await fetch("./codes/index.json", { cache: "no-store" });
    if (!res.ok) throw new Error("codes_manifest_not_found");
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) throw new Error("codes_manifest_empty");

    return data
      .filter(item => item && typeof item.file === "string" && item.file.toLowerCase().endsWith(".csv"))
      .map(item => ({
        file: item.file,
        label: item.label || item.file.replace(/\.csv$/i, "")
      }));
  }

  async function loadCsvFile(fileName) {
    const safeFile = fileName.replace(/^\/+/, "");
    const res = await fetch(`./codes/${safeFile}`, { cache: "no-store" });
    if (!res.ok) throw new Error("codes_csv_not_found");
    const text = await res.text();
    points = parseCodesCsv(text);
    renderTable();
  }

  async function initCodeLists() {
    const lists = await loadCodeListManifest();
    buildSelectOptions(lists);

    const saved = localStorage.getItem("fieldcodes.selectedList");
    const initial = lists.find(x => x.file === saved) ? saved : lists[0].file;

    codeListSelect.value = initial;
    await loadCsvFile(initial);

    codeListSelect.addEventListener("change", async () => {
      const file = codeListSelect.value;
      localStorage.setItem("fieldcodes.selectedList", file);
      await loadCsvFile(file);
    });
  }

  closeModal();

  searchInput.addEventListener("input", renderTable);

  settingsBtn.addEventListener("click", () => {
    syncSettingsUI();
    openModal();
  });

  closeModalBtn.addEventListener("click", () => closeModal());
  modalOverlay.addEventListener("click", () => closeModal());

  document.addEventListener("keydown", e => {
    if (!settingsModal.hidden && e.key === "Escape") closeModal();
  });

  enableAllBtn.addEventListener("click", () => setAllSearch(true));
  disableAllBtn.addEventListener("click", () => setAllSearch(false));
  showAllBtn.addEventListener("click", () => setAllShow(true));
  hideAllBtn.addEventListener("click", () => setAllShow(false));

  const searchChecks = document.querySelectorAll('input[type="checkbox"][data-search-key]');
  for (const chk of searchChecks) {
    chk.addEventListener("change", () => {
      const k = chk.getAttribute("data-search-key");
      searchEnabled[k] = chk.checked;
      renderTable();
    });
  }

  const showChecks = document.querySelectorAll('input[type="checkbox"][data-show-key]');
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
  setupColumnResizers();

  initCodeLists().catch(() => {
    points = [];
    buildSelectOptions([{ file: "", label: "No code lists found" }]);
    codeListSelect.value = "";
    codeListSelect.disabled = true;
    renderTable();
  });
});
