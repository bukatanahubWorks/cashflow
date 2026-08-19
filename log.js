const txType = { value: "Cash In" };
const eventMode = { value: "General" };
const $ = (id) => document.getElementById(id);

let EVENTS = [];

document.addEventListener("DOMContentLoaded", async () => {
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

  await loadEvents();
  populateEventSelect($("txEventId"), false);
  populateEventSelect($("txEventIdIn"), true);

  $("txEventId").addEventListener("change", () => {
    $("txNewEventName").classList.toggle("hidden", $("txEventId").value !== "__new__");
  });
  $("txEventIdIn").addEventListener("change", () => {
    $("txNewEventNameIn").classList.toggle("hidden", $("txEventIdIn").value !== "__new__");
  });
});

async function loadEvents() {
  try {
    const data = await apiGet();
    EVENTS = data.events || [];
  } catch (err) {
    EVENTS = []; // not connected yet, or nothing logged — "+ New event" still works
  }
}

function populateEventSelect(selectEl, includeNone) {
  const previousValue = selectEl.value;
  selectEl.innerHTML = "";
  if (includeNone) {
    const noneOpt = document.createElement("option");
    noneOpt.value = "";
    noneOpt.textContent = "— None —";
    selectEl.appendChild(noneOpt);
  }
  EVENTS.forEach((ev) => {
    const opt = document.createElement("option");
    opt.value = ev;
    opt.textContent = ev;
    selectEl.appendChild(opt);
  });
  const newOpt = document.createElement("option");
  newOpt.value = "__new__";
  newOpt.textContent = "+ New event…";
  selectEl.appendChild(newOpt);
  if ([...selectEl.options].some((o) => o.value === previousValue)) {
    selectEl.value = previousValue;
  }
}

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
  let newEventName = null;

  if (isOut) {
    if (eventMode.value === "Event") {
      const sel = $("txEventId").value;
      if (sel === "__new__") {
        newEventName = $("txNewEventName").value.trim();
        if (!newEventName) { showToast("Enter a name for the new event", true); return; }
        eventValue = newEventName;
      } else {
        eventValue = sel || "General";
      }
    } else {
      eventValue = "General";
    }
  } else {
    const sel = $("txEventIdIn").value;
    if (sel === "__new__") {
      newEventName = $("txNewEventNameIn").value.trim();
      if (!newEventName) { showToast("Enter a name for the new event", true); return; }
      eventValue = newEventName;
    } else {
      eventValue = sel; // may be "" (none)
    }
  }

  try {
    if (newEventName) {
      await apiPost({ action: "addEvent", event: newEventName });
      EVENTS.push(newEventName);
    }
    await apiPost({
      action: "addTransaction",
      type: txType.value,
      person: $("txPerson").value,
      amount: $("txAmount").value,
      date: $("txDate").value,
      event: eventValue,
      category: isOut ? $("txCategory").value : "",
      notes: $("txNotes").value
    });
    showToast("Transaction saved");
    e.target.reset();
    $("txDate").value = todayISO();
    $("txNewEventName").classList.add("hidden");
    $("txNewEventNameIn").classList.add("hidden");
    populateEventSelect($("txEventId"), false);
    populateEventSelect($("txEventIdIn"), true);
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
  try {
    await apiPost({
      action: "addTransfer",
      from,
      to,
      amount: $("trAmount").value,
      date: $("trDate").value,
      notes: $("trNotes").value
    });
    showToast("Transfer saved");
    e.target.reset();
    $("trDate").value = todayISO();
  } catch (err) {
    showToast(err.message, true);
  }
});
