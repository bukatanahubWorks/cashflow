// BukatanaHUB Cash Flow Tracker — Apps Script backend
// Paste this whole file into Extensions > Apps Script in your Google Sheet,
// then deploy it as a Web App (see README.md for steps).

const SHEET_TRANSACTIONS = 'Transactions';
const SHEET_TRANSFERS = 'Transfers';
const SHEET_EVENTS = 'Events';

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

    switch (body.action) {
      case 'addTransaction':
        addTransaction(body);
        break;
      case 'addTransfer':
        addTransfer(body);
        break;
      case 'addEvent':
        addEvent(body);
        break;
      case 'updateTransaction':
        updateTransaction(body);
        break;
      case 'updateTransfer':
        updateTransfer(body);
        break;
      default:
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
    } else if (name === SHEET_EVENTS) {
      sheet.appendRow(['Timestamp', 'Event', 'Notes']);
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

function updateTransaction(body) {
  if (!body.row) throw new Error('Missing row number');
  const sheet = getSheet(SHEET_TRANSACTIONS);
  sheet.getRange(body.row, 2, 1, 7).setValues([[
    body.date,
    body.type,
    body.person,
    Number(body.amount),
    body.event || '',
    body.category || '',
    body.notes || ''
  ]]);
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

function updateTransfer(body) {
  if (!body.row) throw new Error('Missing row number');
  const sheet = getSheet(SHEET_TRANSFERS);
  sheet.getRange(body.row, 2, 1, 5).setValues([[
    body.date,
    body.from,
    body.to,
    Number(body.amount),
    body.notes || ''
  ]]);
}

function addEvent(body) {
  if (!body.event) throw new Error('Missing event name');
  const sheet = getSheet(SHEET_EVENTS);
  sheet.appendRow([new Date(), String(body.event).trim(), body.notes || '']);
}

function getAllData() {
  const transactions = rowsToObjects(getSheet(SHEET_TRANSACTIONS).getDataRange().getValues());
  const transfers = rowsToObjects(getSheet(SHEET_TRANSFERS).getDataRange().getValues());
  const eventRows = rowsToObjects(getSheet(SHEET_EVENTS).getDataRange().getValues());

  // Events list = anything explicitly created, plus any event tag already
  // used on a transaction (covers data logged before this feature existed).
  const eventNames = new Set();
  eventRows.forEach((r) => { if (r.Event) eventNames.add(String(r.Event).trim()); });
  transactions.forEach((t) => {
    const ev = (t.Event || '').trim();
    if (ev && ev !== 'General') eventNames.add(ev);
  });

  return { transactions, transfers, events: Array.from(eventNames).sort() };
}

function rowsToObjects(values) {
  if (values.length < 2) return [];
  const headers = values[0];
  const result = [];
  for (let i = 1; i < values.length; i++) {
    const r = values[i];
    if (r.join('') === '') continue;
    const obj = { _row: i + 1 }; // actual sheet row number, used for edits
    headers.forEach((h, j) => {
      let val = r[j];
      if (val instanceof Date) {
        val = Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      }
      obj[h] = val;
    });
    result.push(obj);
  }
  return result;
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
