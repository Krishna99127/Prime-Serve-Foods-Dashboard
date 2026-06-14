// INITIAL DATABASE STATE (EMPTY CANVAS)
const INITIAL_DATA = {
  "products": [],
  "vendors": [],
  "customers": [],
  "purchases": [],
  "sales": [],
  "payments": [],
  "cashbook": []
};

// App State
let state = {
  products: [],
  vendors: [],
  customers: [],
  purchases: [],
  sales: [],
  payments: [],
  settings: {
    sheetUrl: "https://script.google.com/macros/s/AKfycbw7ztHFjwYQodC_ij_Up3gl8FL5uhr6ZNE5pQZWWFQyTkuEDvePkWzPeqadhxHSOmvxkQ/exec",
    syncEnabled: true
  }
};

// Charts references
let salesPurchasesChart = null;
let productShareChart = null;

// Initialize the Application
window.addEventListener("DOMContentLoaded", async () => {
  // Load State from LocalStorage or Initial empty data
  loadState();
  
  // Initialize Lucide Icons
  lucide.createIcons();
  
  // Set current date in header
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  document.getElementById("current-date").textContent = new Date().toLocaleDateString('en-US', options);
  
  // Register Tab Navigation Event Listeners
  document.querySelectorAll(".menu-item").forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const tabId = item.getAttribute("data-tab");
      switchTab(tabId);
    });
  });
  
  // Quick Log Transaction button in header
  document.getElementById("quick-action-btn").addEventListener("click", () => {
    openModal("modal-quick-transaction");
  });
  
  // Tab Action buttons event listeners
  const addProdBtn = document.getElementById("add-product-btn");
  if (addProdBtn) {
    addProdBtn.addEventListener("click", () => {
      openModal("modal-product");
      document.getElementById("modal-product-title").textContent = "Add New Product";
      document.getElementById("prod-form-id").value = "";
      document.getElementById("form-product").reset();
    });
  }
  
  const addVndBtn = document.getElementById("add-vendor-btn");
  if (addVndBtn) {
    addVndBtn.addEventListener("click", () => {
      openModal("modal-vendor");
      document.getElementById("form-vendor").reset();
    });
  }
  
  const addCstBtn = document.getElementById("add-customer-btn");
  if (addCstBtn) {
    addCstBtn.addEventListener("click", () => {
      openModal("modal-customer");
      document.getElementById("form-customer").reset();
    });
  }
  
  const logPurBtn = document.getElementById("log-purchase-btn");
  if (logPurBtn) {
    logPurBtn.addEventListener("click", () => {
      openModal("modal-purchase");
      document.getElementById("pur-form-id").value = "";
      document.getElementById("modal-purchase-title").textContent = "Log Purchase (Inward Inventory)";
      document.getElementById("pur-form-date").value = new Date().toISOString().substring(0,10);
      document.getElementById("form-purchase").reset();
      document.getElementById("pur-gst-info").classList.add("hidden");
      document.getElementById("pur-calc-taxable").textContent = "₹0.00";
      document.getElementById("pur-calc-cgst").textContent = "₹0.00";
      document.getElementById("pur-calc-sgst").textContent = "₹0.00";
      document.getElementById("pur-calc-igst").textContent = "₹0.00";
      document.getElementById("pur-calc-total-display").textContent = "₹0.00";
    });
  }
  
  const logSalBtn = document.getElementById("log-sale-btn");
  if (logSalBtn) {
    logSalBtn.addEventListener("click", () => {
      openModal("modal-sale");
      document.getElementById("sale-form-id").value = "";
      document.getElementById("modal-sale-title").textContent = "Log Customer Sale (Outward Inventory)";
      document.getElementById("sale-form-date").value = new Date().toISOString().substring(0,10);
      document.getElementById("form-sale").reset();
      document.getElementById("sale-gst-info").classList.add("hidden");
      document.getElementById("sale-calc-taxable").textContent = "₹0.00";
      document.getElementById("sale-calc-cgst").textContent = "₹0.00";
      document.getElementById("sale-calc-sgst").textContent = "₹0.00";
      document.getElementById("sale-calc-igst").textContent = "₹0.00";
      document.getElementById("sale-calc-total-display").textContent = "₹0.00";
      document.getElementById("sale-stock-warning").classList.add("hidden");
    });
  }
  
  const recPmtBtn = document.getElementById("record-payment-btn");
  if (recPmtBtn) {
    recPmtBtn.addEventListener("click", () => {
      openModal("modal-payment");
      document.getElementById("pmt-form-date").value = new Date().toISOString().substring(0,10);
      document.getElementById("form-payment").reset();
      updatePaymentPartyDropdown();
    });
  }
  
  // If Sync Enabled, fetch fresh data from Google Sheet
  if (state.settings.syncEnabled && state.settings.sheetUrl) {
    await fetchFromGoogleSheet();
  } else {
    recalculateAndRender();
  }
  
  // Bind form submissions
  setupFormHandlers();
  setupFilterHandlers();
});

// Load state from localStorage or fallback to initial empty data
function loadState() {
  const forceReset = !localStorage.getItem("psf_db_cleared_v1");
  const savedState = localStorage.getItem("psf_dashboard_state");
  
  if (savedState && !forceReset) {
    try {
      state = JSON.parse(savedState);
    } catch (e) {
      console.error("Error parsing saved state, resetting...", e);
      resetToExcelState();
    }
  } else {
    resetToExcelState();
  }
}

function resetToExcelState() {
  state.products = INITIAL_DATA.products || [];
  state.vendors = INITIAL_DATA.vendors || [];
  state.customers = INITIAL_DATA.customers || [];
  state.purchases = INITIAL_DATA.purchases || [];
  state.sales = INITIAL_DATA.sales || [];
  state.payments = [];
  state.settings = {
    sheetUrl: "https://script.google.com/macros/s/AKfycbw7ztHFjwYQodC_ij_Up3gl8FL5uhr6ZNE5pQZWWFQyTkuEDvePkWzPeqadhxHSOmvxkQ/exec",
    syncEnabled: true
  };
  saveStateLocal();
  localStorage.setItem("psf_db_cleared_v1", "true");
}

// Save state to localStorage
function saveStateLocal() {
  localStorage.setItem("psf_dashboard_state", JSON.stringify(state));
}

// Switch visible tabs
function switchTab(tabId) {
  // Update Active Menu Item
  document.querySelectorAll(".menu-item").forEach(item => {
    if (item.getAttribute("data-tab") === tabId) {
      item.classList.add("active");
    } else {
      item.classList.remove("active");
    }
  });
  
  // Update Page Title
  const titles = {
    dashboard: "Dashboard Overview",
    products: "Product Catalog",
    vendors: "Manage Vendors",
    customers: "Manage Customers",
    purchases: "Purchase Orders (Inward)",
    sales: "Sales Transactions (Outward)",
    payments: "Payment History",
    custledgers: "Customer Ledgers",
    vendledgers: "Vendor Ledgers",
    cashbookledger: "Cash Book & General Ledger",
    balancesheet: "Balance Sheet Statement",
    settings: "Google Sheets Sync Settings"
  };
  document.getElementById("page-title").textContent = titles[tabId] || "Dashboard";
  
  // Update Active Tab Content
  document.querySelectorAll(".tab-content").forEach(content => {
    if (content.id === `tab-${tabId}`) {
      content.classList.add("active");
    } else {
      content.classList.remove("active");
    }
  });
  
  // Trigger special page renderers
  if (tabId === "dashboard") {
    renderOverviewCharts();
  } else if (tabId === "custledgers") {
    renderCustomerLedger();
  } else if (tabId === "vendledgers") {
    renderVendorLedger();
  } else if (tabId === "cashbookledger") {
    renderGlLedger();
  } else if (tabId === "balancesheet") {
    renderBalanceSheet();
  }
}

// Recalculate Stock & Balances, then redraw Tables
function recalculateAndRender() {
  computeStockInHand();
  renderProductsTable();
  renderVendorsTable();
  renderCustomersTable();
  renderPurchasesTable();
  renderSalesTable();
  renderPaymentsTable();
  renderRecentTransactions();
  renderOverviewCharts();
  populateDropdowns();
  updateSyncStatus();
}

// Update Connection Status Banner
function updateSyncStatus() {
  const dot = document.getElementById("connection-status-dot");
  const text = document.getElementById("connection-status-text");
  const pushBtn = document.getElementById("push-data-btn");
  
  if (state.settings.syncEnabled && state.settings.sheetUrl) {
    dot.className = "status-indicator online";
    text.textContent = "Google Sheets Synced";
    pushBtn.removeAttribute("disabled");
  } else {
    dot.className = "status-indicator offline";
    text.textContent = "Local Demo Mode";
    pushBtn.setAttribute("disabled", "true");
  }
  
  // Fill inputs
  document.getElementById("settings-sheet-url").value = state.settings.sheetUrl || "";
  document.getElementById("settings-sync-enabled").checked = state.settings.syncEnabled || false;
}

// Recalculate real-time stock level for each product
function computeStockInHand() {
  state.products.forEach(p => {
    let stock = 0;
    
    // Add Purchases
    state.purchases.forEach(pur => {
      if (pur.product.toLowerCase() === p.name.toLowerCase()) {
        stock += pur.quantity;
      }
    });
    
    // Subtract Sales
    state.sales.forEach(sal => {
      if (sal.product.toLowerCase() === p.name.toLowerCase()) {
        stock -= sal.quantity;
      }
    });
    
    p.stock = stock;
  });
  
  // Check for Low Stock Alerts
  const lowStockProducts = state.products.filter(p => p.stock < p.reorder_level);
  const alertBanner = document.getElementById("low-stock-alert");
  if (lowStockProducts.length > 0) {
    alertBanner.classList.remove("hidden");
    document.getElementById("low-stock-alert-text").innerHTML = 
      "The following items are below their reorder level: " + 
      lowStockProducts.map(p => `<strong>${p.name} (${p.stock.toFixed(1)} ${p.unit})</strong>`).join(", ");
  } else {
    alertBanner.classList.add("hidden");
  }
}

// ================= RENDER TABLES =================

function renderProductsTable() {
  const tbody = document.getElementById("products-tbody");
  tbody.innerHTML = "";
  
  const searchVal = document.getElementById("search-products").value.toLowerCase();
  const filterCat = document.getElementById("filter-product-cat").value;
  
  let index = 1;
  state.products.forEach(p => {
    if (searchVal && !p.name.toLowerCase().includes(searchVal)) return;
    if (filterCat !== "all") {
      if (filterCat === "coconuts" && p.category.toLowerCase() !== "coconuts") return;
      if (filterCat === "spices" && p.category.toLowerCase() !== "spices/dry fruits") return;
    }
    
    const stockVal = p.stock * p.cost_price;
    const isLow = p.stock < p.reorder_level;
    const gstRateDisplay = p.gst_rate !== undefined ? `${p.gst_rate}%` : '18%';
    
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${index++}</td>
      <td class="font-weight-bold">${p.name}</td>
      <td>${p.category}</td>
      <td>${p.hsn || '-'}</td>
      <td>${gstRateDisplay}</td>
      <td class="${isLow ? 'color-orange font-weight-bold' : ''}">${p.stock.toFixed(1)} ${p.unit} ${isLow ? '⚠️' : ''}</td>
      <td>${p.reorder_level} ${p.unit}</td>
      <td>₹${p.cost_price.toFixed(2)}</td>
      <td>₹${p.sell_price.toFixed(2)}</td>
      <td>₹${stockVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td>
        <button class="btn btn-sm btn-outline" onclick="editProduct('${p.id}')">Edit</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderVendorsTable() {
  const tbody = document.getElementById("vendors-tbody");
  tbody.innerHTML = "";
  
  const searchVal = document.getElementById("search-vendors").value.toLowerCase();
  
  state.vendors.forEach(v => {
    if (searchVal && !v.name.toLowerCase().includes(searchVal)) return;
    
    const outstanding = getVendorOutstanding(v.name);
    
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${v.id}</td>
      <td class="font-weight-bold">${v.name}</td>
      <td>${v.gstin || '-'}</td>
      <td>${v.state || 'Telangana'}</td>
      <td>${v.phone}</td>
      <td>${v.email}</td>
      <td>${v.address}</td>
      <td class="${outstanding > 0 ? 'color-orange font-weight-bold' : ''}">₹${outstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      <td>
        <div style="display: flex; gap: 6px;">
          <button class="btn btn-sm btn-primary" onclick="openPaymentModal('Vendor Payment', '${v.name}')">Pay</button>
          <button class="btn btn-sm btn-outline" onclick="editVendor('${v.id}')">Edit</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderCustomersTable() {
  const tbody = document.getElementById("customers-tbody");
  tbody.innerHTML = "";
  
  const searchVal = document.getElementById("search-customers").value.toLowerCase();
  
  state.customers.forEach(c => {
    if (searchVal && !c.name.toLowerCase().includes(searchVal)) return;
    
    const outstanding = getCustomerOutstanding(c.name);
    
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${c.id}</td>
      <td class="font-weight-bold">${c.name}</td>
      <td>${c.gstin || '-'}</td>
      <td>${c.state || 'Telangana'}</td>
      <td>${c.phone}</td>
      <td>${c.email}</td>
      <td>${c.address}</td>
      <td class="${outstanding > 0 ? 'color-green font-weight-bold' : ''}">₹${outstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      <td>
        <div style="display: flex; gap: 6px;">
          <button class="btn btn-sm btn-primary" onclick="openPaymentModal('Customer Receipt', '${c.name}')">Receipt</button>
          <button class="btn btn-sm btn-outline" onclick="editCustomer('${c.id}')">Edit</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderPurchasesTable() {
  const tbody = document.getElementById("purchases-tbody");
  tbody.innerHTML = "";
  
  const searchVal = document.getElementById("search-purchases").value.toLowerCase();
  const filterVendor = document.getElementById("filter-purchases-vendor").value;
  
  const sorted = [...state.purchases].sort((a, b) => new Date(b.date) - new Date(a.date));
  
  sorted.forEach(p => {
    if (searchVal && !p.product.toLowerCase().includes(searchVal) && !p.vendor.toLowerCase().includes(searchVal)) return;
    if (filterVendor !== "all" && p.vendor !== filterVendor) return;
    
    const badgeClass = p.payment_status === "Clear" ? "badge-paid" : "badge-pending";
    const payButton = p.payment_status === "Pending" 
      ? `<button class="btn btn-sm btn-primary" onclick="openPaymentModal('Vendor Payment', '${p.vendor}', ${p.total}, '${p.id}')">Clear Dues</button>`
      : `<button class="btn btn-sm btn-outline" disabled>Settled</button>`;
    const editButton = `<button class="btn btn-sm btn-outline" onclick="editPurchase('${p.id}')">Edit</button>`;
    const actionCell = `<div style="display: flex; gap: 6px;">${payButton}${editButton}</div>`;
      
    const taxable = p.taxable_value !== undefined ? p.taxable_value : (p.quantity * p.rate);
    const gstRateVal = p.gst_rate !== undefined ? `${p.gst_rate}%` : '-';
    const cgstVal = p.cgst || 0;
    const sgstVal = p.sgst || 0;
    const igstVal = p.igst || 0;
    const gstBilling = p.gst_billing || "With GST";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.id}</td>
      <td>${p.date}</td>
      <td class="font-weight-bold">${p.vendor}</td>
      <td>${p.product}</td>
      <td>${p.quantity}</td>
      <td>₹${p.rate.toFixed(2)}</td>
      <td>₹${taxable.toFixed(2)}</td>
      <td>${gstBilling}</td>
      <td>${gstRateVal}</td>
      <td class="font-weight-bold">₹${p.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      <td><span class="badge ${badgeClass}">${p.payment_status}</span></td>
      <td>${actionCell}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderSalesTable() {
  const tbody = document.getElementById("sales-tbody");
  tbody.innerHTML = "";
  
  const searchVal = document.getElementById("search-sales").value.toLowerCase();
  const filterCust = document.getElementById("filter-sales-customer").value;
  
  const sorted = [...state.sales].sort((a, b) => new Date(b.date) - new Date(a.date));
  
  sorted.forEach(s => {
    if (searchVal && !s.product.toLowerCase().includes(searchVal) && !s.customer.toLowerCase().includes(searchVal)) return;
    if (filterCust !== "all" && s.customer !== filterCust) return;
    
    const profit = s.total - s.cost_total;
    const isLoss = profit < 0;
    
    const badgeClass = s.payment_status === "Clear" ? "badge-paid" : "badge-pending";
    const payButton = s.payment_status === "Pending"
      ? `<button class="btn btn-sm btn-primary" onclick="openPaymentModal('Customer Receipt', '${s.customer}', ${s.total}, '${s.id}')">Collect</button>`
      : `<button class="btn btn-sm btn-outline" disabled>Settled</button>`;
    const editButton = `<button class="btn btn-sm btn-outline" onclick="editSale('${s.id}')">Edit</button>`;
    const actionCell = `<div style="display: flex; gap: 6px;">${payButton}${editButton}</div>`;
      
    const taxable = s.taxable_value !== undefined ? s.taxable_value : (s.quantity * s.rate);
    const gstRateVal = s.gst_rate !== undefined ? `${s.gst_rate}%` : '-';
    const cgstVal = s.cgst || 0;
    const sgstVal = s.sgst || 0;
    const igstVal = s.igst || 0;
    const gstBilling = s.gst_billing || "With GST";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${s.id}</td>
      <td>${s.date}</td>
      <td class="font-weight-bold">${s.customer}</td>
      <td>${s.product}</td>
      <td>${s.quantity}</td>
      <td>₹${s.cost_rate.toFixed(2)}</td>
      <td>₹${s.rate.toFixed(2)}</td>
      <td>₹${taxable.toFixed(2)}</td>
      <td>${gstBilling}</td>
      <td>${gstRateVal}</td>
      <td class="font-weight-bold">₹${s.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      <td class="${isLoss ? 'color-orange' : 'color-green'}">₹${profit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      <td><span class="badge ${badgeClass}">${s.payment_status}</span></td>
      <td>${actionCell}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderPaymentsTable() {
  const tbody = document.getElementById("payments-tbody");
  tbody.innerHTML = "";
  
  const searchVal = document.getElementById("search-payments").value.toLowerCase();
  const filterType = document.getElementById("filter-payment-type").value;
  
  const sorted = [...state.payments].sort((a, b) => new Date(b.date) - new Date(a.date));
  
  sorted.forEach(p => {
    if (searchVal && !p.party_name.toLowerCase().includes(searchVal) && !p.reference.toLowerCase().includes(searchVal)) return;
    if (filterType === "vendor" && p.party_type !== "Vendor Payment") return;
    if (filterType === "customer" && p.party_type !== "Customer Receipt") return;
    
    const isOutflow = p.party_type === "Vendor Payment";
    
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.id}</td>
      <td>${p.date}</td>
      <td class="font-weight-bold ${isOutflow ? 'color-orange' : 'color-green'}">${p.party_type}</td>
      <td>${p.party_name}</td>
      <td class="font-weight-bold">₹${p.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      <td>${p.payment_method}</td>
      <td>${p.reference}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderRecentTransactions() {
  const tbody = document.getElementById("recent-transactions-tbody");
  tbody.innerHTML = "";
  
  const combined = [];
  state.purchases.forEach(p => {
    if (p.vendor.toLowerCase() !== 'opening stock') {
      combined.push({ ...p, txn_type: "Purchase", party: p.vendor });
    }
  });
  state.sales.forEach(s => combined.push({ ...s, txn_type: "Sale", party: s.customer }));
  
  combined.sort((a, b) => new Date(b.date) - new Date(a.date));
  const recent = combined.slice(0, 8);
  
  recent.forEach(txn => {
    const badgeClass = txn.payment_status === "Clear" ? "badge-paid" : "badge-pending";
    const typeColor = txn.txn_type === "Sale" ? "color-green" : "color-orange";
    
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${txn.date}</td>
      <td class="font-weight-bold ${typeColor}">${txn.txn_type}</td>
      <td>${txn.product}</td>
      <td>${txn.party}</td>
      <td>${txn.quantity}</td>
      <td class="font-weight-bold">₹${txn.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      <td><span class="badge ${badgeClass}">${txn.payment_status}</span></td>
    `;
    tbody.appendChild(tr);
  });
  
  let totalSalesVal = state.sales.reduce((sum, s) => sum + s.total, 0);
  let totalPurVal = state.purchases.reduce((sum, p) => p.vendor.toLowerCase() !== 'opening stock' ? sum + p.total : sum, 0);
  let inventoryVal = state.products.reduce((sum, p) => sum + (p.stock * p.cost_price), 0);
  
  let salesProfit = state.sales.reduce((sum, s) => sum + (s.total - s.cost_total), 0);
  let otherExpenses = getGeneralExpensesSum();
  let netProfit = salesProfit - otherExpenses;
  
  let totalPayable = state.vendors.reduce((sum, v) => sum + getVendorOutstanding(v.name), 0);
  
  document.getElementById("kpi-total-sales").textContent = `₹${totalSalesVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  document.getElementById("kpi-total-purchases").textContent = `₹${totalPurVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  document.getElementById("kpi-net-profit").textContent = `₹${netProfit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  document.getElementById("kpi-net-profit").className = `kpi-value ${netProfit >= 0 ? 'color-green' : 'color-orange'}`;
  document.getElementById("kpi-inventory-value").textContent = `₹${inventoryVal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  document.getElementById("kpi-payables").textContent = `₹${totalPayable.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function getVendorOutstanding(vendorName) {
  const totalPurchases = state.purchases.reduce((sum, p) => p.vendor === vendorName ? sum + p.total : sum, 0);
  const totalPaid = state.payments.reduce((sum, p) => p.party_type === "Vendor Payment" && p.party_name === vendorName ? sum + p.amount : sum, 0);
  const clearPurchases = state.purchases.reduce((sum, p) => p.vendor === vendorName && p.payment_status === "Clear" ? sum + p.total : sum, 0);
  const outstanding = totalPurchases - totalPaid - clearPurchases;
  return Math.max(0, outstanding);
}

function getCustomerOutstanding(customerName) {
  const totalSales = state.sales.reduce((sum, s) => s.customer === customerName ? sum + s.total : sum, 0);
  const totalReceived = state.payments.reduce((sum, p) => p.party_type === "Customer Receipt" && p.party_name === customerName ? sum + p.amount : sum, 0);
  const clearSales = state.sales.reduce((sum, s) => s.customer === customerName && s.payment_status === "Clear" ? sum + s.total : sum, 0);
  const outstanding = totalSales - totalReceived - clearSales;
  return Math.max(0, outstanding);
}

function getGeneralExpensesSum() {
  let sum = 0;
  if (INITIAL_DATA.cashbook) {
    INITIAL_DATA.cashbook.forEach(cb => {
      if (cb.debit > 0) {
        const isVendor = state.vendors.some(v => cb.description.toLowerCase().includes(v.name.toLowerCase()));
        if (!isVendor) {
          sum += cb.debit;
        }
      }
    });
  }
  return sum;
}

// ================= SEPARATE LEDGERS ENGINE =================

function renderCustomerLedger() {
  const custName = document.getElementById("cust-ledger-select").value;
  const tbody = document.getElementById("cust-ledger-tbody");
  tbody.innerHTML = "";
  
  if (!custName) {
    document.getElementById("cust-ledger-total-sales").textContent = "₹0";
    document.getElementById("cust-ledger-total-payments").textContent = "₹0";
    document.getElementById("cust-ledger-current-balance").textContent = "₹0";
    return;
  }
  
  let ledgerEntries = [];
  let runningBalance = 0;
  let totalSales = 0;
  let totalPayments = 0;
  
  state.sales.forEach(s => {
    if (s.customer === custName) {
      ledgerEntries.push({
        date: s.date,
        description: `Sales Invoice: ${s.product} (${s.quantity} units)`,
        debit: s.total,
        credit: 0
      });
    }
  });
  
  state.sales.forEach(s => {
    if (s.customer === custName && s.payment_status === "Clear") {
      ledgerEntries.push({
        date: s.date,
        description: `Immediate Payment Received [Cash/UPI]`,
        debit: 0,
        credit: s.total
      });
    }
  });
  
  state.payments.forEach(p => {
    if (p.party_type === "Customer Receipt" && p.party_name === custName) {
      ledgerEntries.push({
        date: p.date,
        description: `Receipt Voucher [Ref: ${p.reference || p.payment_method}]`,
        debit: 0,
        credit: p.amount
      });
    }
  });
  
  ledgerEntries.sort((a, b) => new Date(a.date) - new Date(b.date));
  
  ledgerEntries.forEach(entry => {
    totalSales += entry.debit;
    totalPayments += entry.credit;
    runningBalance += (entry.debit - entry.credit);
    
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${entry.date}</td>
      <td>${entry.description}</td>
      <td>${entry.debit > 0 ? '₹' + entry.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}</td>
      <td>${entry.credit > 0 ? '₹' + entry.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}</td>
      <td class="font-weight-bold">₹${runningBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
    `;
    tbody.appendChild(tr);
  });
  
  document.getElementById("cust-ledger-total-sales").textContent = `₹${totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  document.getElementById("cust-ledger-total-payments").textContent = `₹${totalPayments.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  document.getElementById("cust-ledger-current-balance").textContent = `₹${runningBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

function renderVendorLedger() {
  const vendorName = document.getElementById("vend-ledger-select").value;
  const tbody = document.getElementById("vend-ledger-tbody");
  tbody.innerHTML = "";
  
  if (!vendorName) {
    document.getElementById("vend-ledger-total-payments").textContent = "₹0";
    document.getElementById("vend-ledger-total-purchases").textContent = "₹0";
    document.getElementById("vend-ledger-current-balance").textContent = "₹0";
    return;
  }
  
  let ledgerEntries = [];
  let runningBalance = 0;
  let totalPurchases = 0;
  let totalPayments = 0;
  
  state.purchases.forEach(p => {
    if (p.vendor === vendorName) {
      ledgerEntries.push({
        date: p.date,
        description: `Purchase Invoice: ${p.product} (${p.quantity} units)`,
        debit: 0,
        credit: p.total
      });
    }
  });
  
  state.purchases.forEach(p => {
    if (p.vendor === vendorName && p.payment_status === "Clear") {
      ledgerEntries.push({
        date: p.date,
        description: `Immediate Settle Payment [Cash/UPI]`,
        debit: p.total,
        credit: 0
      });
    }
  });
  
  state.payments.forEach(p => {
    if (p.party_type === "Vendor Payment" && p.party_name === vendorName) {
      ledgerEntries.push({
        date: p.date,
        description: `Payment Voucher [Ref: ${p.reference || p.payment_method}]`,
        debit: p.amount,
        credit: 0
      });
    }
  });
  
  ledgerEntries.sort((a, b) => new Date(a.date) - new Date(b.date));
  
  ledgerEntries.forEach(entry => {
    totalPayments += entry.debit;
    totalPurchases += entry.credit;
    runningBalance += (entry.credit - entry.debit);
    
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${entry.date}</td>
      <td>${entry.description}</td>
      <td>${entry.debit > 0 ? '₹' + entry.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}</td>
      <td>${entry.credit > 0 ? '₹' + entry.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}</td>
      <td class="font-weight-bold">₹${runningBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
    `;
    tbody.appendChild(tr);
  });
  
  document.getElementById("vend-ledger-total-payments").textContent = `₹${totalPayments.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  document.getElementById("vend-ledger-total-purchases").textContent = `₹${totalPurchases.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  document.getElementById("vend-ledger-current-balance").textContent = `₹${runningBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

function renderGlLedger() {
  const account = document.getElementById("gl-ledger-select").value;
  const tbody = document.getElementById("gl-ledger-tbody");
  tbody.innerHTML = "";
  
  let ledgerEntries = [];
  let runningBalance = 0;
  let totalDebit = 0;
  let totalCredit = 0;
  
  if (account === "cashbook") {
    runningBalance = 0;
    
    state.purchases.forEach(p => {
      if (p.payment_status === "Clear") {
        ledgerEntries.push({
          date: p.date,
          description: `Immediate Cash Purchase: ${p.product} (Qty: ${p.quantity})`,
          debit: 0,
          credit: p.total
        });
      }
    });
    
    state.sales.forEach(s => {
      if (s.payment_status === "Clear") {
        ledgerEntries.push({
          date: s.date,
          description: `Immediate Cash Sale: ${s.product} (Qty: ${s.quantity})`,
          debit: s.total,
          credit: 0
        });
      }
    });
    
    state.payments.forEach(p => {
      if (p.party_type === "Vendor Payment") {
        ledgerEntries.push({
          date: p.date,
          description: `Vendor Payment to ${p.party_name} (${p.reference || 'UPI'})`,
          debit: 0,
          credit: p.amount
        });
      } else {
        ledgerEntries.push({
          date: p.date,
          description: `Customer Receipt from ${p.party_name} (${p.reference || 'UPI'})`,
          debit: p.amount,
          credit: 0
        });
      }
    });
    
  } else if (account === "revenue") {
    state.sales.forEach(s => {
      ledgerEntries.push({
        date: s.date,
        description: `Sales Revenue Invoice: ${s.customer} - ${s.product}`,
        debit: s.total,
        credit: 0
      });
    });
    
  } else if (account === "purchases") {
    state.purchases.forEach(p => {
      ledgerEntries.push({
        date: p.date,
        description: `Purchase Expense Invoice: ${p.vendor} - ${p.product}`,
        debit: 0,
        credit: p.total
      });
    });
    
  }
  
  ledgerEntries.sort((a, b) => new Date(a.date) - new Date(b.date));
  runningBalance = 0;
  
  ledgerEntries.forEach(entry => {
    totalDebit += entry.debit;
    totalCredit += entry.credit;
    runningBalance += (entry.debit - entry.credit);
    
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${entry.date}</td>
      <td>${entry.description}</td>
      <td>${entry.debit > 0 ? '₹' + entry.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}</td>
      <td>${entry.credit > 0 ? '₹' + entry.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}</td>
      <td class="font-weight-bold">₹${runningBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
    `;
    tbody.appendChild(tr);
  });
  
  document.getElementById("gl-ledger-total-debit").textContent = `₹${totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  document.getElementById("gl-ledger-total-credit").textContent = `₹${totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  document.getElementById("gl-ledger-current-balance").textContent = `₹${runningBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

// ================= RENDER BALANCE SHEET =================

function renderBalanceSheet() {
  let cashBookVal = 0;
  let totalDebit = 0;
  let totalCredit = 0;
  
  state.purchases.forEach(p => {
    if (p.payment_status === "Clear") {
      totalCredit += p.total;
    }
  });
  state.sales.forEach(s => {
    if (s.payment_status === "Clear") {
      totalDebit += s.total;
    }
  });
  state.payments.forEach(p => {
    if (p.party_type === "Vendor Payment") {
      totalCredit += p.amount;
    } else {
      totalDebit += p.amount;
    }
  });
  
  cashBookVal = totalDebit - totalCredit;
  
  let totalReceivable = state.customers.reduce((sum, c) => sum + getCustomerOutstanding(c.name), 0);
  let closingStockVal = state.products.reduce((sum, p) => sum + (p.stock * p.cost_price), 0);
  
  // GST Input Tax Credit (Asset) and Output Tax Liability (Liability)
  let totalInputGST = state.purchases.reduce((sum, p) => sum + (p.cgst || 0) + (p.sgst || 0) + (p.igst || 0), 0);
  let totalOutputGST = state.sales.reduce((sum, s) => sum + (s.cgst || 0) + (s.sgst || 0) + (s.igst || 0), 0);
  let netGSTPayable = totalOutputGST - totalInputGST;
  
  let gstAssetVal = 0;
  let gstLiabVal = 0;
  
  if (netGSTPayable < 0) {
    gstAssetVal = Math.abs(netGSTPayable);
    document.getElementById("bs-gst-asset-row").style.display = "flex";
    document.getElementById("bs-gst-asset-val").textContent = `₹${gstAssetVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    document.getElementById("bs-gst-liab-row").style.display = "none";
  } else if (netGSTPayable > 0) {
    gstLiabVal = netGSTPayable;
    document.getElementById("bs-gst-asset-row").style.display = "none";
    document.getElementById("bs-gst-liab-row").style.display = "flex";
    document.getElementById("bs-gst-liab-val").textContent = `₹${gstLiabVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  } else {
    document.getElementById("bs-gst-asset-row").style.display = "none";
    document.getElementById("bs-gst-liab-row").style.display = "none";
  }
  
  let totalAssets = cashBookVal + totalReceivable + closingStockVal + gstAssetVal;
  
  let totalPayables = state.vendors.reduce((sum, v) => sum + getVendorOutstanding(v.name), 0);
  let totalLiabilities = totalPayables + gstLiabVal;
  
  let salesProfit = state.sales.reduce((sum, s) => sum + ((s.taxable_value || s.total) - s.cost_total), 0);
  let otherExpenses = getGeneralExpensesSum();
  let netProfit = salesProfit - otherExpenses;
  
  let ownersCapital = 120000;
  let totalEquity = ownersCapital + netProfit;
  let totalLiabEquity = totalLiabilities + totalEquity;
  
  document.getElementById("bs-cash-val").textContent = `₹${cashBookVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  document.getElementById("bs-receivables-val").textContent = `₹${totalReceivable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  document.getElementById("bs-stock-val").textContent = `₹${closingStockVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  document.getElementById("bs-total-current-assets").textContent = `₹${totalAssets.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  document.getElementById("bs-total-assets").textContent = `₹${totalAssets.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  
  document.getElementById("bs-payables-val").textContent = `₹${totalPayables.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  document.getElementById("bs-total-liabilities").textContent = `₹${totalLiabilities.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  
  document.getElementById("bs-retained-earnings-val").textContent = `₹${netProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  document.getElementById("bs-retained-earnings-val").className = `bs-val ${netProfit >= 0 ? 'color-green' : 'color-orange'}`;
  document.getElementById("bs-total-equity").textContent = `₹${totalEquity.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  document.getElementById("bs-total-liabilities-equity").textContent = `₹${totalLiabEquity.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  
  document.getElementById("bs-eq-assets").textContent = totalAssets.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  document.getElementById("bs-eq-liab-equity").textContent = totalLiabEquity.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

// ================= OVERVIEW CHARTS =================

function renderOverviewCharts() {
  const ctx1 = document.getElementById("salesPurchasesChart");
  if (!ctx1) return;
  
  let maySales = 0, junSales = 0;
  let mayPurchases = 0, junPurchases = 0;
  
  state.sales.forEach(s => {
    const m = new Date(s.date).getMonth();
    if (m === 4) maySales += s.total;
    if (m === 5) junSales += s.total;
  });
  
  state.purchases.forEach(p => {
    const m = new Date(p.date).getMonth();
    if (m === 4) mayPurchases += p.total;
    if (m === 5) junPurchases += p.total;
  });
  
  if (salesPurchasesChart) salesPurchasesChart.destroy();
  
  salesPurchasesChart = new Chart(ctx1, {
    type: 'bar',
    data: {
      labels: ['May 2026', 'June 2026'],
      datasets: [
        {
          label: 'Sales Inflow',
          data: [maySales, junSales],
          backgroundColor: '#7ed957',
          borderColor: '#4caf50',
          borderWidth: 1,
          borderRadius: 6
        },
        {
          label: 'Purchases Outflow',
          data: [mayPurchases, junPurchases],
          backgroundColor: '#ff8a2a',
          borderColor: '#ff6a00',
          borderWidth: 1,
          borderRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: '#f5f7f6', font: { family: 'Outfit' } }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: { color: '#9aa5a0', font: { family: 'Outfit' } }
        },
        y: {
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: { color: '#9aa5a0', font: { family: 'Outfit' } }
        }
      }
    }
  });
  
  const ctx2 = document.getElementById("productShareChart");
  if (!ctx2) return;
  
  const productSales = {};
  state.sales.forEach(s => {
    productSales[s.product] = (productSales[s.product] || 0) + s.total;
  });
  
  const sortedProducts = Object.keys(productSales).sort((a, b) => productSales[b] - productSales[a]);
  const topLabels = sortedProducts.slice(0, 5);
  const topValues = topLabels.map(lbl => productSales[lbl]);
  
  if (sortedProducts.length > 5) {
    let otherSum = 0;
    sortedProducts.slice(5).forEach(lbl => otherSum += productSales[lbl]);
    topLabels.push("Others");
    topValues.push(otherSum);
  }
  
  if (productShareChart) productShareChart.destroy();
  
  productShareChart = new Chart(ctx2, {
    type: 'doughnut',
    data: {
      labels: topLabels,
      datasets: [{
        data: topValues,
        backgroundColor: [
          '#7ed957',
          '#4caf50',
          '#3b82f6',
          '#ff8a2a',
          '#a855f7',
          '#6b7280'
        ],
        borderWidth: 1,
        borderColor: '#121815'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { color: '#f5f7f6', font: { family: 'Outfit', size: 11 } }
        }
      }
    }
  });
}

// ================= DROPDOWNS POPULATER =================

function populateDropdowns() {
  const purVendorSel = document.getElementById("pur-form-vendor");
  const purProdSel = document.getElementById("pur-form-product");
  const saleCustSel = document.getElementById("sale-form-cust");
  const saleProdSel = document.getElementById("sale-form-product");
  
  const filterPurVend = document.getElementById("filter-purchases-vendor");
  const filterSalCust = document.getElementById("filter-sales-customer");
  
  const pmtPartySel = document.getElementById("pmt-form-party");
  
  const custLedgerSel = document.getElementById("cust-ledger-select");
  const vendLedgerSel = document.getElementById("vend-ledger-select");
  
  const prevCustLedg = custLedgerSel.value;
  const prevVendLedg = vendLedgerSel.value;
  
  purVendorSel.innerHTML = '<option value="">-- Select Vendor --</option>';
  purProdSel.innerHTML = '<option value="">-- Select Product --</option>';
  saleCustSel.innerHTML = '<option value="">-- Select Customer --</option>';
  saleProdSel.innerHTML = '<option value="">-- Select Product --</option>';
  pmtPartySel.innerHTML = '<option value="">-- Select Party --</option>';
  
  filterPurVend.innerHTML = '<option value="all">All Vendors</option>';
  filterSalCust.innerHTML = '<option value="all">All Customers</option>';
  
  custLedgerSel.innerHTML = '<option value="">-- Select Customer --</option>';
  vendLedgerSel.innerHTML = '<option value="">-- Select Vendor --</option>';
  
  state.products.forEach(p => {
    purProdSel.innerHTML += `<option value="${p.name}">${p.name}</option>`;
    saleProdSel.innerHTML += `<option value="${p.name}">${p.name}</option>`;
  });
  
  state.vendors.forEach(v => {
    purVendorSel.innerHTML += `<option value="${v.name}">${v.name}</option>`;
    filterPurVend.innerHTML += `<option value="${v.name}">${v.name}</option>`;
    vendLedgerSel.innerHTML += `<option value="${v.name}">${v.name}</option>`;
  });
  
  state.customers.forEach(c => {
    saleCustSel.innerHTML += `<option value="${c.name}">${c.name}</option>`;
    filterSalCust.innerHTML += `<option value="${c.name}">${c.name}</option>`;
    custLedgerSel.innerHTML += `<option value="${c.name}">${c.name}</option>`;
  });
  
  if (prevCustLedg && state.customers.some(c => c.name === prevCustLedg)) {
    custLedgerSel.value = prevCustLedg;
  }
  if (prevVendLedg && state.vendors.some(v => v.name === prevVendLedg)) {
    vendLedgerSel.value = prevVendLedg;
  }
}

// ================= MODALS DISPLAY HANDLERS =================

function openModal(modalId) {
  document.getElementById(modalId).classList.add("active");
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove("active");
}

function openModalFromQuick(type) {
  closeModal('modal-quick-transaction');
  if (type === 'sale') {
    const btn = document.getElementById("log-sale-btn");
    if (btn) btn.click();
    else {
      openModal('modal-sale');
      document.getElementById("sale-form-id").value = "";
      document.getElementById("modal-sale-title").textContent = "Log Customer Sale (Outward Inventory)";
      document.getElementById("sale-form-date").value = new Date().toISOString().substring(0,10);
      document.getElementById("form-sale").reset();
    }
  } else if (type === 'purchase') {
    const btn = document.getElementById("log-purchase-btn");
    if (btn) btn.click();
    else {
      openModal('modal-purchase');
      document.getElementById("pur-form-id").value = "";
      document.getElementById("modal-purchase-title").textContent = "Log Purchase (Inward Inventory)";
      document.getElementById("pur-form-date").value = new Date().toISOString().substring(0,10);
      document.getElementById("form-purchase").reset();
    }
  } else if (type === 'payment') {
    openModal('modal-payment');
    document.getElementById("pmt-form-date").value = new Date().toISOString().substring(0,10);
    updatePaymentPartyDropdown();
  }
}

function updatePaymentPartyDropdown() {
  const type = document.getElementById("pmt-form-type").value;
  const partySel = document.getElementById("pmt-form-party");
  partySel.innerHTML = '<option value="">-- Select Party --</option>';
  
  if (type === "Vendor Payment") {
    state.vendors.forEach(v => {
      const outstanding = getVendorOutstanding(v.name);
      partySel.innerHTML += `<option value="${v.name}">${v.name} (Owed: ₹${outstanding.toFixed(2)})</option>`;
    });
  } else {
    state.customers.forEach(c => {
      const outstanding = getCustomerOutstanding(c.name);
      partySel.innerHTML += `<option value="${c.name}">${c.name} (Pending: ₹${outstanding.toFixed(2)})</option>`;
    });
  }
  document.getElementById("pmt-party-outstanding-info").textContent = "";
}

function openPaymentModal(type, partyName, amount = 0, invoiceId = "") {
  openModal('modal-payment');
  document.getElementById("pmt-form-date").value = new Date().toISOString().substring(0,10);
  document.getElementById("pmt-form-type").value = type;
  
  updatePaymentPartyDropdown();
  document.getElementById("pmt-form-party").value = partyName;
  document.getElementById("pmt-form-amount").value = amount;
  document.getElementById("pmt-form-ref-id").value = invoiceId;
  document.getElementById("pmt-form-notes").value = invoiceId ? `Clear Invoice #${invoiceId}` : "";
  
  const outstanding = type === "Vendor Payment" ? getVendorOutstanding(partyName) : getCustomerOutstanding(partyName);
  document.getElementById("pmt-party-outstanding-info").textContent = `Outstanding: ₹${outstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

function openSubModal(type) {
  if (type === 'vendor') {
    openModal('modal-vendor');
  } else if (type === 'customer') {
    openModal('modal-customer');
  }
}

// ================= FORM SUBMISSION HANDLING =================

function setupFormHandlers() {
  // 1. Save Product
  document.getElementById("form-product").addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("prod-form-id").value;
    const name = document.getElementById("prod-form-name").value;
    const category = document.getElementById("prod-form-category").value;
    const unit = document.getElementById("prod-form-unit").value;
    const hsn = document.getElementById("prod-form-hsn").value;
    const gst_rate = parseFloat(document.getElementById("prod-form-gst-rate").value) || 0;
    const reorder = parseFloat(document.getElementById("prod-form-reorder").value);
    const cost = parseFloat(document.getElementById("prod-form-cost").value);
    const sell = parseFloat(document.getElementById("prod-form-sell").value);
    
    const productData = {
      id: id || "PROD-" + String(state.products.length + 1).padStart(3, '0'),
      name,
      category,
      unit,
      hsn,
      gst_rate,
      reorder_level: reorder,
      cost_price: cost,
      sell_price: sell
    };
    
    if (id) {
      const idx = state.products.findIndex(p => p.id === id);
      if (idx !== -1) state.products[idx] = productData;
    } else {
      state.products.push(productData);
    }
    
    saveStateLocal();
    closeModal("modal-product");
    
    if (state.settings.syncEnabled) {
      await postToGoogleSheet("addProduct", productData);
    }
    
    recalculateAndRender();
  });
  
  // 2. Add/Edit Vendor
  document.getElementById("form-vendor").addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("vnd-form-id").value;
    const name = document.getElementById("vnd-form-name").value;
    const gstin = document.getElementById("vnd-form-gstin").value.toUpperCase();
    const stateVal = document.getElementById("vnd-form-state").value;
    const phone = document.getElementById("vnd-form-phone").value;
    const email = document.getElementById("vnd-form-email").value;
    const address = document.getElementById("vnd-form-address").value;
    
    const vendorData = {
      id: id || "VND-" + String(state.vendors.length + 1).padStart(3, '0'),
      name,
      gstin,
      state: stateVal,
      phone,
      email,
      address
    };
    
    let oldName = "";
    if (id) {
      const idx = state.vendors.findIndex(v => v.id === id);
      if (idx !== -1) {
        oldName = state.vendors[idx].name;
        state.vendors[idx] = vendorData;
        
        // Update name in past purchases and payments to maintain consistency
        if (oldName !== name) {
          state.purchases.forEach(p => { if (p.vendor === oldName) p.vendor = name; });
          state.payments.forEach(pmt => { if (pmt.party_name === oldName) pmt.party_name = name; });
        }
      }
    } else {
      state.vendors.push(vendorData);
    }
    
    saveStateLocal();
    closeModal("modal-vendor");
    
    if (state.settings.syncEnabled) {
      await postToGoogleSheet("addVendor", vendorData);
      
      // If name changed, trigger a bulkSync for Purchases/Payments to keep sheets consistent
      if (id && oldName && oldName !== name) {
        const payload = {
          "Purchases": state.purchases,
          "Payments": state.payments
        };
        await postToGoogleSheet("bulkSync", payload);
      }
    }
    
    recalculateAndRender();
  });
  
  // 3. Add/Edit Customer
  document.getElementById("form-customer").addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("cst-form-id").value;
    const name = document.getElementById("cst-form-name").value;
    const gstin = document.getElementById("cst-form-gstin").value.toUpperCase();
    const stateVal = document.getElementById("cst-form-state").value;
    const phone = document.getElementById("cst-form-phone").value;
    const email = document.getElementById("cst-form-email").value;
    const address = document.getElementById("cst-form-address").value;
    
    const customerData = {
      id: id || "CST-" + String(state.customers.length + 1).padStart(3, '0'),
      name,
      gstin,
      state: stateVal,
      phone,
      email,
      address
    };
    
    let oldName = "";
    if (id) {
      const idx = state.customers.findIndex(c => c.id === id);
      if (idx !== -1) {
        oldName = state.customers[idx].name;
        state.customers[idx] = customerData;
        
        // Update name in past sales and payments to maintain consistency
        if (oldName !== name) {
          state.sales.forEach(s => { if (s.customer === oldName) s.customer = name; });
          state.payments.forEach(pmt => { if (pmt.party_name === oldName) pmt.party_name = name; });
        }
      }
    } else {
      state.customers.push(customerData);
    }
    
    saveStateLocal();
    closeModal("modal-customer");
    
    if (state.settings.syncEnabled) {
      await postToGoogleSheet("addCustomer", customerData);
      
      // If name changed, trigger a bulkSync for Sales/Payments to keep sheets consistent
      if (id && oldName && oldName !== name) {
        const payload = {
          "Sales": state.sales,
          "Payments": state.payments
        };
        await postToGoogleSheet("bulkSync", payload);
      }
    }
    
    recalculateAndRender();
  });
  
  // 4. Log Purchase
  const purQty = document.getElementById("pur-form-qty");
  const purRate = document.getElementById("pur-form-rate");
  const purGstRate = document.getElementById("pur-form-gst-rate");
  const purTotal = document.getElementById("pur-form-total");
  const purGst = document.getElementById("pur-form-gst");
  
  const updatePurchaseTotal = () => {
    const qty = parseFloat(purQty.value) || 0;
    const rate = parseFloat(purRate.value) || 0;
    
    const gstTreatment = document.getElementById("pur-form-gst-treatment").value;
    let gstRateVal = 0;
    if (gstTreatment === "without") {
      purGstRate.disabled = true;
      purGstRate.value = "0";
    } else {
      purGstRate.disabled = false;
      gstRateVal = parseFloat(purGstRate.value) || 0;
    }
    
    const taxable = qty * rate;
    document.getElementById("pur-calc-taxable").textContent = "₹" + taxable.toLocaleString('en-IN', { minimumFractionDigits: 2 });
    
    const vendorName = document.getElementById("pur-form-vendor").value;
    const vendor = state.vendors.find(v => v.name === vendorName);
    const stateName = vendor ? (vendor.state || "Telangana") : "Telangana";
    const isLocal = stateName.toLowerCase() === "telangana";
    
    let cgst = 0, sgst = 0, igst = 0;
    if (isLocal) {
      cgst = taxable * (gstRateVal / 2) / 100;
      sgst = taxable * (gstRateVal / 2) / 100;
      document.getElementById("pur-calc-cgst-row").style.display = "flex";
      document.getElementById("pur-calc-sgst-row").style.display = "flex";
      document.getElementById("pur-calc-igst-row").style.display = "none";
    } else {
      igst = taxable * gstRateVal / 100;
      document.getElementById("pur-calc-cgst-row").style.display = "none";
      document.getElementById("pur-calc-sgst-row").style.display = "none";
      document.getElementById("pur-calc-igst-row").style.display = "flex";
    }
    
    const gstAmount = cgst + sgst + igst;
    const total = taxable + gstAmount;
    
    document.getElementById("pur-calc-cgst").textContent = "₹" + cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 });
    document.getElementById("pur-calc-sgst").textContent = "₹" + sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 });
    document.getElementById("pur-calc-igst").textContent = "₹" + igst.toLocaleString('en-IN', { minimumFractionDigits: 2 });
    document.getElementById("pur-calc-total-display").textContent = "₹" + total.toLocaleString('en-IN', { minimumFractionDigits: 2 });
    
    // Set hidden inputs for old serialization compatibility
    purTotal.value = total.toFixed(2);
    purGst.value = gstAmount.toFixed(2);
  };
  
  purQty.addEventListener("input", updatePurchaseTotal);
  purRate.addEventListener("input", updatePurchaseTotal);
  purGstRate.addEventListener("change", updatePurchaseTotal);
  document.getElementById("pur-form-gst-treatment").addEventListener("change", updatePurchaseTotal);
  
  // Product change handler to prefill HSN and GST Rate
  document.getElementById("pur-form-product").addEventListener("change", (e) => {
    const pName = e.target.value;
    const p = state.products.find(prod => prod.name === pName);
    if (p) {
      purRate.value = p.cost_price || 0;
      document.getElementById("pur-form-hsn").value = p.hsn || "";
      purGstRate.value = p.gst_rate !== undefined ? p.gst_rate : "18";
      updatePurchaseTotal();
    }
  });
  
  // Vendor change handler to display vendor state, GSTIN, and tax type
  document.getElementById("pur-form-vendor").addEventListener("change", (e) => {
    const vName = e.target.value;
    const v = state.vendors.find(vend => vend.name === vName);
    const infoBox = document.getElementById("pur-gst-info");
    if (v) {
      infoBox.classList.remove("hidden");
      document.getElementById("pur-vendor-gstin-display").textContent = v.gstin || "-";
      document.getElementById("pur-vendor-state-display").textContent = v.state || "Telangana";
      
      const isLocal = (v.state || "Telangana").toLowerCase() === "telangana";
      const badge = document.getElementById("pur-tax-type-badge");
      if (isLocal) {
        badge.textContent = "Local (CGST + SGST)";
        badge.className = "badge badge-paid";
      } else {
        badge.textContent = "Interstate (IGST)";
        badge.className = "badge badge-pending";
      }
    } else {
      infoBox.classList.add("hidden");
    }
    updatePurchaseTotal();
  });
  
  document.getElementById("form-purchase").addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("pur-form-id").value;
    const date = document.getElementById("pur-form-date").value;
    const vendor = document.getElementById("pur-form-vendor").value;
    const product = document.getElementById("pur-form-product").value;
    const qty = parseFloat(purQty.value);
    const rate = parseFloat(purRate.value);
    const gstRateVal = parseFloat(purGstRate.value);
    const taxable = qty * rate;
    
    const vendorObj = state.vendors.find(v => v.name === vendor);
    const stateName = vendorObj ? (vendorObj.state || "Telangana") : "Telangana";
    const isLocal = stateName.toLowerCase() === "telangana";
    
    let cgst = 0, sgst = 0, igst = 0;
    if (isLocal) {
      cgst = taxable * (gstRateVal / 2) / 100;
      sgst = taxable * (gstRateVal / 2) / 100;
    } else {
      igst = taxable * gstRateVal / 100;
    }
    const gstAmount = cgst + sgst + igst;
    const total = taxable + gstAmount;
    const status = document.getElementById("pur-form-status").value;
    const gstTreatment = document.getElementById("pur-form-gst-treatment").value;
    const gstBillingVal = gstTreatment === "without" ? "Without GST" : "With GST";
    
    const purchaseData = {
      id: id || "PUR-NEW-" + String(state.purchases.length + 1).padStart(3, '0'),
      date,
      vendor,
      product,
      quantity: qty,
      rate,
      taxable_value: taxable,
      gst_rate: gstRateVal,
      cgst,
      sgst,
      igst,
      total,
      payment_status: status,
      gst_billing: gstBillingVal
    };
    
    if (id) {
      const idx = state.purchases.findIndex(p => p.id === id);
      if (idx !== -1) {
        state.purchases[idx] = purchaseData;
      }
    } else {
      state.purchases.push(purchaseData);
    }
    
    saveStateLocal();
    closeModal("modal-purchase");
    
    if (state.settings.syncEnabled) {
      await postToGoogleSheet("addPurchase", purchaseData);
    }
    
    recalculateAndRender();
  });
  
  // 5. Log Sale
  const saleQty = document.getElementById("sale-form-qty");
  const saleCostRate = document.getElementById("sale-form-costrate");
  const saleSellRate = document.getElementById("sale-form-sellrate");
  const saleGstRate = document.getElementById("sale-form-gst-rate");
  const saleTotal = document.getElementById("sale-form-total");
  const saleGst = document.getElementById("sale-form-gst");
  const saleWarning = document.getElementById("sale-stock-warning");
  
  const updateSaleTotal = () => {
    const qty = parseFloat(saleQty.value) || 0;
    const rate = parseFloat(saleSellRate.value) || 0;
    
    const gstTreatment = document.getElementById("sale-form-gst-treatment").value;
    let gstRateVal = 0;
    if (gstTreatment === "without") {
      saleGstRate.disabled = true;
      saleGstRate.value = "0";
    } else {
      saleGstRate.disabled = false;
      gstRateVal = parseFloat(saleGstRate.value) || 0;
    }
    
    const taxable = qty * rate;
    document.getElementById("sale-calc-taxable").textContent = "₹" + taxable.toLocaleString('en-IN', { minimumFractionDigits: 2 });
    
    const custName = document.getElementById("sale-form-cust").value;
    const cust = state.customers.find(c => c.name === custName);
    const stateName = cust ? (cust.state || "Telangana") : "Telangana";
    const isLocal = stateName.toLowerCase() === "telangana";
    
    let cgst = 0, sgst = 0, igst = 0;
    if (isLocal) {
      cgst = taxable * (gstRateVal / 2) / 100;
      sgst = taxable * (gstRateVal / 2) / 100;
      document.getElementById("sale-calc-cgst-row").style.display = "flex";
      document.getElementById("sale-calc-sgst-row").style.display = "flex";
      document.getElementById("sale-calc-igst-row").style.display = "none";
    } else {
      igst = taxable * gstRateVal / 100;
      document.getElementById("sale-calc-cgst-row").style.display = "none";
      document.getElementById("sale-calc-sgst-row").style.display = "none";
      document.getElementById("sale-calc-igst-row").style.display = "flex";
    }
    
    const gstAmount = cgst + sgst + igst;
    const total = taxable + gstAmount;
    
    document.getElementById("sale-calc-cgst").textContent = "₹" + cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 });
    document.getElementById("sale-calc-sgst").textContent = "₹" + sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 });
    document.getElementById("sale-calc-igst").textContent = "₹" + igst.toLocaleString('en-IN', { minimumFractionDigits: 2 });
    document.getElementById("sale-calc-total-display").textContent = "₹" + total.toLocaleString('en-IN', { minimumFractionDigits: 2 });
    
    // Set hidden inputs for old serialization compatibility
    saleTotal.value = total.toFixed(2);
    saleGst.value = gstAmount.toFixed(2);
    
    const pName = document.getElementById("sale-form-product").value;
    const p = state.products.find(prod => prod.name === pName);
    if (p && qty > p.stock) {
      saleWarning.classList.remove("hidden");
      document.getElementById("sale-stock-warning-text").textContent = `Warning: Insufficient stock. Available: ${p.stock.toFixed(1)} ${p.unit}.`;
    } else {
      saleWarning.classList.add("hidden");
    }
  };
  
  saleQty.addEventListener("input", updateSaleTotal);
  saleSellRate.addEventListener("input", updateSaleTotal);
  saleGstRate.addEventListener("change", updateSaleTotal);
  document.getElementById("sale-form-gst-treatment").addEventListener("change", updateSaleTotal);
  
  // Product change handler to prefill HSN, Sell rate, Cost rate and GST rate
  document.getElementById("sale-form-product").addEventListener("change", (e) => {
    const pName = e.target.value;
    const p = state.products.find(prod => prod.name === pName);
    if (p) {
      saleCostRate.value = p.cost_price || 0;
      saleSellRate.value = p.sell_price || 0;
      document.getElementById("sale-form-hsn").value = p.hsn || "";
      saleGstRate.value = p.gst_rate !== undefined ? p.gst_rate : "18";
      updateSaleTotal();
    }
  });
  
  // Customer change handler to display customer state, GSTIN, and tax type
  document.getElementById("sale-form-cust").addEventListener("change", (e) => {
    const cName = e.target.value;
    const c = state.customers.find(cust => cust.name === cName);
    const infoBox = document.getElementById("sale-gst-info");
    if (c) {
      infoBox.classList.remove("hidden");
      document.getElementById("sale-customer-gstin-display").textContent = c.gstin || "-";
      document.getElementById("sale-customer-state-display").textContent = c.state || "Telangana";
      
      const isLocal = (c.state || "Telangana").toLowerCase() === "telangana";
      const badge = document.getElementById("sale-tax-type-badge");
      if (isLocal) {
        badge.textContent = "Local (CGST + SGST)";
        badge.className = "badge badge-paid";
      } else {
        badge.textContent = "Interstate (IGST)";
        badge.className = "badge badge-pending";
      }
    } else {
      infoBox.classList.add("hidden");
    }
    updateSaleTotal();
  });
  
  document.getElementById("form-sale").addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("sale-form-id").value;
    const date = document.getElementById("sale-form-date").value;
    const customer = document.getElementById("sale-form-cust").value;
    const product = document.getElementById("sale-form-product").value;
    const qty = parseFloat(saleQty.value);
    const cost_rate = parseFloat(saleCostRate.value);
    const rate = parseFloat(saleSellRate.value);
    const gstRateVal = parseFloat(saleGstRate.value);
    const taxable = qty * rate;
    
    const customerObj = state.customers.find(c => c.name === customer);
    const stateName = customerObj ? (customerObj.state || "Telangana") : "Telangana";
    const isLocal = stateName.toLowerCase() === "telangana";
    
    let cgst = 0, sgst = 0, igst = 0;
    if (isLocal) {
      cgst = taxable * (gstRateVal / 2) / 100;
      sgst = taxable * (gstRateVal / 2) / 100;
    } else {
      igst = taxable * gstRateVal / 100;
    }
    const gstAmount = cgst + sgst + igst;
    const total = taxable + gstAmount;
    const status = document.getElementById("sale-form-status").value;
    const gstTreatment = document.getElementById("sale-form-gst-treatment").value;
    const gstBillingVal = gstTreatment === "without" ? "Without GST" : "With GST";
    
    const saleData = {
      id: id || "SLS-NEW-" + String(state.sales.length + 1).padStart(3, '0'),
      date,
      customer,
      product,
      quantity: qty,
      cost_rate,
      cost_total: qty * cost_rate,
      rate,
      taxable_value: taxable,
      gst_rate: gstRateVal,
      cgst,
      sgst,
      igst,
      total,
      payment_status: status,
      gst_billing: gstBillingVal
    };
    
    if (id) {
      const idx = state.sales.findIndex(s => s.id === id);
      if (idx !== -1) {
        state.sales[idx] = saleData;
      }
    } else {
      state.sales.push(saleData);
    }
    
    saveStateLocal();
    closeModal("modal-sale");
    
    if (state.settings.syncEnabled) {
      await postToGoogleSheet("addSale", saleData);
    }
    
    recalculateAndRender();
  });
  
  // 6. Record Payment
  document.getElementById("pmt-form-type").addEventListener("change", updatePaymentPartyDropdown);
  document.getElementById("pmt-form-party").addEventListener("change", (e) => {
    const partyName = e.target.value;
    const type = document.getElementById("pmt-form-type").value;
    const outstanding = type === "Vendor Payment" ? getVendorOutstanding(partyName) : getCustomerOutstanding(partyName);
    document.getElementById("pmt-party-outstanding-info").textContent = `Outstanding: ₹${outstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    document.getElementById("pmt-form-amount").value = outstanding;
  });
  
  document.getElementById("form-payment").addEventListener("submit", async (e) => {
    e.preventDefault();
    const date = document.getElementById("pmt-form-date").value;
    const type = document.getElementById("pmt-form-type").value;
    const method = document.getElementById("pmt-form-method").value;
    const party = document.getElementById("pmt-form-party").value;
    const amount = parseFloat(document.getElementById("pmt-form-amount").value);
    const ref = document.getElementById("pmt-form-notes").value;
    const refInvoiceId = document.getElementById("pmt-form-ref-id").value;
    
    const pmtData = {
      id: "PMT-NEW-" + String(state.payments.length + 1).padStart(3, '0'),
      date,
      party_type: type,
      party_name: party,
      amount,
      payment_method: method,
      reference: ref
    };
    
    state.payments.push(pmtData);
    
    if (refInvoiceId) {
      if (type === "Vendor Payment") {
        const purIdx = state.purchases.findIndex(p => p.id === refInvoiceId);
        if (purIdx !== -1) {
          state.purchases[purIdx].payment_status = "Clear";
          if (state.settings.syncEnabled) {
            await postToGoogleSheet("updatePaymentStatus", { type: "purchases", id: refInvoiceId, status: "Clear" });
          }
        }
      } else {
        const saleIdx = state.sales.findIndex(s => s.id === refInvoiceId);
        if (saleIdx !== -1) {
          state.sales[saleIdx].payment_status = "Clear";
          if (state.settings.syncEnabled) {
            await postToGoogleSheet("updatePaymentStatus", { type: "sales", id: refInvoiceId, status: "Clear" });
          }
        }
      }
    }
    
    saveStateLocal();
    closeModal("modal-payment");
    
    if (state.settings.syncEnabled) {
      await postToGoogleSheet("addPayment", pmtData);
    }
    
    recalculateAndRender();
  });
  
  // 7. Save Settings
  document.getElementById("save-settings-btn").addEventListener("click", async () => {
    const url = document.getElementById("settings-sheet-url").value.trim();
    const enabled = document.getElementById("settings-sync-enabled").checked;
    
    state.settings.sheetUrl = url;
    state.settings.syncEnabled = enabled;
    saveStateLocal();
    
    alert("Sync Settings Saved. Refreshing dashboard.");
    if (enabled && url) {
      await fetchFromGoogleSheet();
    } else {
      recalculateAndRender();
    }
  });
  
  // 8. Bulk upload settings push
  document.getElementById("push-data-btn").addEventListener("click", async () => {
    if (confirm("Are you sure you want to overwrite all data on your Google Sheet with the local data from this browser?")) {
      const payload = {
        "Products": state.products,
        "Vendors": state.vendors,
        "Customers": state.customers,
        "Purchases": state.purchases,
        "Sales": state.sales,
        "Payments": state.payments
      };
      const res = await postToGoogleSheet("bulkSync", payload);
      if (res && res.status === "success") {
        alert("Upload successful! Google Sheet database seeded.");
      } else {
        alert("Upload failed. Check console logs.");
      }
    }
  });
  
  // 9. Reset to Excel Data (Now resets to empty database state)
  document.getElementById("reset-excel-btn").addEventListener("click", () => {
    if (confirm("Are you sure you want to delete all current local changes and reset the database to an empty canvas?")) {
      localStorage.removeItem("psf_dashboard_state");
      localStorage.removeItem("psf_db_cleared_v1");
      window.location.reload();
    }
  });
}

// ================= FILTER & SEARCH BINDINGS =================

function setupFilterHandlers() {
  document.getElementById("search-products").addEventListener("input", renderProductsTable);
  document.getElementById("filter-product-cat").addEventListener("change", renderProductsTable);
  
  document.getElementById("search-vendors").addEventListener("input", renderVendorsTable);
  
  document.getElementById("search-customers").addEventListener("input", renderCustomersTable);
  
  document.getElementById("search-purchases").addEventListener("input", renderPurchasesTable);
  document.getElementById("filter-purchases-vendor").addEventListener("change", renderPurchasesTable);
  
  document.getElementById("search-sales").addEventListener("input", renderSalesTable);
  document.getElementById("filter-sales-customer").addEventListener("change", renderSalesTable);
  
  document.getElementById("search-payments").addEventListener("input", renderPaymentsTable);
  document.getElementById("filter-payment-type").addEventListener("change", renderPaymentsTable);
  
  document.getElementById("cust-ledger-select").addEventListener("change", renderCustomerLedger);
  document.getElementById("vend-ledger-select").addEventListener("change", renderVendorLedger);
  document.getElementById("gl-ledger-select").addEventListener("change", renderGlLedger);
  
  document.getElementById("view-all-transactions").addEventListener("click", () => {
    switchTab("sales");
  });
}

function editProduct(productId) {
  const p = state.products.find(prod => prod.id === productId);
  if (!p) return;
  
  openModal("modal-product");
  document.getElementById("modal-product-title").textContent = "Edit Product Details";
  document.getElementById("prod-form-id").value = p.id;
  document.getElementById("prod-form-name").value = p.name;
  document.getElementById("prod-form-category").value = p.category;
  document.getElementById("prod-form-unit").value = p.unit;
  document.getElementById("prod-form-hsn").value = p.hsn || "";
  document.getElementById("prod-form-gst-rate").value = p.gst_rate !== undefined ? p.gst_rate : "18";
  document.getElementById("prod-form-reorder").value = p.reorder_level;
  document.getElementById("prod-form-cost").value = p.cost_price;
  document.getElementById("prod-form-sell").value = p.sell_price;
}

function editVendor(vendorId) {
  const v = state.vendors.find(vend => vend.id === vendorId);
  if (!v) return;
  
  openModal("modal-vendor");
  document.getElementById("modal-vendor-title").textContent = "Edit Vendor Details";
  document.getElementById("vnd-form-id").value = v.id;
  document.getElementById("vnd-form-name").value = v.name;
  document.getElementById("vnd-form-gstin").value = v.gstin || "";
  document.getElementById("vnd-form-state").value = v.state || "Telangana";
  document.getElementById("vnd-form-phone").value = v.phone || "";
  document.getElementById("vnd-form-email").value = v.email || "";
  document.getElementById("vnd-form-address").value = v.address || "";
}

function editCustomer(customerId) {
  const c = state.customers.find(cust => cust.id === customerId);
  if (!c) return;
  
  openModal("modal-customer");
  document.getElementById("modal-customer-title").textContent = "Edit Customer Details";
  document.getElementById("cst-form-id").value = c.id;
  document.getElementById("cst-form-name").value = c.name;
  document.getElementById("cst-form-gstin").value = c.gstin || "";
  document.getElementById("cst-form-state").value = c.state || "Telangana";
  document.getElementById("cst-form-phone").value = c.phone || "";
  document.getElementById("cst-form-email").value = c.email || "";
  document.getElementById("cst-form-address").value = c.address || "";
}

function editPurchase(purchaseId) {
  const p = state.purchases.find(pur => pur.id === purchaseId);
  if (!p) return;
  
  openModal("modal-purchase");
  document.getElementById("modal-purchase-title").textContent = "Edit Purchase Details";
  document.getElementById("pur-form-id").value = p.id;
  document.getElementById("pur-form-date").value = p.date;
  document.getElementById("pur-form-vendor").value = p.vendor;
  document.getElementById("pur-form-gst-treatment").value = p.gst_billing === "Without GST" ? "without" : "with";
  document.getElementById("pur-form-product").value = p.product;
  document.getElementById("pur-form-qty").value = p.quantity;
  document.getElementById("pur-form-rate").value = p.rate;
  
  const prod = state.products.find(prod => prod.name === p.product);
  document.getElementById("pur-form-hsn").value = prod ? (prod.hsn || "") : "";
  document.getElementById("pur-form-gst-rate").value = p.gst_rate !== undefined ? p.gst_rate : "18";
  document.getElementById("pur-form-status").value = p.payment_status;
  
  const v = state.vendors.find(vend => vend.name === p.vendor);
  const infoBox = document.getElementById("pur-gst-info");
  if (v) {
    infoBox.classList.remove("hidden");
    document.getElementById("pur-vendor-gstin-display").textContent = v.gstin || "-";
    document.getElementById("pur-vendor-state-display").textContent = v.state || "Telangana";
    
    const isLocal = (v.state || "Telangana").toLowerCase() === "telangana";
    const badge = document.getElementById("pur-tax-type-badge");
    if (isLocal) {
      badge.textContent = "Local (CGST + SGST)";
      badge.className = "badge badge-paid";
    } else {
      badge.textContent = "Interstate (IGST)";
      badge.className = "badge badge-pending";
    }
  } else {
    infoBox.classList.add("hidden");
  }
  
  updatePurchaseTotal();
}

function editSale(saleId) {
  const s = state.sales.find(sal => sal.id === saleId);
  if (!s) return;
  
  openModal("modal-sale");
  document.getElementById("modal-sale-title").textContent = "Edit Sale Details";
  document.getElementById("sale-form-id").value = s.id;
  document.getElementById("sale-form-date").value = s.date;
  document.getElementById("sale-form-cust").value = s.customer;
  document.getElementById("sale-form-gst-treatment").value = s.gst_billing === "Without GST" ? "without" : "with";
  document.getElementById("sale-form-product").value = s.product;
  document.getElementById("sale-form-qty").value = s.quantity;
  document.getElementById("sale-form-costrate").value = s.cost_rate;
  document.getElementById("sale-form-sellrate").value = s.rate;
  
  const prod = state.products.find(prod => prod.name === s.product);
  document.getElementById("sale-form-hsn").value = prod ? (prod.hsn || "") : "";
  document.getElementById("sale-form-gst-rate").value = s.gst_rate !== undefined ? s.gst_rate : "18";
  document.getElementById("sale-form-status").value = s.payment_status;
  
  const c = state.customers.find(cust => cust.name === s.customer);
  const infoBox = document.getElementById("sale-gst-info");
  if (c) {
    infoBox.classList.remove("hidden");
    document.getElementById("sale-customer-gstin-display").textContent = c.gstin || "-";
    document.getElementById("sale-customer-state-display").textContent = c.state || "Telangana";
    
    const isLocal = (c.state || "Telangana").toLowerCase() === "telangana";
    const badge = document.getElementById("sale-tax-type-badge");
    if (isLocal) {
      badge.textContent = "Local (CGST + SGST)";
      badge.className = "badge badge-paid";
    } else {
      badge.textContent = "Interstate (IGST)";
      badge.className = "badge badge-pending";
    }
  } else {
    infoBox.classList.add("hidden");
  }
  
  updateSaleTotal();
}

// ================= GOOGLE SHEETS HTTP SYNC ENGINE =================

async function fetchFromGoogleSheet() {
  const url = state.settings.sheetUrl;
  if (!url) return;
  
  document.getElementById("connection-status-text").textContent = "Syncing with Sheets...";
  
  try {
    const response = await fetch(url);
    const result = await response.json();
    
    if (result.status === "success" && result.data) {
      const data = result.data;
      
      if (data.products && data.products.length > 0) state.products = data.products.map(p => ({ ...p, cost_price: parseFloat(p.cost_price), sell_price: parseFloat(p.sell_price), reorder_level: parseFloat(p.reorder_level), gst_rate: parseFloat(p.gst_rate || 18) }));
      if (data.vendors && data.vendors.length > 0) state.vendors = data.vendors;
      if (data.customers && data.customers.length > 0) state.customers = data.customers;
      if (data.purchases && data.purchases.length > 0) state.purchases = data.purchases.map(p => ({ ...p, quantity: parseFloat(p.quantity), rate: parseFloat(p.rate), taxable_value: parseFloat(p.taxable_value || p.quantity * p.rate), gst_rate: parseFloat(p.gst_rate || 0), cgst: parseFloat(p.cgst || 0), sgst: parseFloat(p.sgst || 0), igst: parseFloat(p.igst || 0), total: parseFloat(p.total), gst_billing: p.gst_billing || "With GST" }));
      if (data.sales && data.sales.length > 0) state.sales = data.sales.map(s => ({ ...s, quantity: parseFloat(s.quantity), cost_rate: parseFloat(s.cost_rate), cost_total: parseFloat(s.cost_total), rate: parseFloat(s.rate), taxable_value: parseFloat(s.taxable_value || s.quantity * s.rate), gst_rate: parseFloat(s.gst_rate || 0), cgst: parseFloat(s.cgst || 0), sgst: parseFloat(s.sgst || 0), igst: parseFloat(s.igst || 0), total: parseFloat(s.total), gst_billing: s.gst_billing || "With GST" }));
      if (data.payments && data.payments.length > 0) state.payments = data.payments.map(p => ({ ...p, amount: parseFloat(p.amount) }));
      
      saveStateLocal();
      console.log("State updated from Google Sheet.");
    } else {
      console.error("Failed to load Google Sheet data: ", result.message);
      alert("Failed to fetch Google Sheet data. Using cached browser data.");
    }
  } catch (e) {
    console.error("HTTP Fetch Error: ", e);
    alert("Connection to Google Sheet Web App failed. Using offline browser cache.");
  } finally {
    recalculateAndRender();
  }
}

async function postToGoogleSheet(action, data) {
  const url = state.settings.sheetUrl;
  if (!url) return null;
  
  console.log(`Posting action: ${action} to sheet...`);
  
  try {
    const response = await fetch(url, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ action, data })
    });
    return { status: "success", message: "Transaction posted. Sheet updated." };
  } catch (e) {
    console.error("HTTP Post Error: ", e);
    alert("Error syncing transaction to Google Sheets. Check settings and internet connection.");
    return null;
  }
}
