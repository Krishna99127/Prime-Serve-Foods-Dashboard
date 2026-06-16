/**
 * Prime Serve Foods Dashboard Google Sheets Backend Script
 * 
 * Instructions:
 * 1. Create a new Google Sheet (or open an existing one).
 * 2. Go to Extensions -> Apps Script.
 * 3. Delete any default code and paste this script.
 * 4. Click the Save icon (floppy disk).
 * 5. Click Deploy -> New deployment.
 * 6. Click the gear icon next to "Select type" and choose "Web app".
 * 7. Set:
 *    - Description: "Prime Serve Foods Dashboard API"
 *    - Execute as: "Me"
 *    - Who has access: "Anyone" (Required for the dashboard to connect without OAuth popups).
 * 8. Click "Deploy".
 * 9. Authorize the permissions (Google will show a warning because it's your own script; click "Advanced" and "Go to Untitled project (unsafe)").
 * 10. Copy the "Web app URL" and paste it into the Settings tab of your Dashboard.
 */

// Headers for each sheet
var HEADERS = {
  "Products": ["id", "name", "category", "unit", "reorder_level", "cost_price", "sell_price", "hsn", "gst_rate"],
  "Vendors": ["id", "name", "phone", "email", "address", "gstin", "state"],
  "Customers": ["id", "name", "phone", "email", "address", "gstin", "state"],
  "Purchases": ["id", "date", "vendor", "product", "quantity", "rate", "taxable_value", "gst_rate", "cgst", "sgst", "igst", "total", "payment_status", "gst_billing"],
  "Sales": ["id", "date", "customer", "product", "quantity", "cost_rate", "cost_total", "rate", "taxable_value", "gst_rate", "cgst", "sgst", "igst", "total", "payment_status", "gst_billing"],
  "Payments": ["id", "date", "party_type", "party_name", "amount", "payment_method", "reference"]
};

// Initialize the spreadsheet with tabs and headers if they don't exist
function initSpreadsheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  for (var sheetName in HEADERS) {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(HEADERS[sheetName]);
      // Format headers
      var range = sheet.getRange(1, 1, 1, HEADERS[sheetName].length);
      range.setFontWeight("bold");
      range.setBackground("#e8f5e9");
      sheet.setFrozenRows(1);
    }
  }
}

// GET request handler: returns all data in the spreadsheet as JSON
function doGet(e) {
  try {
    initSpreadsheet();
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var data = {};
    
    for (var sheetName in HEADERS) {
      var sheet = ss.getSheetByName(sheetName);
      var rows = sheet.getDataRange().getValues();
      var headers = rows[0];
      var list = [];
      
      for (var i = 1; i < rows.length; i++) {
        var row = rows[i];
        var item = {};
        var hasData = false;
        
        for (var j = 0; j < headers.length; j++) {
          var val = row[j];
          // Format date columns to YYYY-MM-DD
          if (headers[j] === "date" && val instanceof Date) {
            val = Utilities.formatDate(val, Session.getScriptTimeZone(), "yyyy-MM-dd");
          }
          item[headers[j]] = val;
          if (val !== "" && val !== null && val !== undefined) {
            hasData = true;
          }
        }
        if (hasData) {
          list.push(item);
        }
      }
      data[sheetName.toLowerCase()] = list;
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success", data: data }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// POST request handler: appends or updates rows
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    // Wait up to 30 seconds for lock to release
    lock.waitLock(30000);
    
    initSpreadsheet();
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    var postData;
    if (e.postData && e.postData.contents) {
      try {
        postData = JSON.parse(e.postData.contents);
      } catch (err) {
        postData = e.parameter;
      }
    } else {
      postData = e.parameter;
    }
    
    var action = postData.action;
    var payload = postData.data;
    
    if (!action || !payload) {
      throw new Error("Missing action or data in request.");
    }
    
    var sheetMapping = {
      "addProduct": "Products",
      "addVendor": "Vendors",
      "addCustomer": "Customers",
      "addPurchase": "Purchases",
      "addSale": "Sales",
      "addPayment": "Payments"
    };
    
    var sheetName = sheetMapping[action];
    if (!sheetName) {
      // Custom actions like bulk importing
      if (action === "bulkSync") {
        for (var targetSheet in payload) {
          var sheet = ss.getSheetByName(targetSheet);
          if (sheet) {
            // Keep header, clear data
            var lastRow = sheet.getLastRow();
            if (lastRow > 1) {
              sheet.deleteRows(2, lastRow - 1);
            }
            var sheetHeaders = sheet.getDataRange().getValues()[0];
            var rowsData = payload[targetSheet];
            for (var i = 0; i < rowsData.length; i++) {
              var rowData = rowsData[i];
              var rowValues = [];
              for (var j = 0; j < sheetHeaders.length; j++) {
                rowValues.push(rowData[sheetHeaders[j]] || "");
              }
              sheet.appendRow(rowValues);
            }
          }
        }
        return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Bulk sync complete" }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      
      // Update Payment Status
      if (action === "updatePaymentStatus") {
        var type = payload.type; // "sales" or "purchases"
        var id = payload.id;
        var status = payload.status; // "Clear" or "Pending"
        
        var targetSheet = ss.getSheetByName(type === "sales" ? "Sales" : "Purchases");
        var rows = targetSheet.getDataRange().getValues();
        var sheetHeaders = rows[0];
        
        var idColIndex = sheetHeaders.indexOf("id");
        var statusColIndex = sheetHeaders.indexOf("payment_status");
        
        if (idColIndex !== -1 && statusColIndex !== -1) {
          for (var i = 1; i < rows.length; i++) {
            if (rows[i][idColIndex] === id) {
              targetSheet.getRange(i + 1, statusColIndex + 1).setValue(status);
            }
          }
        }
        
        return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Payment status updated" }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      
      throw new Error("Invalid action: " + action);
    }
    
    var sheet = ss.getSheetByName(sheetName);
    var rows = sheet.getDataRange().getValues();
    var sheetHeaders = rows[0];
    var idColIndex = sheetHeaders.indexOf("id");
    
    var items = Array.isArray(payload) ? payload : [payload];
    
    if (sheetName === "Purchases" || sheetName === "Sales") {
      // For multi-item transactions, clean existing entries by ID first, then append all new entries
      if (items.length > 0 && items[0].id && idColIndex !== -1) {
        var targetId = items[0].id;
        // Go backwards to preserve index ordering while deleting rows
        for (var i = rows.length - 1; i >= 1; i--) {
          if (rows[i][idColIndex] === targetId) {
            sheet.deleteRow(i + 1);
          }
        }
      }
      
      for (var k = 0; k < items.length; k++) {
        var item = items[k];
        var rowValues = [];
        for (var i = 0; i < sheetHeaders.length; i++) {
          var val = item[sheetHeaders[i]];
          if (val === undefined || val === null) {
            val = "";
          }
          rowValues.push(val);
        }
        sheet.appendRow(rowValues);
      }
    } else {
      // For other entities (Products, Vendors, Customers, Payments), do standard in-place update or append
      var existingRowIdx = -1;
      var singlePayload = items[0];
      if (singlePayload.id && idColIndex !== -1) {
        for (var i = 1; i < rows.length; i++) {
          if (rows[i][idColIndex] === singlePayload.id) {
            existingRowIdx = i + 1;
            break;
          }
        }
      }
      
      var rowValues = [];
      for (var i = 0; i < sheetHeaders.length; i++) {
        var val = singlePayload[sheetHeaders[i]];
        if (val === undefined || val === null) {
          val = "";
        }
        rowValues.push(val);
      }
      
      if (existingRowIdx !== -1) {
        // Update existing row
        sheet.getRange(existingRowIdx, 1, 1, sheetHeaders.length).setValues([rowValues]);
      } else {
        // Append new row
        sheet.appendRow(rowValues);
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Data saved successfully" }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
