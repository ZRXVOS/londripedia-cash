/**
 * Google Apps Script untuk LondriPediaCash - Multi Outlet Version
 *
 * SETUP INSTRUCTIONS:
 * 1. Buat Google Spreadsheet baru
 * 2. Buat 2 sheets dengan nama: "LondriPedia" dan "Monyonyo"
 * 3. Setiap sheet harus punya header di row 1:
 *    ID | Outlet | Timestamp | Date | Amount | OriginalAmount | Note | EditReason | EditedBy | EditedAt | InputBy | Validated | Transferred | TransferDate
 * 4. Buka Extensions > Apps Script
 * 5. Copy-paste code ini
 * 6. Deploy sebagai Web App
 * 7. Copy URL deployment dan masukkan ke CONFIG.GOOGLE_SHEETS_API_URL di index.html
 */

// Configuration
const SHEET_NAMES = {
  LONDRIPEDIA: 'LondriPedia',
  MONYONYO: 'Monyonyo'
};

const TRANSFER_SHEET_NAME = 'TransferHistory';

// Helper function to get sheet by outlet name
function getSheetByOutlet(outlet) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = outlet === 'LondriPedia' ? SHEET_NAMES.LONDRIPEDIA : SHEET_NAMES.MONYONYO;
  let sheet = ss.getSheetByName(sheetName);

  // Create sheet if doesn't exist
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    // Add headers
    sheet.appendRow([
      'ID', 'Outlet', 'Timestamp', 'Date', 'Amount', 'OriginalAmount',
      'Note', 'EditReason', 'EditedBy', 'EditedAt', 'InputBy',
      'Validated', 'Transferred', 'TransferDate'
    ]);
  }

  return sheet;
}

// Helper function to get transfer history sheet
function getTransferSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(TRANSFER_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(TRANSFER_SHEET_NAME);
    sheet.appendRow(['ID', 'Outlet', 'Date', 'Count', 'Total', 'PeriodFrom', 'PeriodTo', 'Note']);
  }

  return sheet;
}

// GET handler
function doGet(e) {
  const action = e.parameter.action;

  try {
    if (action === 'health_check') {
      return ContentService
        .createTextOutput(JSON.stringify({ success: true, message: 'API is running' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'get_all_data') {
      const allData = getAllData();
      return ContentService
        .createTextOutput(JSON.stringify({ success: true, data: allData }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ success: false, message: 'Unknown action' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// POST handler
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    Logger.log('Received action: ' + action);
    Logger.log('Data: ' + JSON.stringify(data));

    let result;

    switch(action) {
      case 'add_transaction':
        result = addTransaction(data);
        break;

      case 'validate_transaction':
        result = validateTransaction(data.id);
        break;

      case 'edit_transaction':
        result = editTransaction(data.id, data.newAmount, data.editReason);
        break;

      case 'delete_transaction':
        result = deleteTransaction(data.id);
        break;

      case 'transfer_all':
        result = transferToBank(data.outlet);
        break;

      case 'reset_all_data':
        result = resetAllData();
        break;

      default:
        result = { success: false, message: 'Unknown action: ' + action };
    }

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log('Error: ' + error.toString());
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Add transaction
function addTransaction(data) {
  const outlet = data.outlet || 'LondriPedia';
  const sheet = getSheetByOutlet(outlet);

  // Get next ID (max ID from both sheets + 1)
  const lpSheet = getSheetByOutlet('LondriPedia');
  const mySheet = getSheetByOutlet('Monyonyo');

  const lpMaxId = getMaxId(lpSheet);
  const myMaxId = getMaxId(mySheet);
  const nextId = Math.max(lpMaxId, myMaxId) + 1;

  const timestamp = new Date().toISOString();
  const date = timestamp.split('T')[0];

  sheet.appendRow([
    nextId,                    // ID
    outlet,                    // Outlet
    timestamp,                 // Timestamp
    date,                      // Date
    data.amount,               // Amount
    '',                        // OriginalAmount
    data.note || '',           // Note
    '',                        // EditReason
    '',                        // EditedBy
    '',                        // EditedAt
    'SPV',                     // InputBy
    false,                     // Validated
    false,                     // Transferred
    ''                         // TransferDate
  ]);

  Logger.log('Transaction added: ID ' + nextId + ', Outlet: ' + outlet);
  return { success: true, id: nextId, message: 'Transaction added' };
}

// Get max ID from sheet
function getMaxId(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return 0; // Only headers

  let maxId = 0;
  for (let i = 1; i < data.length; i++) {
    const id = parseInt(data[i][0]);
    if (id > maxId) maxId = id;
  }
  return maxId;
}

// Find transaction row by ID (search both sheets)
function findTransactionRow(id) {
  const sheets = [
    getSheetByOutlet('LondriPedia'),
    getSheetByOutlet('Monyonyo')
  ];

  for (let sheet of sheets) {
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === id) {
        return { sheet: sheet, row: i + 1 };
      }
    }
  }

  return null;
}

// Validate transaction
function validateTransaction(id) {
  const found = findTransactionRow(id);

  if (!found) {
    return { success: false, message: 'Transaction not found' };
  }

  found.sheet.getRange(found.row, 12).setValue(true); // Validated column

  Logger.log('Transaction validated: ID ' + id);
  return { success: true, message: 'Transaction validated' };
}

// Edit transaction
function editTransaction(id, newAmount, editReason) {
  const found = findTransactionRow(id);

  if (!found) {
    return { success: false, message: 'Transaction not found' };
  }

  const sheet = found.sheet;
  const row = found.row;

  // Get original amount if not already set
  const originalAmount = sheet.getRange(row, 6).getValue();
  if (!originalAmount) {
    const currentAmount = sheet.getRange(row, 5).getValue();
    sheet.getRange(row, 6).setValue(currentAmount); // Set OriginalAmount
  }

  // Update values
  sheet.getRange(row, 5).setValue(newAmount);           // Amount
  sheet.getRange(row, 8).setValue(editReason);          // EditReason
  sheet.getRange(row, 9).setValue('Owner');             // EditedBy
  sheet.getRange(row, 10).setValue(new Date().toISOString()); // EditedAt
  sheet.getRange(row, 12).setValue(true);               // Validated

  Logger.log('Transaction edited: ID ' + id + ', New amount: ' + newAmount);
  return { success: true, message: 'Transaction edited and validated' };
}

// Delete transaction
function deleteTransaction(id) {
  const found = findTransactionRow(id);

  if (!found) {
    return { success: false, message: 'Transaction not found' };
  }

  found.sheet.deleteRow(found.row);

  Logger.log('Transaction deleted: ID ' + id);
  return { success: true, message: 'Transaction deleted' };
}

// Transfer to bank (for specific outlet)
function transferToBank(outlet) {
  const sheet = outlet ? getSheetByOutlet(outlet) : null;

  if (!sheet && outlet) {
    return { success: false, message: 'Invalid outlet' };
  }

  // Get validated but not transferred transactions
  const data = sheet.getDataRange().getValues();
  let count = 0;

  for (let i = 1; i < data.length; i++) {
    const validated = data[i][11]; // Validated
    const transferred = data[i][12]; // Transferred

    if (validated && !transferred) {
      sheet.getRange(i + 1, 13).setValue(true); // Transferred
      sheet.getRange(i + 1, 14).setValue(new Date().toISOString().split('T')[0]); // TransferDate
      count++;
    }
  }

  // Add to transfer history
  if (count > 0) {
    const transferSheet = getTransferSheet();
    const transferId = transferSheet.getLastRow(); // Simple ID
    const total = 0; // Calculate if needed

    transferSheet.appendRow([
      transferId,
      outlet,
      new Date().toISOString().split('T')[0],
      count,
      total,
      '',
      '',
      'Transfer ke rekening bank - ' + outlet
    ]);
  }

  Logger.log('Transfer completed: ' + count + ' transactions from ' + outlet);
  return { success: true, count: count, message: 'Transfer completed' };
}

// Get all data
function getAllData() {
  const lpSheet = getSheetByOutlet('LondriPedia');
  const mySheet = getSheetByOutlet('Monyonyo');
  const transferSheet = getTransferSheet();

  const transactions = [
    ...getTransactionsFromSheet(lpSheet),
    ...getTransactionsFromSheet(mySheet)
  ];

  const transfers = getTransfersFromSheet(transferSheet);

  // Get max ID
  const maxId = Math.max(
    ...transactions.map(t => t.id),
    0
  );

  return {
    transactions: transactions,
    transfers: transfers,
    lastId: maxId
  };
}

// Get transactions from specific sheet
function getTransactionsFromSheet(sheet) {
  const data = sheet.getDataRange().getValues();
  const transactions = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    transactions.push({
      id: row[0],
      outlet: row[1],
      timestamp: row[2],
      date: row[3],
      amount: row[4],
      originalAmount: row[5] || null,
      note: row[6],
      editReason: row[7] || null,
      editedBy: row[8] || null,
      editedAt: row[9] || null,
      inputBy: row[10],
      validated: row[11],
      transferred: row[12],
      transferDate: row[13] || null
    });
  }

  return transactions;
}

// Get transfers from sheet
function getTransfersFromSheet(sheet) {
  const data = sheet.getDataRange().getValues();
  const transfers = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    transfers.push({
      id: row[0],
      outlet: row[1],
      date: row[2],
      count: row[3],
      total: row[4],
      periodFrom: row[5],
      periodTo: row[6],
      note: row[7]
    });
  }

  return transfers;
}

// Reset all data
function resetAllData() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Clear LondriPedia sheet
    const lpSheet = ss.getSheetByName(SHEET_NAMES.LONDRIPEDIA);
    if (lpSheet) {
      lpSheet.clear();
      lpSheet.appendRow([
        'ID', 'Outlet', 'Timestamp', 'Date', 'Amount', 'OriginalAmount',
        'Note', 'EditReason', 'EditedBy', 'EditedAt', 'InputBy',
        'Validated', 'Transferred', 'TransferDate'
      ]);
    }

    // Clear Monyonyo sheet
    const mySheet = ss.getSheetByName(SHEET_NAMES.MONYONYO);
    if (mySheet) {
      mySheet.clear();
      mySheet.appendRow([
        'ID', 'Outlet', 'Timestamp', 'Date', 'Amount', 'OriginalAmount',
        'Note', 'EditReason', 'EditedBy', 'EditedAt', 'InputBy',
        'Validated', 'Transferred', 'TransferDate'
      ]);
    }

    // Clear Transfer History
    const transferSheet = ss.getSheetByName(TRANSFER_SHEET_NAME);
    if (transferSheet) {
      transferSheet.clear();
      transferSheet.appendRow(['ID', 'Outlet', 'Date', 'Count', 'Total', 'PeriodFrom', 'PeriodTo', 'Note']);
    }

    Logger.log('All data reset');
    return { success: true, message: 'All data has been reset' };

  } catch (error) {
    Logger.log('Reset error: ' + error.toString());
    return { success: false, message: error.toString() };
  }
}
