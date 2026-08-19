// Non-sensitive settings — safe to keep in this public file.
// The Google Sheet connection URL is entered in-app (⚙ button) and
// stored only in your browser, not here. See README.md.

const PEOPLE = ["Veikko", "Adhi", "Freddy", "Ipin", "Emeh"];

const CATEGORIES = ["Food", "Workers", "Cleaning", "Maintenance", "Others"];

const CURRENCY = "Rp"; // change to your currency symbol

function formatCurrency(amount) {
  const n = Number(amount) || 0;
  const sign = n < 0 ? "-" : "";
  return sign + CURRENCY + " " + Math.abs(n).toLocaleString("id-ID", { maximumFractionDigits: 0 });
}
