const $ = (id) => document.getElementById(id);

let ALL_TX = [];
let ALL_TR = [];
let EVENTS = [];
let categoryChartInstance = null;
let eventChartInstance = null;

document.addEventListener("DOMContentLoaded", async () => {
  document.querySelectorAll("[data-logtab]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-logtab]").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const isTx = btn.dataset.logtab === "tx";
      $("txLogPanel").classList.toggle("active", isTx);
      $("trLogPanel").classList.toggle("active", !isTx);
    });
  });
  await loadAndRender();
});

async function loadAndRender() {
  try {
    const data = await apiGet();
    ALL_TX = data.transactions || [];
    ALL_TR = data.transfers || [];
    EVENTS = data.events || [];
    render();
  } catch (err) {
    $("loadingMsg").textContent = err.message;
  }
}

function render() {
  $("loadingMsg").classList.add("hidden");
  $("dashboard").classList.remove("hidden");

  const now = new Date();
  const curMonth = now.getMonth(), curYear = now.getFullYear();

  let totalIn = 0, totalOut = 0, monthIn = 0, monthOut = 0;
  const personBalance = {};
  PEOPLE.forEach((p) => (personBalance[p] = 0));
  const categoryTotals = {};
  CATEGORIES.forEach((c) => (categoryTotals[c] = 0));
  const eventTotals = {};

  ALL_TX.forEach((t) => {
    const amount = Number(t.Amount) || 0;
    const d = new Date(t.Date);
    const valid = !isNaN(d);

    if (t.Type === "Cash In") {
      totalIn += amount;
      if (personBalance.hasOwnProperty(t.Person)) personBalance[t.Person] += amount;
      if (valid && d.getMonth() === curMonth && d.getFullYear() === curYear) monthIn += amount;
    } else if (t.Type === "Cash Out") {
      totalOut += amount;
      if (personBalance.hasOwnProperty(t.Person)) personBalance[t.Person] -= amount;
      if (valid && d.getMonth() === curMonth && d.getFullYear() === curYear) monthOut += amount;
      if (t.Category) categoryTotals[t.Category] = (categoryTotals[t.Category] || 0) + amount;
      const ev = (t.Event || "").trim();
      if (ev && ev !== "General") eventTotals[ev] = (eventTotals[ev] || 0) + amount;
    }
  });

  ALL_TR.forEach((tr) => {
    const amount = Number(tr.Amount) || 0;
    if (personBalance.hasOwnProperty(tr.From)) personBalance[tr.From] -= amount;
    if (personBalance.hasOwnProperty(tr.To)) personBalance[tr.To] += amount;
  });

  $("statTotalCash").textContent = formatCurrency(totalIn - totalOut);
  $("statInMonth").textContent = formatCurrency(monthIn);
  $("statOutMonth").textContent = formatCurrency(monthOut);

  const grid = $("balanceGrid");
  grid.innerHTML = "";
  PEOPLE.forEach((p) => {
    const bal = personBalance[p];
    const div = document.createElement("div");
    div.className = "balance-card " + (bal < 0 ? "negative" : "positive");
    div.innerHTML = `<div class="balance-name">${p}</div><div class="balance-amount">${formatCurrency(bal)}</div>`;
    grid.appendChild(div);
  });

  renderCategoryChart(categoryTotals);
  renderEventChart(eventTotals);
  renderTxLog();
  renderTrLog();
}

// ---- Charts: one tower per category / per event ----
function renderCategoryChart(categoryTotals) {
  const labels = CATEGORIES;
  const colors = { Food: "#A1462F", Workers: "#6B7261", Cleaning: "#3F6B3D", Maintenance: "#8C6C3C", Others: "#5B4A66" };
  const values = labels.map((c) => categoryTotals[c] || 0);
  const bg = labels.map((c) => colors[c] || "#888");
  const hasData = values.some((v) => v > 0);
  $("categoryChartEmpty").classList.toggle("hidden", hasData);

  if (categoryChartInstance) categoryChartInstance.destroy();
  categoryChartInstance = new Chart($("categoryChart"), {
    type: "bar",
    data: { labels, datasets: [{ label: "Cash Out", data: values, backgroundColor: bg, borderRadius: 4 }] },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });
}

function renderEventChart(eventTotals) {
  const labels = Object.keys(eventTotals).sort();
  const palette = ["#A1462F", "#3F6B3D", "#6B7261", "#8C6C3C", "#5B4A66", "#3F6B8C", "#8C3C6E", "#6E8C3C"];
  const values = labels.map((l) => eventTotals[l]);
  const bg = labels.map((_, i) => palette[i % palette.length]);
  $("eventChartEmpty").classList.toggle("hidden", labels.length > 0);

  if (eventChartInstance) eventChartInstance.destroy();
  eventChartInstance = new Chart($("eventChart"), {
    type: "bar",
    data: { labels, datasets: [{ label: "Cash Out", data: values, backgroundColor: bg, borderRadius: 4 }] },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });
}

// ---- Transaction log (editable) ----
function renderTxLog() {
  const tbody = $("txLogBody");
  tbody.innerHTML = "";
  [...ALL_TX].sort((a, b) => (b._row || 0) - (a._row || 0)).forEach((t) => tbody.appendChild(buildTxRow(t)));
}

function buildTxRow(t) {
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td>${t.Date || ""}</td>
    <td>${t.Type || ""}</td>
    <td>${t.Person || ""}</td>
    <td class="amount-cell">${formatCurrency(t.Amount)}</td>
    <td>${t.Event || ""}</td>
    <td>${t.Category || ""}</td>
    <td>${t.Notes || ""}</td>
    <td><button class="ghost-btn" type="button">Edit</button></td>
  `;
  tr.querySelector("button").addEventListener("click", () => enterTxEditMode(tr, t));
  return tr;
}

function enterTxEditMode(tr, t) {
  const eventOptions = `
    <option value="" ${!t.Event ? "selected" : ""}>— None —</option>
    <option value="General" ${t.Event === "General" ? "selected" : ""}>General</option>
    ${EVENTS.map((ev) => `<option value="${ev}" ${ev === t.Event ? "selected" : ""}>${ev}</option>`).join("")}
  `;
  const categoryOptions = `
    <option value="">—</option>
    ${CATEGORIES.map((c) => `<option value="${c}" ${c === t.Category ? "selected" : ""}>${c}</option>`).join("")}
  `;
  tr.innerHTML = `
    <td><input type="date" class="e-date" value="${t.Date || ""}"></td>
    <td><select class="e-type">
      <option value="Cash In" ${t.Type === "Cash In" ? "selected" : ""}>Cash In</option>
      <option value="Cash Out" ${t.Type === "Cash Out" ? "selected" : ""}>Cash Out</option>
    </select></td>
    <td><select class="e-person">${PEOPLE.map((p) => `<option value="${p}" ${p === t.Person ? "selected" : ""}>${p}</option>`).join("")}</select></td>
    <td><input type="number" class="e-amount" value="${Number(t.Amount) || 0}" min="0" step="1"></td>
    <td><select class="e-event">${eventOptions}</select></td>
    <td><select class="e-category">${categoryOptions}</select></td>
    <td><input type="text" class="e-notes" value="${t.Notes || ""}"></td>
    <td class="row-actions">
      <button class="ghost-btn e-save" type="button">Save</button>
      <button class="ghost-btn e-cancel" type="button">Cancel</button>
    </td>
  `;
  tr.querySelector(".e-cancel").addEventListener("click", () => tr.replaceWith(buildTxRow(t)));
  tr.querySelector(".e-save").addEventListener("click", async () => {
    const payload = {
      action: "updateTransaction",
      row: t._row,
      date: tr.querySelector(".e-date").value,
      type: tr.querySelector(".e-type").value,
      person: tr.querySelector(".e-person").value,
      amount: tr.querySelector(".e-amount").value,
      event: tr.querySelector(".e-event").value,
      category: tr.querySelector(".e-category").value,
      notes: tr.querySelector(".e-notes").value
    };
    try {
      await apiPost(payload);
      showToast("Transaction updated");
      await loadAndRender();
    } catch (err) {
      showToast(err.message, true);
    }
  });
}

// ---- Transfer log (editable) ----
function renderTrLog() {
  const tbody = $("trLogBody");
  tbody.innerHTML = "";
  [...ALL_TR].sort((a, b) => (b._row || 0) - (a._row || 0)).forEach((t) => tbody.appendChild(buildTrRow(t)));
}

function buildTrRow(t) {
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td>${t.Date || ""}</td>
    <td>${t.From || ""}</td>
    <td>${t.To || ""}</td>
    <td class="amount-cell">${formatCurrency(t.Amount)}</td>
    <td>${t.Notes || ""}</td>
    <td><button class="ghost-btn" type="button">Edit</button></td>
  `;
  tr.querySelector("button").addEventListener("click", () => enterTrEditMode(tr, t));
  return tr;
}

function enterTrEditMode(tr, t) {
  tr.innerHTML = `
    <td><input type="date" class="e-date" value="${t.Date || ""}"></td>
    <td><select class="e-from">${PEOPLE.map((p) => `<option value="${p}" ${p === t.From ? "selected" : ""}>${p}</option>`).join("")}</select></td>
    <td><select class="e-to">${PEOPLE.map((p) => `<option value="${p}" ${p === t.To ? "selected" : ""}>${p}</option>`).join("")}</select></td>
    <td><input type="number" class="e-amount" value="${Number(t.Amount) || 0}" min="0" step="1"></td>
    <td><input type="text" class="e-notes" value="${t.Notes || ""}"></td>
    <td class="row-actions">
      <button class="ghost-btn e-save" type="button">Save</button>
      <button class="ghost-btn e-cancel" type="button">Cancel</button>
    </td>
  `;
  tr.querySelector(".e-cancel").addEventListener("click", () => tr.replaceWith(buildTrRow(t)));
  tr.querySelector(".e-save").addEventListener("click", async () => {
    const payload = {
      action: "updateTransfer",
      row: t._row,
      date: tr.querySelector(".e-date").value,
      from: tr.querySelector(".e-from").value,
      to: tr.querySelector(".e-to").value,
      amount: tr.querySelector(".e-amount").value,
      notes: tr.querySelector(".e-notes").value
    };
    try {
      await apiPost(payload);
      showToast("Transfer updated");
      await loadAndRender();
    } catch (err) {
      showToast(err.message, true);
    }
  });
}
