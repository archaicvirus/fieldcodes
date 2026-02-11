document.addEventListener("DOMContentLoaded", () => {
  const points = (window.FIELD_CODES || []).map(r => ({
    name: (r["Name"] ?? "").toString(),
    code: (r["Code"] ?? "").toString(),
    category: (r["Category"] ?? "").toString(),
    featureLayer: (r["Feature_Layer"] ?? "").toString(),
    notes: (r["Notes"] ?? "").toString()
  }));


  const columns = [
    { key: "name", label: "Name" },
    { key: "code", label: "Code" },
    { key: "category", label: "Category" },
    { key: "featureLayer", label: "Feature Layer" },
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

  if (!searchInput || !tableBody || !settingsBtn || !modalOverlay || !settingsModal || !closeModalBtn || !enableAllBtn || !disableAllBtn) {
    return;
  }

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

  closeModal();

  searchInput.addEventListener("input", renderTable);

  settingsBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    syncCheckboxesFromState();
    openModal();
  });

  closeModalBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeModal();
  });

  modalOverlay.addEventListener("click", () => closeModal());

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
});
