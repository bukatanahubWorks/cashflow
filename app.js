// ===== Data source (Apps Script Web App URL) =====
// Stored in this browser only (localStorage), never committed to the repo.
const STORAGE_KEY = "bukatanahub_api_url";

function getApiUrl() {
  return localStorage.getItem(STORAGE_KEY) || "";
}

function setApiUrl(url) {
  localStorage.setItem(STORAGE_KEY, url.trim());
}

function initSettings() {
  const dialog = document.getElementById("settingsDialog");
  const btn = document.getElementById("settingsBtn");
  const input = document.getElementById("apiUrlInput");
  const cancelBtn = document.getElementById("cancelSettings");
  const form = document.getElementById("settingsForm");
  if (!dialog) return;

  btn.addEventListener("click", () => {
    input.value = getApiUrl();
    dialog.showModal();
  });
  cancelBtn.addEventListener("click", (e) => {
    e.preventDefault();
    dialog.close();
  });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!input.value.trim()) return;
    setApiUrl(input.value);
    dialog.close();
    location.reload();
  });

  if (!getApiUrl()) {
    input.value = "";
    dialog.showModal();
  }
}

// ===== API helpers =====
async function apiGet() {
  const url = getApiUrl();
  if (!url) throw new Error("Connect your Google Sheet first (⚙ button, top right).");
  const res = await fetch(`${url}?action=getData`);
  if (!res.ok) throw new Error("Could not reach the Sheet. Check the data source URL.");
  return res.json();
}

async function apiPost(payload) {
  const url = getApiUrl();
  if (!url) throw new Error("Connect your Google Sheet first (⚙ button, top right).");
  const res = await fetch(url, {
    method: "POST",
    // text/plain avoids a CORS preflight that Apps Script doesn't handle well
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error("Could not reach the Sheet. Check the data source URL.");
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "Something went wrong saving this.");
  return data;
}

// ===== Small utilities =====
function todayISO() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().split("T")[0];
}

function showToast(msg, isError) {
  const el = document.getElementById("toast");
  if (!el) { alert(msg); return; }
  el.textContent = msg;
  el.className = "toast show" + (isError ? " error" : "");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => { el.className = "toast"; }, 3200);
}

document.addEventListener("DOMContentLoaded", initSettings);
