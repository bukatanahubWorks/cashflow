const txType = { value: "Cash In" };
const eventMode = { value: "General" };

const $ = (id) => document.getElementById(id);

document.addEventListener("DOMContentLoaded", () => {
  [$("txPerson"), $("trFrom"), $("trTo")].forEach((sel) => {
    PEOPLE.forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p;
      opt.textContent = p;
      sel.appendChild(opt);
    });
  });

  CATEGORIES.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    $("txCategory").appendChild(opt);
  });

  $("txDate").value = todayISO();
  $("trDate").value = todayISO();

  setupToggle("typeToggle", txType, updateVisibility);
  setupToggle("eventToggle", eventMode, updateVisibility);
  updateVisibility();

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      $(btn.dataset.tab).classList.add("active");
    });
  });
});

function setupToggle(groupId, stateObj, onChange) {
  const buttons = document.querySelectorAll(`#${groupId} .seg-btn`);
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      stateObj.value = btn.dataset.value;
      onChange();
    });
  });
}

function updateVisibility() {
  const isOut = txType.value === "Cash Out";
  $("eventOutBlock").classList.toggle("hidden", !isOut);
  $("eventInBlock").classList.toggle("hidden", isOut);
  $("categoryBlock").classList.toggle("hidden", !isOut);
  $("eventIdBlock").classList.toggle("hidden", !(isOut && eventMode.value === "Event"));
}

$("txForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const isOut = txType.value === "Cash Out";

  let eventValue = "General";
  if (isOut) {
    eventValue = eventMode.value === "Event" ? ($("txEventId").value.trim() || "Event") : "General";
  } else {
    eventValue = $("txEventIdIn").value.trim();
  }

  const payload = {
    action: "addTransaction",
    type: txType.value,
    person: $("txPerson").value,
    amount: $("txAmount").value,
    date: $("txDate").value,
    event: eventValue,
    category: isOut ? $("txCategory").value : "",
    notes: $("txNotes").value
  };

  try {
    await apiPost(payload);
    showToast("Transaction saved");
    e.target.reset();
    $("txDate").value = todayISO();
    updateVisibility();
  } catch (err) {
    showToast(err.message, true);
  }
});

$("trForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const from = $("trFrom").value;
  const to = $("trTo").value;
  if (from === to) {
    showToast("From and To must be different people", true);
    return;
  }
  const payload = {
    action: "addTransfer",
    from,
    to,
    amount: $("trAmount").value,
    date: $("trDate").value,
    notes: $("trNotes").value
  };
  try {
    await apiPost(payload);
    showToast("Transfer saved");
    e.target.reset();
    $("trDate").value = todayISO();
  } catch (err) {
    showToast(err.message, true);
  }
});
