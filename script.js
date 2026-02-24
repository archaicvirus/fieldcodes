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
  const fontZoomRange = document.getElementById("fontZoomRange");
  const fontZoomValue = document.getElementById("fontZoomValue");

  if (!searchInput || !tableBody || !settingsBtn || !modalOverlay || !settingsModal || !closeModalBtn || !enableAllBtn || !disableAllBtn || !showAllBtn || !hideAllBtn || !fontZoomRange || !fontZoomValue) {
    return;
  }

  const searchEnabled = Object.fromEntries(columns.map(c => [c.key, true]));
  const showEnabled = Object.fromEntries(columns.map(c => [c.key, true]));

  let sortKey = "featureCode";
  let sortDir = "asc";
  let points = [];

  const fontZoomStorageKey = "fieldcodes_font_zoom";

  function clampZoom(v) {
    return Math.max(0.85, Math.min(1.8, v));
  }

  function applyFontZoom(v) {
    const zoom = clampZoom(v);
    document.documentElement.style.setProperty("--font-zoom", zoom.toFixed(2));
    fontZoomRange.value = zoom.toFixed(2);
    fontZoomValue.textContent = Math.round(zoom * 100) + "%";
  }

  function loadSavedFontZoom() {
    let saved = null;
    try {
      saved = window.localStorage.getItem(fontZoomStorageKey);
    } catch (_) {
      saved = null;
    }

    const parsed = saved == null ? 1 : parseFloat(saved);
    applyFontZoom(Number.isFinite(parsed) ? parsed : 1);
  }

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
      if (first.includes("fdot") && line.includes(",,,,")) continue;

      const firstNoQuotes = first.replace(/"/g, "");
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
      const visible = !!showEnabled[key];
      th.style.display = visible ? "" : "none";
    }
  }

  function applyColumnVisibilityToBody() {
    const ths = document.querySelectorAll("thead th");
    const visibleKeys = new Set(columns.filter(c => showEnabled[c.key]).map(c => c.key));
    for (const th of ths) {
      const key = th.getAttribute("data-key");
      const idx = Array.prototype.indexOf.call(th.parentElement.children, th);
      const visible = visibleKeys.has(key);

      const rows = document.querySelectorAll("tbody tr");
      for (const tr of rows) {
        const td = tr.children[idx];
        if (td) td.style.display = visible ? "" : "none";
      }
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
      window.removeEventListener("mousemove", onMove, { passive: false });
      window.removeEventListener("touchmove", onMove, { passive: false });
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
          minW: 70
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

  async function loadCsvFromRepo() {
    const res = await fetch("./codes.csv", { cache: "no-store" });
    if (!res.ok) throw new Error("codes.csv_not_found");
    const text = await res.text();
    points = parseCodesCsv(text);
    renderTable();
  }

  loadSavedFontZoom();
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

  fontZoomRange.addEventListener("input", () => {
    const zoom = parseFloat(fontZoomRange.value);
    applyFontZoom(Number.isFinite(zoom) ? zoom : 1);
  });

  fontZoomRange.addEventListener("change", () => {
    try {
      window.localStorage.setItem(fontZoomStorageKey, fontZoomRange.value);
    } catch (_) {
      // Ignore storage errors (private mode / blocked storage).
    }
  });

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
  loadCsvFromRepo().then(() => {
    setupColumnResizers();
  }).catch(() => {
    points = [];
    renderTable();
    setupColumnResizers();
  });
});
