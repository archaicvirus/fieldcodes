console.log("NEW SCRIPT LOADED v6")

document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("searchInput")
  const codeListSelect = document.getElementById("codeListSelect")
  const dataTable = document.getElementById("dataTable")
  const tableColGroup = document.getElementById("tableColGroup")
  const tableHead = document.getElementById("tableHead")
  const tableBody = document.getElementById("tableBody")
  const settingsBtn = document.getElementById("settingsBtn")
  const modalOverlay = document.getElementById("modalOverlay")
  const settingsModal = document.getElementById("settingsModal")
  const closeModalBtn = document.getElementById("closeModalBtn")
  const enableAllBtn = document.getElementById("enableAllBtn")
  const disableAllBtn = document.getElementById("disableAllBtn")
  const showAllBtn = document.getElementById("showAllBtn")
  const hideAllBtn = document.getElementById("hideAllBtn")
  const searchSettingsList = document.getElementById("searchSettingsList")
  const showSettingsList = document.getElementById("showSettingsList")

  if (
    !searchInput ||
    !codeListSelect ||
    !dataTable ||
    !tableColGroup ||
    !tableHead ||
    !tableBody ||
    !settingsBtn ||
    !modalOverlay ||
    !settingsModal ||
    !closeModalBtn ||
    !enableAllBtn ||
    !disableAllBtn ||
    !showAllBtn ||
    !hideAllBtn ||
    !searchSettingsList ||
    !showSettingsList
  ) {
    console.log("Missing required DOM nodes")
    return
  }

  let columns = []
  let points = []
  let searchEnabled = {}
  let showEnabled = {}
  let columnWidths = {}
  let sortKey = ""
  let sortDir = "asc"

  function normalize(s) {
    return (s ?? "").toString().trim().toLowerCase()
  }

  function compareAlpha(a, b) {
    return a.localeCompare(b, undefined, { sensitivity: "base", numeric: true })
  }

  function slugifyHeader(header, index) {
    const cleaned = (header ?? "")
      .toString()
      .trim()
      .replace(/^"+|"+$/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .replace(/\s+/g, "_")

    return cleaned || `column_${index + 1}`
  }

  function parseCsvLine(line) {
    const out = []
    let cur = ""
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const ch = line[i]

      if (ch === '"') {
        if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
          cur += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
        continue
      }

      if (ch === "," && !inQuotes) {
        out.push(cur)
        cur = ""
        continue
      }

      cur += ch
    }

    out.push(cur)
    return out.map(v => v.trim())
  }

  function parseGenericCsv(text) {
    const lines = text
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .split("\n")
      .map(l => l.trimEnd())
      .filter(l => l.trim() !== "")

    if (lines.length === 0) {
      return { columns: [], rows: [] }
    }

    const rawHeader = parseCsvLine(lines[0])
    let headerCount = rawHeader.length
    while (headerCount > 0 && (rawHeader[headerCount - 1] ?? "").trim() === "") {
      headerCount--
    }

    const builtColumns = rawHeader.slice(0, headerCount).map((label, i) => ({
      key: slugifyHeader(label, i),
      label: (label ?? "").replace(/^"+|"+$/g, "").trim() || `Column ${i + 1}`
    }))

    const rows = []
    for (let i = 1; i < lines.length; i++) {
      const parts = parseCsvLine(lines[i]).slice(0, headerCount)
      while (parts.length < headerCount) parts.push("")
      if (!parts.some(v => v.trim() !== "")) continue

      const row = {}
      for (let j = 0; j < builtColumns.length; j++) {
        row[builtColumns[j].key] = (parts[j] ?? "").trim()
      }
      rows.push(row)
    }

    return { columns: builtColumns, rows }
  }

  function defaultWidthForLabel(label) {
    const len = (label ?? "").length
    if (len <= 6) return 90
    if (len <= 12) return 130
    if (len <= 20) return 180
    if (len <= 30) return 240
    return 320
  }

  function ensureStateForColumns() {
    const nextSearch = {}
    const nextShow = {}
    const nextWidths = {}

    for (const col of columns) {
      nextSearch[col.key] = Object.prototype.hasOwnProperty.call(searchEnabled, col.key) ? searchEnabled[col.key] : true
      nextShow[col.key] = Object.prototype.hasOwnProperty.call(showEnabled, col.key) ? showEnabled[col.key] : true
      nextWidths[col.key] = columnWidths[col.key] || defaultWidthForLabel(col.label)
    }

    searchEnabled = nextSearch
    showEnabled = nextShow
    columnWidths = nextWidths

    if (!columns.find(c => c.key === sortKey)) {
      sortKey = columns[0]?.key || ""
      sortDir = "asc"
    }

    if (sortKey && !showEnabled[sortKey]) {
      const firstVisible = columns.find(c => showEnabled[c.key])
      sortKey = firstVisible ? firstVisible.key : (columns[0]?.key || "")
      sortDir = "asc"
    }
  }

  function buildTableStructure() {
    tableColGroup.innerHTML = ""
    tableHead.innerHTML = ""

    const tr = document.createElement("tr")

    for (const col of columns) {
      const colEl = document.createElement("col")
      colEl.setAttribute("data-col-key", col.key)
      colEl.style.width = `${columnWidths[col.key]}px`
      tableColGroup.appendChild(colEl)

      const th = document.createElement("th")
      th.setAttribute("data-key", col.key)

      const btn = document.createElement("button")
      btn.className = "th-btn"
      btn.type = "button"

      const label = document.createElement("span")
      label.className = "th-label"
      label.textContent = col.label

      const arrow = document.createElement("span")
      arrow.className = "th-arrow"
      arrow.setAttribute("aria-hidden", "true")
      arrow.textContent = "↕"

      btn.appendChild(label)
      btn.appendChild(arrow)
      btn.addEventListener("click", () => setSort(col.key))

      const rz = document.createElement("span")
      rz.className = "col-resizer"
      rz.setAttribute("data-resize-key", col.key)
      rz.setAttribute("aria-hidden", "true")

      th.appendChild(btn)
      th.appendChild(rz)
      tr.appendChild(th)
    }

    tableHead.appendChild(tr)
    setupColumnResizers()
  }

  function buildSettingsLists() {
    searchSettingsList.innerHTML = ""
    showSettingsList.innerHTML = ""

    for (const col of columns) {
      const sLabel = document.createElement("label")
      sLabel.className = "check-row"

      const sChk = document.createElement("input")
      sChk.type = "checkbox"
      sChk.checked = !!searchEnabled[col.key]
      sChk.addEventListener("change", () => {
        searchEnabled[col.key] = sChk.checked
        renderTable()
      })

      const sText = document.createElement("span")
      sText.textContent = col.label

      sLabel.appendChild(sChk)
      sLabel.appendChild(sText)
      searchSettingsList.appendChild(sLabel)

      const vLabel = document.createElement("label")
      vLabel.className = "check-row"

      const vChk = document.createElement("input")
      vChk.type = "checkbox"
      vChk.checked = !!showEnabled[col.key]
      vChk.addEventListener("change", () => {
        showEnabled[col.key] = vChk.checked

        if (sortKey && !showEnabled[sortKey]) {
          const firstVisible = columns.find(c => showEnabled[c.key])
          sortKey = firstVisible ? firstVisible.key : (columns[0]?.key || "")
          sortDir = "asc"
        }

        renderTable()
      })

      const vText = document.createElement("span")
      vText.textContent = col.label

      vLabel.appendChild(vChk)
      vLabel.appendChild(vText)
      showSettingsList.appendChild(vLabel)
    }
  }

  function getSearchKeys() {
    return columns.filter(c => searchEnabled[c.key]).map(c => c.key)
  }

  function getVisibleColumns() {
    return columns.filter(c => showEnabled[c.key])
  }

  function matchesQuery(row, q, enabledKeys) {
    if (!q) return true
    for (const k of enabledKeys) {
      if (normalize(row[k]).includes(q)) return true
    }
    return false
  }

  function filteredAndSorted() {
    const q = normalize(searchInput.value)
    const enabledKeys = getSearchKeys()
    const rows = points.filter(r => matchesQuery(r, q, enabledKeys))

    if (sortKey) {
      rows.sort((a, b) => {
        const av = (a[sortKey] ?? "").toString()
        const bv = (b[sortKey] ?? "").toString()
        const cmp = compareAlpha(av, bv)
        return sortDir === "asc" ? cmp : -cmp
      })
    }

    return rows
  }

  function applyColumnVisibilityToHeader() {
    const ths = tableHead.querySelectorAll("th")
    for (const th of ths) {
      const key = th.getAttribute("data-key")
      th.style.display = showEnabled[key] ? "" : "none"
    }
  }

  function applyColumnVisibilityToColGroup() {
    const cols = tableColGroup.querySelectorAll("col")
    for (const col of cols) {
      const key = col.getAttribute("data-col-key")
      col.style.display = showEnabled[key] ? "" : "none"
      col.style.width = `${columnWidths[key]}px`
    }
  }

  function setHeaderArrows() {
    const ths = tableHead.querySelectorAll("th")
    for (const th of ths) {
      const key = th.getAttribute("data-key")
      const arrow = th.querySelector(".th-arrow")
      if (!arrow) continue
      arrow.textContent = !showEnabled[key] ? "" : (key === sortKey ? (sortDir === "asc" ? "↑" : "↓") : "↕")
    }
  }

  function renderTable() {
    const rows = filteredAndSorted()
    const visibleCols = getVisibleColumns()

    tableBody.innerHTML = ""

    for (const row of rows) {
      const tr = document.createElement("tr")
      for (const col of visibleCols) {
        const td = document.createElement("td")
        td.textContent = (row[col.key] ?? "").toString()
        tr.appendChild(td)
      }
      tableBody.appendChild(tr)
    }

    applyColumnVisibilityToHeader()
    applyColumnVisibilityToColGroup()
    setHeaderArrows()
  }

  function setSort(key) {
    if (!showEnabled[key]) return
    if (sortKey === key) sortDir = sortDir === "asc" ? "desc" : "asc"
    else {
      sortKey = key
      sortDir = "asc"
    }
    renderTable()
  }

  function openModal() {
    modalOverlay.hidden = false
    settingsModal.hidden = false
  }

  function closeModal() {
    modalOverlay.hidden = true
    settingsModal.hidden = true
  }

  function setAllSearch(v) {
    for (const c of columns) searchEnabled[c.key] = v
    buildSettingsLists()
    renderTable()
  }

  function setAllShow(v) {
    for (const c of columns) showEnabled[c.key] = v
    if (sortKey && !showEnabled[sortKey]) {
      const firstVisible = columns.find(c => showEnabled[c.key])
      sortKey = firstVisible ? firstVisible.key : (columns[0]?.key || "")
      sortDir = "asc"
    }
    buildSettingsLists()
    renderTable()
  }

  function setupColumnResizers() {
    const colEls = dataTable.querySelectorAll("colgroup col[data-col-key]")
    const colMap = new Map()
    for (const col of colEls) colMap.set(col.getAttribute("data-col-key"), col)

    let active = null

    function getClientX(e) {
      if (e.touches && e.touches.length) return e.touches[0].clientX
      return e.clientX
    }

    function onMove(e) {
      if (!active) return
      const dx = getClientX(e) - active.startX
      const w = Math.max(active.minW, active.startW + dx)
      columnWidths[active.key] = w
      active.col.style.width = `${w}px`
      e.preventDefault()
    }

    function end() {
      if (!active) return
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
      active = null
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("touchmove", onMove)
      window.removeEventListener("mouseup", end)
      window.removeEventListener("touchend", end)
    }

    const resizers = dataTable.querySelectorAll(".col-resizer[data-resize-key]")
    for (const rz of resizers) {
      const key = rz.getAttribute("data-resize-key")
      const col = colMap.get(key)
      if (!col) continue

      function start(e) {
        e.preventDefault()
        e.stopPropagation()

        const startW = parseFloat((col.style.width || "0").replace("px", "")) || rz.parentElement.getBoundingClientRect().width
        active = { key, col, startX: getClientX(e), startW, minW: 60 }

        document.body.style.cursor = "col-resize"
        document.body.style.userSelect = "none"

        window.addEventListener("mousemove", onMove, { passive: false })
        window.addEventListener("touchmove", onMove, { passive: false })
        window.addEventListener("mouseup", end)
        window.addEventListener("touchend", end)
      }

      rz.addEventListener("mousedown", start)
      rz.addEventListener("touchstart", start, { passive: false })
    }
  }

  function buildSelectOptions(items) {
    codeListSelect.innerHTML = ""
    for (const item of items) {
      const opt = document.createElement("option")
      opt.value = item.file
      opt.textContent = item.label
      codeListSelect.appendChild(opt)
    }
  }

  async function loadCodeListManifest() {
    const res = await fetch("./codes/index.json", { cache: "no-store" })
    if (!res.ok) throw new Error("codes_manifest_not_found")
    const data = await res.json()
    if (!Array.isArray(data) || data.length === 0) throw new Error("codes_manifest_empty")

    return data
      .filter(item => item && typeof item.file === "string" && item.file.toLowerCase().endsWith(".csv"))
      .map(item => ({
        file: item.file,
        label: item.label || item.file.replace(/\.csv$/i, "")
      }))
  }

  async function loadCsvFile(fileName) {
    const url = `./codes/${fileName.replace(/^\/+/, "")}`
    const res = await fetch(url, { cache: "no-store" })
    if (!res.ok) throw new Error("codes_csv_not_found")
    const text = await res.text()

    const parsed = parseGenericCsv(text)
    columns = parsed.columns
    points = parsed.rows

    console.log("Detected columns:", columns.map(c => c.label))
    console.log("Parsed rows:", points.length)

    ensureStateForColumns()
    buildTableStructure()
    buildSettingsLists()
    renderTable()
  }

  async function initCodeLists() {
    const lists = await loadCodeListManifest()
    buildSelectOptions(lists)

    const saved = localStorage.getItem("fieldcodes.selectedList")
    const initial = lists.find(x => x.file === saved) ? saved : lists[0].file

    codeListSelect.value = initial
    await loadCsvFile(initial)

    codeListSelect.addEventListener("change", async () => {
      const file = codeListSelect.value
      localStorage.setItem("fieldcodes.selectedList", file)
      await loadCsvFile(file)
    })
  }

  closeModal()

  searchInput.addEventListener("input", renderTable)
  settingsBtn.addEventListener("click", () => {
    buildSettingsLists()
    openModal()
  })
  closeModalBtn.addEventListener("click", () => closeModal())
  modalOverlay.addEventListener("click", () => closeModal())

  document.addEventListener("keydown", e => {
    if (!settingsModal.hidden && e.key === "Escape") closeModal()
  })

  enableAllBtn.addEventListener("click", () => setAllSearch(true))
  disableAllBtn.addEventListener("click", () => setAllSearch(false))
  showAllBtn.addEventListener("click", () => setAllShow(true))
  hideAllBtn.addEventListener("click", () => setAllShow(false))

  initCodeLists().catch(err => {
    console.error("Code list init failed:", err)
    columns = []
    points = []
    buildSelectOptions([{ file: "", label: "No code lists found" }])
    codeListSelect.value = ""
    codeListSelect.disabled = true
    tableColGroup.innerHTML = ""
    tableHead.innerHTML = ""
    tableBody.innerHTML = ""
    searchSettingsList.innerHTML = ""
    showSettingsList.innerHTML = ""
  })
})
