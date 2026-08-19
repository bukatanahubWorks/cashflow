document.addEventListener("DOMContentLoaded", async () => {
  try {
    const data = await apiGet();
    render(data.transactions || [], data.transfers || []);
  } catch (err) {
    document.getElementById("loadingMsg").textContent = err.message;
  }
});

function render(transactions, transfers) {
  document.getElementById("loadingMsg").classList.add("hidden");
  document.getElementById("dashboard").classList.remove("hidden");

  const now = new Date();
  const curMonth = now.getMonth();
  const curYear = now.getFullYear();

  let totalIn = 0, totalOut = 0, monthIn = 0, monthOut = 0;
  const personBalance = {};
  PEOPLE.forEach((p) => (personBalance[p] = 0));

  const categoryByMonth = {}; // { "2026-08": { Food: 100, ... } }
  const eventTotals = {}; // { eventId: amount }

  transactions.forEach((t) => {
    const amount = Number(t.Amount) || 0;
    const d = new Date(t.Date);
    const validDate = !isNaN(d);
    const monthKey = validDate ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` : "Unknown";

    if (t.Type === "Cash In") {
      totalIn += amount;
      if (personBalance.hasOwnProperty(t.Person)) personBalance[t.Person] += amount;
      if (validDate && d.getMonth() === curMonth && d.getFullYear() === curYear) monthIn += amount;
    } else if (t.Type === "Cash Out") {
      totalOut += amount;
      if (personBalance.hasOwnProperty(t.Person)) personBalance[t.Person] -= amount;
      if (validDate && d.getMonth() === curMonth && d.getFullYear() === curYear) monthOut += amount;

      if (t.Category) {
        categoryByMonth[monthKey] = categoryByMonth[monthKey] || {};
        categoryByMonth[monthKey][t.Category] = (categoryByMonth[monthKey][t.Category] || 0) + amount;
      }

      const ev = (t.Event || "").trim();
      if (ev && ev !== "General") {
        eventTotals[ev] = (eventTotals[ev] || 0) + amount;
      }
    }
  });

  transfers.forEach((tr) => {
    const amount = Number(tr.Amount) || 0;
    if (personBalance.hasOwnProperty(tr.From)) personBalance[tr.From] -= amount;
    if (personBalance.hasOwnProperty(tr.To)) personBalance[tr.To] += amount;
  });

  document.getElementById("statTotalCash").textContent = formatCurrency(totalIn - totalOut);
  document.getElementById("statInMonth").textContent = formatCurrency(monthIn);
  document.getElementById("statOutMonth").textContent = formatCurrency(monthOut);

  const balanceGrid = document.getElementById("balanceGrid");
  balanceGrid.innerHTML = "";
  PEOPLE.forEach((p) => {
    const bal = personBalance[p];
    const div = document.createElement("div");
    div.className = "balance-card " + (bal < 0 ? "negative" : "positive");
    div.innerHTML = `<div class="balance-name">${p}</div><div class="balance-amount">${formatCurrency(bal)}</div>`;
    balanceGrid.appendChild(div);
  });

  renderCategoryChart(categoryByMonth);
  renderEventList(eventTotals);
}

function renderCategoryChart(categoryByMonth) {
  const months = Object.keys(categoryByMonth).sort();
  const colors = {
    Food: "#A1462F",
    Workers: "#6B7261",
    Cleaning: "#3F6B3D",
    Maintenance: "#8C6C3C",
    Others: "#5B4A66"
  };

  new Chart(document.getElementById("categoryChart"), {
    type: "bar",
    data: {
      labels: months,
      datasets: CATEGORIES.map((c) => ({
        label: c,
        data: months.map((m) => categoryByMonth[m][c] || 0),
        backgroundColor: colors[c] || "#888"
      }))
    },
    options: {
      responsive: true,
      scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } },
      plugins: { legend: { position: "bottom", labels: { font: { family: "Work Sans" } } } }
    }
  });
}

function renderEventList(eventTotals) {
  const container = document.getElementById("eventList");
  container.innerHTML = "";
  const entries = Object.entries(eventTotals).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) {
    container.innerHTML = '<p class="muted">No event-tagged expenses yet.</p>';
    return;
  }
  entries.forEach(([ev, amount]) => {
    const row = document.createElement("div");
    row.className = "event-row";
    row.innerHTML = `<span>${ev}</span><span>${formatCurrency(amount)}</span>`;
    container.appendChild(row);
  });
}
