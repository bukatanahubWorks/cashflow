// BukatanaHUB Cash Flow Tracker — Apps Script backend
// Paste this whole file into Extensions > Apps Script in your Google Sheet,
// then deploy it as a Web App (see README.md for steps).

const SHEET_TRANSACTIONS = 'Transactions';
const SHEET_TRANSFERS = 'Transfers';

// Optional lightweight check — see the "Optional: light protection" note
// in README.md before enabling this. Leave blank to disable.
const SHARED_PIN = '';

function doGet(e) {
  const action = (e.parameter.action || 'getData');
  if (action === 'getData') {
    return jsonResponse(getAllData());
  }
  return jsonResponse({ error: 'Unknown action' });
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);

    if (SHARED_PIN && body.pin !== SHARED_PIN) {
      return jsonResponse({ success: false, error: 'Invalid PIN' });
    }

    if (body.action === 'addTransaction') {
      addTransaction(body);
    } else if (body.action === 'addTransfer') {
      addTransfer(body);
    } else {
      return jsonResponse({ success: false, error: 'Unknown action' });
    }
    return jsonResponse({ success: true });
  } catch (err) {
    return jsonResponse({ success: false, error: err.message });
  }
}

function getSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (name === SHEET_TRANSACTIONS) {
      sheet.appendRow(['Timestamp', 'Date', 'Type', 'Person', 'Amount', 'Event', 'Category', 'Notes']);
    } else if (name === SHEET_TRANSFERS) {
      sheet.appendRow(['Timestamp', 'Date', 'From', 'To', 'Amount', 'Notes']);
    }
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function addTransaction(body) {
  if (!body.person || !body.amount || !body.date || !body.type) {
    throw new Error('Missing required fields');
  }
  const sheet = getSheet(SHEET_TRANSACTIONS);
  sheet.appendRow([
    new Date(),
    body.date,
    body.type,
    body.person,
    Number(body.amount),
    body.event || '',
    body.category || '',
    body.notes || ''
  ]);
}

function addTransfer(body) {
  if (!body.from || !body.to || !body.amount || !body.date) {
    throw new Error('Missing required fields');
  }
  const sheet = getSheet(SHEET_TRANSFERS);
  sheet.appendRow([
    new Date(),
    body.date,
    body.from,
    body.to,
    Number(body.amount),
    body.notes || ''
  ]);
}

function getAllData() {
  const transactions = rowsToObjects(getSheet(SHEET_TRANSACTIONS).getDataRange().getValues());
  const transfers = rowsToObjects(getSheet(SHEET_TRANSFERS).getDataRange().getValues());
  return { transactions, transfers };
}

function rowsToObjects(values) {
  if (values.length < 2) return [];
  const headers = values[0];
  return values
    .slice(1)
    .filter((r) => r.join('') !== '')
    .map((r) => {
      const obj = {};
      headers.forEach((h, i) => {
        let val = r[i];
        if (val instanceof Date) {
          val = Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
        }
        obj[h] = val;
      });
      return obj;
    });
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
