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
    sheetUrl: "https://script.google.com/macros/s/AKfycbytSl6QwZNxo6LVZwVPPhs0K0Hk1IDmWa2AKl74mxKsaHU8fPZBd_wRYqfmC203StUPdQ/exec",
    syncEnabled: true
  }
};

// Charts references
let salesPurchasesChart = null;
let productShareChart = null;
let productTrendChart = null;
let productQtyShareChart = null;
let currentSaleItems = [];
let currentPurchaseItems = [];

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
      currentPurchaseItems = [];
      renderPurchaseItemsTable();
      updatePurchaseTotals();
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
      document.getElementById("sale-stock-warning").classList.add("hidden");
      currentSaleItems = [];
      renderSaleItemsTable();
      updateSaleTotals();
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
  
  // Bind Add Item buttons for multi-product
  const btnAddPurchaseItem = document.getElementById("btn-add-purchase-item");
  if (btnAddPurchaseItem) {
    btnAddPurchaseItem.addEventListener("click", addPurchaseItem);
  }
  const btnAddSaleItem = document.getElementById("btn-add-sale-item");
  if (btnAddSaleItem) {
    btnAddSaleItem.addEventListener("click", addSaleItem);
  }
  // Bind trend select change event listeners
  const trendProductSel = document.getElementById("trend-product-select");
  const trendTimeSel = document.getElementById("trend-time-select");
  if (trendProductSel) {
    trendProductSel.addEventListener("change", () => {
      renderOverviewCharts();
    });
  }
  if (trendTimeSel) {
    trendTimeSel.addEventListener("change", () => {
      renderOverviewCharts();
    });
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
  renderOverviewStockTable();
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
  const sortBy = document.getElementById("sort-vendors").value;
  
  let list = state.vendors.filter(v => {
    if (searchVal && !v.name.toLowerCase().includes(searchVal)) return false;
    return true;
  });
  
  list = list.map(v => ({
    ...v,
    outstanding: getVendorOutstanding(v.name)
  }));
  
  list.sort((a, b) => {
    if (sortBy === "name-asc") {
      return a.name.localeCompare(b.name);
    } else if (sortBy === "name-desc") {
      return b.name.localeCompare(a.name);
    } else if (sortBy === "outstanding-desc") {
      return b.outstanding - a.outstanding;
    } else if (sortBy === "outstanding-asc") {
      return a.outstanding - b.outstanding;
    } else if (sortBy === "id-asc") {
      return a.id.localeCompare(b.id);
    } else if (sortBy === "id-desc") {
      return b.id.localeCompare(a.id);
    }
    return 0;
  });
  
  list.forEach(v => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${v.id}</td>
      <td class="font-weight-bold">${v.name}</td>
      <td>${v.gstin || '-'}</td>
      <td>${v.state || 'Telangana'}</td>
      <td>${v.phone}</td>
      <td>${v.email}</td>
      <td>${v.address}</td>
      <td class="${v.outstanding > 0 ? 'color-orange font-weight-bold' : ''}">₹${v.outstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
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
  const sortBy = document.getElementById("sort-customers").value;
  
  let list = state.customers.filter(c => {
    if (searchVal && !c.name.toLowerCase().includes(searchVal)) return false;
    return true;
  });
  
  list = list.map(c => ({
    ...c,
    outstanding: getCustomerOutstanding(c.name)
  }));
  
  list.sort((a, b) => {
    if (sortBy === "name-asc") {
      return a.name.localeCompare(b.name);
    } else if (sortBy === "name-desc") {
      return b.name.localeCompare(a.name);
    } else if (sortBy === "outstanding-desc") {
      return b.outstanding - a.outstanding;
    } else if (sortBy === "outstanding-asc") {
      return a.outstanding - b.outstanding;
    } else if (sortBy === "id-asc") {
      return a.id.localeCompare(b.id);
    } else if (sortBy === "id-desc") {
      return b.id.localeCompare(a.id);
    }
    return 0;
  });
  
  list.forEach(c => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${c.id}</td>
      <td class="font-weight-bold">${c.name}</td>
      <td>${c.gstin || '-'}</td>
      <td>${c.state || 'Telangana'}</td>
      <td>${c.phone}</td>
      <td>${c.email}</td>
      <td>${c.address}</td>
      <td class="${c.outstanding > 0 ? 'color-green font-weight-bold' : ''}">₹${c.outstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
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
  if (!tbody) return;
  tbody.innerHTML = "";
  
  const searchVal = document.getElementById("search-purchases").value.toLowerCase();
  const filterVendor = document.getElementById("filter-purchases-vendor").value;
  const filterStatus = document.getElementById("filter-purchases-status").value;
  const filterGst = document.getElementById("filter-purchases-gst").value;
  const fromDate = document.getElementById("filter-purchases-from").value;
  const toDate = document.getElementById("filter-purchases-to").value;
  const sortBy = document.getElementById("sort-purchases").value;
  
  let list = groupPurchases(state.purchases).filter(p => {
    if (searchVal && 
        !p.vendor.toLowerCase().includes(searchVal) && 
        !p.id.toLowerCase().includes(searchVal) &&
        !p.products.some(prodName => prodName.toLowerCase().includes(searchVal))) return false;
    if (filterVendor !== "all" && p.vendor !== filterVendor) return false;
    if (filterStatus !== "all" && p.payment_status !== filterStatus) return false;
    if (filterGst !== "all" && p.gst_billing !== filterGst) return false;
    if (fromDate && new Date(p.date) < new Date(fromDate)) return false;
    if (toDate && new Date(p.date) > new Date(toDate)) return false;
    return true;
  });
  
  list.sort((a, b) => {
    if (sortBy === "date-desc") {
      return new Date(b.date) - new Date(a.date);
    } else if (sortBy === "date-asc") {
      return new Date(a.date) - new Date(b.date);
    } else if (sortBy === "total-desc") {
      return b.total - a.total;
    } else if (sortBy === "total-asc") {
      return a.total - b.total;
    } else if (sortBy === "taxable-desc") {
      return b.taxable_value - a.taxable_value;
    } else if (sortBy === "taxable-asc") {
      return a.taxable_value - b.taxable_value;
    } else if (sortBy === "vendor-asc") {
      return a.vendor.localeCompare(b.vendor);
    } else if (sortBy === "vendor-desc") {
      return b.vendor.localeCompare(a.vendor);
    }
    return 0;
  });
  
  list.forEach(p => {
    const badgeClass = p.payment_status === "Clear" ? "badge-paid" : "badge-pending";
    const payButton = p.payment_status === "Pending" 
      ? `<button class="btn btn-sm btn-primary" onclick="openPaymentModal('Vendor Payment', '${p.vendor}', ${p.total}, '${p.id}')">Clear Dues</button>`
      : `<button class="btn btn-sm btn-outline" disabled>Settled</button>`;
    const editButton = `<button class="btn btn-sm btn-outline" onclick="editPurchase('${p.id}')">Edit</button>`;
    const actionCell = `<div style="display: flex; gap: 6px;">${payButton}${editButton}</div>`;
      
    const gstRateVal = p.gst_rates.length === 1 
      ? `${p.gst_rates[0]}%` 
      : (p.gst_rates.length <= 2 ? p.gst_rates.map(r => `${r}%`).join(", ") : "Multi");
      
    const rateVal = p.rates.length === 1 
      ? `₹${p.rates[0].toFixed(2)}` 
      : (p.rates.length <= 2 ? p.rates.map(r => `₹${r.toFixed(2)}`).join(", ") : "Multi");
      
    const gstBilling = p.gst_billing || "With GST";
 
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${p.id}</td>
      <td>${p.date}</td>
      <td class="font-weight-bold">${p.vendor}</td>
      <td>${p.products.join(", ")}</td>
      <td>${p.quantity}</td>
      <td>${rateVal}</td>
      <td>₹${p.taxable_value.toFixed(2)}</td>
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
  if (!tbody) return;
  tbody.innerHTML = "";
  
  const searchVal = document.getElementById("search-sales").value.toLowerCase();
  const filterCust = document.getElementById("filter-sales-customer").value;
  const filterStatus = document.getElementById("filter-sales-status").value;
  const filterGst = document.getElementById("filter-sales-gst").value;
  const fromDate = document.getElementById("filter-sales-from").value;
  const toDate = document.getElementById("filter-sales-to").value;
  const sortBy = document.getElementById("sort-sales").value;
  
  let list = groupSales(state.sales).filter(s => {
    if (searchVal && 
        !s.customer.toLowerCase().includes(searchVal) && 
        !s.id.toLowerCase().includes(searchVal) &&
        !s.products.some(prodName => prodName.toLowerCase().includes(searchVal))) return false;
    if (filterCust !== "all" && s.customer !== filterCust) return false;
    if (filterStatus !== "all" && s.payment_status !== filterStatus) return false;
    if (filterGst !== "all" && s.gst_billing !== filterGst) return false;
    if (fromDate && new Date(s.date) < new Date(fromDate)) return false;
    if (toDate && new Date(s.date) > new Date(toDate)) return false;
    return true;
  });
  
  list = list.map(s => {
    const profit = s.total - s.cost_total;
    return {
      ...s,
      profit
    };
  });
  
  list.sort((a, b) => {
    if (sortBy === "date-desc") {
      return new Date(b.date) - new Date(a.date);
    } else if (sortBy === "date-asc") {
      return new Date(a.date) - new Date(b.date);
    } else if (sortBy === "total-desc") {
      return b.total - a.total;
    } else if (sortBy === "total-asc") {
      return a.total - b.total;
    } else if (sortBy === "profit-desc") {
      return b.profit - a.profit;
    } else if (sortBy === "profit-asc") {
      return a.profit - b.profit;
    } else if (sortBy === "customer-asc") {
      return a.customer.localeCompare(b.customer);
    } else if (sortBy === "customer-desc") {
      return b.customer.localeCompare(a.customer);
    }
    return 0;
  });
  
  list.forEach(s => {
    const isLoss = s.profit < 0;
    const badgeClass = s.payment_status === "Clear" ? "badge-paid" : "badge-pending";
    const payButton = s.payment_status === "Pending"
      ? `<button class="btn btn-sm btn-primary" onclick="openPaymentModal('Customer Receipt', '${s.customer}', ${s.total}, '${s.id}')">Collect</button>`
      : `<button class="btn btn-sm btn-outline" disabled>Settled</button>`;
    const editButton = `<button class="btn btn-sm btn-outline" onclick="editSale('${s.id}')">Edit</button>`;
    const actionCell = `<div style="display: flex; gap: 6px;">${payButton}${editButton}</div>`;
      
    const gstRateVal = s.gst_rates.length === 1 
      ? `${s.gst_rates[0]}%` 
      : (s.gst_rates.length <= 2 ? s.gst_rates.map(r => `${r}%`).join(", ") : "Multi");
      
    const costRateVal = s.costRates.length === 1 
      ? `₹${s.costRates[0].toFixed(2)}` 
      : (s.costRates.length <= 2 ? s.costRates.map(r => `₹${r.toFixed(2)}`).join(", ") : "Multi");
      
    const rateVal = s.rates.length === 1 
      ? `₹${s.rates[0].toFixed(2)}` 
      : (s.rates.length <= 2 ? s.rates.map(r => `₹${r.toFixed(2)}`).join(", ") : "Multi");
      
    const gstBilling = s.gst_billing || "With GST";
 
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${s.id}</td>
      <td>${s.date}</td>
      <td class="font-weight-bold">${s.customer}</td>
      <td>${s.products.join(", ")}</td>
      <td>${s.quantity}</td>
      <td>${costRateVal}</td>
      <td>${rateVal}</td>
      <td>₹${s.taxable_value.toFixed(2)}</td>
      <td>${gstBilling}</td>
      <td>${gstRateVal}</td>
      <td class="font-weight-bold">₹${s.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      <td class="${isLoss ? 'color-orange' : 'color-green'}">₹${s.profit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
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
  if (!tbody) return;
  tbody.innerHTML = "";
  
  const combined = [];
  groupPurchases(state.purchases).forEach(p => {
    if (p.vendor.toLowerCase() !== 'opening stock') {
      combined.push({ ...p, txn_type: "Purchase", party: p.vendor });
    }
  });
  groupSales(state.sales).forEach(s => combined.push({ ...s, txn_type: "Sale", party: s.customer }));
  
  combined.sort((a, b) => new Date(b.date) - new Date(a.date));
  const recent = combined.slice(0, 8);
  
  recent.forEach(txn => {
    const badgeClass = txn.payment_status === "Clear" ? "badge-paid" : "badge-pending";
    const typeColor = txn.txn_type === "Sale" ? "color-green" : "color-orange";
    
    const productText = txn.products.join(", ");
    
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${txn.date}</td>
      <td class="font-weight-bold ${typeColor}">${txn.txn_type}</td>
      <td>${productText}</td>
      <td>${txn.party}</td>
      <td>${txn.quantity}</td>
      <td class="font-weight-bold">₹${txn.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      <td><span class="badge ${badgeClass}">${txn.payment_status}</span></td>
    `;
    tbody.appendChild(tr);
  });
  
  let totalSalesVal = state.sales.reduce((sum, s) => sum + (parseFloat(s.total) || 0), 0);
  let totalPurVal = state.purchases.reduce((sum, p) => p.vendor.toLowerCase() !== 'opening stock' ? sum + (parseFloat(p.total) || 0) : sum, 0);
  let inventoryVal = state.products.reduce((sum, p) => sum + ((parseFloat(p.stock) || 0) * (parseFloat(p.cost_price) || 0)), 0);
  
  let salesProfit = state.sales.reduce((sum, s) => {
    const totalVal = parseFloat(s.total) || 0;
    const costRate = parseFloat(s.cost_rate) || 0;
    const costTotal = parseFloat(s.cost_total) || ((parseFloat(s.quantity) || 0) * costRate) || 0;
    return sum + (totalVal - costTotal);
  }, 0);
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

function renderOverviewStockTable() {
  const tbody = document.getElementById("overview-stock-tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  // Sort products: Low Stock first, then alphabetically by name
  const sortedProducts = [...state.products].sort((a, b) => {
    const aLow = a.stock < a.reorder_level;
    const bLow = b.stock < b.reorder_level;
    if (aLow && !bLow) return -1;
    if (!aLow && bLow) return 1;
    return a.name.localeCompare(b.name);
  });

  sortedProducts.forEach(p => {
    const isLow = p.stock < p.reorder_level;
    const badgeClass = isLow ? "badge-low" : "badge-ok";
    const badgeText = isLow ? "⚠️ Low Stock" : "OK";
    
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="font-weight-bold">${p.name}</td>
      <td>${p.stock.toFixed(1)} ${p.unit}</td>
      <td><span class="badge ${badgeClass}">${badgeText}</span></td>
    `;
    tbody.appendChild(tr);
  });
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
  if (!tbody) return;
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
  
  const groupedSales = groupSales(state.sales.filter(s => s.customer === custName));
  groupedSales.forEach(s => {
    const desc = `Sales Invoice: ${s.id} [${s.products.join(", ")}]`;
    ledgerEntries.push({
      date: s.date,
      description: desc,
      debit: s.total,
      credit: 0
    });
    
    if (s.payment_status === "Clear") {
      ledgerEntries.push({
        date: s.date,
        description: `Immediate Payment Received [Cash/UPI] for Invoice ${s.id}`,
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
  if (!tbody) return;
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
  
  const groupedPurchases = groupPurchases(state.purchases.filter(p => p.vendor === vendorName));
  groupedPurchases.forEach(p => {
    const desc = `Purchase Invoice: ${p.id} [${p.products.join(", ")}]`;
    ledgerEntries.push({
      date: p.date,
      description: desc,
      debit: 0,
      credit: p.total
    });
    
    if (p.payment_status === "Clear") {
      ledgerEntries.push({
        date: p.date,
        description: `Immediate Settle Payment [Cash/UPI] for Invoice ${p.id}`,
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
  
  let salesProfit = state.sales.reduce((sum, s) => sum + ((parseFloat(s.taxable_value) || parseFloat(s.total) || 0) - (parseFloat(s.cost_total) || 0)), 0);
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

// ================= DATE GROUPING & FORMATTING HELPERS =================

function getGroupingKey(dateStr, granularity) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  
  if (granularity === "day") {
    return dateStr; // "yyyy-mm-dd"
  } else if (granularity === "week") {
    // Sunday of the week containing d
    const day = d.getDay();
    const diff = d.getDate() - day;
    const sunday = new Date(d.setDate(diff));
    const year = sunday.getFullYear();
    const month = String(sunday.getMonth() + 1).padStart(2, '0');
    const date = String(sunday.getDate()).padStart(2, '0');
    return `${year}-${month}-${date}`;
  } else if (granularity === "month") {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`; // "yyyy-mm"
  } else if (granularity === "year") {
    return String(d.getFullYear()); // "yyyy"
  }
  return dateStr;
}

function compareKeys(a, b, granularity) {
  if (granularity === "year") {
    return parseInt(a) - parseInt(b);
  }
  return new Date(a) - new Date(b);
}

function formatKeyLabel(key, granularity) {
  if (granularity === "day") {
    const d = new Date(key);
    if (isNaN(d.getTime())) return key;
    const options = { day: 'numeric', month: 'short' };
    return d.toLocaleDateString('en-US', options);
  } else if (granularity === "week") {
    const d = new Date(key);
    if (isNaN(d.getTime())) return key;
    const options = { day: 'numeric', month: 'short' };
    return "W/c " + d.toLocaleDateString('en-US', options);
  } else if (granularity === "month") {
    const d = new Date(key + "-02"); // Add day to avoid timezone shift
    if (isNaN(d.getTime())) return key;
    const options = { month: 'short', year: 'numeric' };
    return d.toLocaleDateString('en-US', options);
  } else if (granularity === "year") {
    return key;
  }
  return key;
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

  // ================= NEW QUANTITY/PRODUCT COUNT CHARTS =================
  
  const trendCtx = document.getElementById("productTrendChart");
  if (trendCtx) {
    const selectedProd = document.getElementById("trend-product-select")?.value || "all";
    const granularity = document.getElementById("trend-time-select")?.value || "month";
    
    const salesGroup = {};
    const purchasesGroup = {};
    
    state.sales.forEach(s => {
      if (selectedProd !== "all" && s.product !== selectedProd) return;
      const key = getGroupingKey(s.date, granularity);
      salesGroup[key] = (salesGroup[key] || 0) + (parseFloat(s.quantity) || 0);
    });
    
    state.purchases.forEach(p => {
      if (selectedProd !== "all" && p.product !== selectedProd) return;
      const key = getGroupingKey(p.date, granularity);
      purchasesGroup[key] = (purchasesGroup[key] || 0) + (parseFloat(p.quantity) || 0);
    });
    
    const allKeys = Array.from(new Set([...Object.keys(salesGroup), ...Object.keys(purchasesGroup)]));
    allKeys.sort((a, b) => compareKeys(a, b, granularity));
    
    const labels = allKeys.map(key => formatKeyLabel(key, granularity));
    const salesData = allKeys.map(key => salesGroup[key] || 0);
    const purchasesData = allKeys.map(key => purchasesGroup[key] || 0);
    
    if (productTrendChart) productTrendChart.destroy();
    
    productTrendChart = new Chart(trendCtx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Sales Qty Out',
            data: salesData,
            backgroundColor: '#7ed957',
            borderColor: '#4caf50',
            borderWidth: 1,
            borderRadius: 6
          },
          {
            label: 'Purchases Qty In',
            data: purchasesData,
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
  }
  
  const qtyCtx = document.getElementById("productQtyShareChart");
  if (qtyCtx) {
    const productQuantities = {};
    state.sales.forEach(s => {
      productQuantities[s.product] = (productQuantities[s.product] || 0) + (parseFloat(s.quantity) || 0);
    });
    
    const sortedProductsQty = Object.keys(productQuantities).sort((a, b) => productQuantities[b] - productQuantities[a]);
    const topLabelsQty = sortedProductsQty.slice(0, 5);
    const topValuesQty = topLabelsQty.map(lbl => productQuantities[lbl]);
    
    if (sortedProductsQty.length > 5) {
      let otherSumQty = 0;
      sortedProductsQty.slice(5).forEach(lbl => otherSumQty += productQuantities[lbl]);
      topLabelsQty.push("Others");
      topValuesQty.push(otherSumQty);
    }
    
    if (productQtyShareChart) productQtyShareChart.destroy();
    
    productQtyShareChart = new Chart(qtyCtx, {
      type: 'doughnut',
      data: {
        labels: topLabelsQty,
        datasets: [{
          data: topValuesQty,
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
  
  const trendProductSel = document.getElementById("trend-product-select");
  if (trendProductSel) {
    const prevTrendProd = trendProductSel.value;
    trendProductSel.innerHTML = '<option value="all">All Products</option>';
    state.products.forEach(p => {
      trendProductSel.innerHTML += `<option value="${p.name}">${p.name}</option>`;
    });
    if (prevTrendProd) {
      trendProductSel.value = prevTrendProd;
    }
  }
  
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
      currentSaleItems = [];
      renderSaleItemsTable();
      updateSaleTotals();
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
      currentPurchaseItems = [];
      renderPurchaseItemsTable();
      updatePurchaseTotals();
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
    const reorder = parseFloat(document.getElementById("prod-form-reorder").value) || 0;
    const cost = parseFloat(document.getElementById("prod-form-cost").value) || 0;
    const sell = parseFloat(document.getElementById("prod-form-sell").value) || 0;
    
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

  document.getElementById("pur-form-gst-treatment").addEventListener("change", () => {
    updatePurchaseTotals();
  });
  
  // Product change handler to prefill HSN and GST Rate
  document.getElementById("pur-form-product").addEventListener("change", (e) => {
    const pName = e.target.value;
    const p = state.products.find(prod => prod.name === pName);
    if (p) {
      document.getElementById("pur-form-rate").value = p.cost_price || 0;
      document.getElementById("pur-form-hsn").value = p.hsn || "";
      document.getElementById("pur-form-gst-rate").value = p.gst_rate !== undefined ? p.gst_rate : "18";
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
    updatePurchaseTotals();
  });
  
  document.getElementById("form-purchase").addEventListener("submit", async (e) => {
    e.preventDefault();
    
    if (currentPurchaseItems.length === 0) {
      alert("Please add at least one product item.");
      return;
    }
    
    let id = document.getElementById("pur-form-id").value;
    if (!id) {
      const distinctPurchaseInvoices = new Set(state.purchases.map(p => p.id));
      const purchaseInvoiceNum = distinctPurchaseInvoices.size + 1;
      id = "PUR-NEW-" + String(purchaseInvoiceNum).padStart(3, '0');
    }
    
    const date = document.getElementById("pur-form-date").value;
    const vendor = document.getElementById("pur-form-vendor").value;
    const status = document.getElementById("pur-form-status").value;
    const gstTreatment = document.getElementById("pur-form-gst-treatment").value;
    const gstBillingVal = gstTreatment === "without" ? "Without GST" : "With GST";
    
    const vendorObj = state.vendors.find(v => v.name === vendor);
    const stateName = vendorObj ? (vendorObj.state || "Telangana") : "Telangana";
    const isLocal = stateName.toLowerCase() === "telangana";
    
    const purchaseDataArray = currentPurchaseItems.map(item => {
      const taxable = item.quantity * item.rate;
      const gstRateVal = gstTreatment === "without" ? 0 : item.gst_rate;
      
      let cgst = 0, sgst = 0, igst = 0;
      if (isLocal) {
        cgst = taxable * (gstRateVal / 2) / 100;
        sgst = taxable * (gstRateVal / 2) / 100;
      } else {
        igst = taxable * gstRateVal / 100;
      }
      const gstAmount = cgst + sgst + igst;
      const total = taxable + gstAmount;
      
      return {
        id,
        date,
        vendor,
        product: item.product,
        quantity: item.quantity,
        rate: item.rate,
        taxable_value: taxable,
        gst_rate: gstRateVal,
        cgst,
        sgst,
        igst,
        total,
        payment_status: status,
        gst_billing: gstBillingVal
      };
    });
    
    state.purchases = state.purchases.filter(p => p.id !== id);
    state.purchases.push(...purchaseDataArray);
    
    saveStateLocal();
    closeModal("modal-purchase");
    
    if (state.settings.syncEnabled) {
      await postToGoogleSheet("addPurchase", purchaseDataArray);
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

  document.getElementById("sale-form-gst-treatment").addEventListener("change", () => {
    updateSaleTotals();
  });
  
  // Product change handler to prefill HSN, Sell rate, Cost rate and GST rate
  document.getElementById("sale-form-product").addEventListener("change", (e) => {
    const pName = e.target.value;
    const p = state.products.find(prod => prod.name === pName);
    if (p) {
      document.getElementById("sale-form-costrate").value = p.cost_price || 0;
      document.getElementById("sale-form-sellrate").value = p.sell_price || 0;
      document.getElementById("sale-form-hsn").value = p.hsn || "";
      document.getElementById("sale-form-gst-rate").value = p.gst_rate !== undefined ? p.gst_rate : "18";
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
    updateSaleTotals();
  });
  
  document.getElementById("form-sale").addEventListener("submit", async (e) => {
    e.preventDefault();
    
    if (currentSaleItems.length === 0) {
      alert("Please add at least one product item.");
      return;
    }
    
    let id = document.getElementById("sale-form-id").value;
    if (!id) {
      const distinctSaleInvoices = new Set(state.sales.map(s => s.id));
      const saleInvoiceNum = distinctSaleInvoices.size + 1;
      id = "SLS-NEW-" + String(saleInvoiceNum).padStart(3, '0');
    }
    
    const date = document.getElementById("sale-form-date").value;
    const customer = document.getElementById("sale-form-cust").value;
    const status = document.getElementById("sale-form-status").value;
    const gstTreatment = document.getElementById("sale-form-gst-treatment").value;
    const gstBillingVal = gstTreatment === "without" ? "Without GST" : "With GST";
    
    const customerObj = state.customers.find(c => c.name === customer);
    const stateName = customerObj ? (customerObj.state || "Telangana") : "Telangana";
    const isLocal = stateName.toLowerCase() === "telangana";
    
    const saleDataArray = currentSaleItems.map(item => {
      const taxable = item.quantity * item.rate;
      const gstRateVal = gstTreatment === "without" ? 0 : item.gst_rate;
      
      let cgst = 0, sgst = 0, igst = 0;
      if (isLocal) {
        cgst = taxable * (gstRateVal / 2) / 100;
        sgst = taxable * (gstRateVal / 2) / 100;
      } else {
        igst = taxable * gstRateVal / 100;
      }
      const gstAmount = cgst + sgst + igst;
      const total = taxable + gstAmount;
      const costRate = parseFloat(item.cost_rate) || 0;
      const costTotal = item.quantity * costRate;
      
      return {
        id,
        date,
        customer,
        product: item.product,
        quantity: item.quantity,
        cost_rate: costRate,
        cost_total: costTotal,
        rate: item.rate,
        taxable_value: taxable,
        gst_rate: gstRateVal,
        cgst,
        sgst,
        igst,
        total,
        payment_status: status,
        gst_billing: gstBillingVal
      };
    });
    
    state.sales = state.sales.filter(s => s.id !== id);
    state.sales.push(...saleDataArray);
    
    saveStateLocal();
    closeModal("modal-sale");
    
    if (state.settings.syncEnabled) {
      await postToGoogleSheet("addSale", saleDataArray);
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
    const amount = parseFloat(document.getElementById("pmt-form-amount").value) || 0;
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
  document.getElementById("sort-vendors").addEventListener("change", renderVendorsTable);
  
  document.getElementById("search-customers").addEventListener("input", renderCustomersTable);
  document.getElementById("sort-customers").addEventListener("change", renderCustomersTable);
  
  document.getElementById("search-purchases").addEventListener("input", renderPurchasesTable);
  document.getElementById("filter-purchases-vendor").addEventListener("change", renderPurchasesTable);
  document.getElementById("filter-purchases-status").addEventListener("change", renderPurchasesTable);
  document.getElementById("filter-purchases-gst").addEventListener("change", renderPurchasesTable);
  document.getElementById("filter-purchases-from").addEventListener("change", renderPurchasesTable);
  document.getElementById("filter-purchases-to").addEventListener("change", renderPurchasesTable);
  document.getElementById("sort-purchases").addEventListener("change", renderPurchasesTable);
  
  document.getElementById("search-sales").addEventListener("input", renderSalesTable);
  document.getElementById("filter-sales-customer").addEventListener("change", renderSalesTable);
  document.getElementById("filter-sales-status").addEventListener("change", renderSalesTable);
  document.getElementById("filter-sales-gst").addEventListener("change", renderSalesTable);
  document.getElementById("filter-sales-from").addEventListener("change", renderSalesTable);
  document.getElementById("filter-sales-to").addEventListener("change", renderSalesTable);
  document.getElementById("sort-sales").addEventListener("change", renderSalesTable);
  
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
  const matchingItems = state.purchases.filter(pur => pur.id === purchaseId);
  if (matchingItems.length === 0) return;
  
  const p = matchingItems[0];
  
  openModal("modal-purchase");
  document.getElementById("modal-purchase-title").textContent = "Edit Purchase Details";
  document.getElementById("pur-form-id").value = p.id;
  document.getElementById("pur-form-date").value = p.date;
  document.getElementById("pur-form-vendor").value = p.vendor;
  document.getElementById("pur-form-gst-treatment").value = p.gst_billing === "Without GST" ? "without" : "with";
  
  document.getElementById("pur-form-product").value = "";
  document.getElementById("pur-form-qty").value = "0";
  document.getElementById("pur-form-rate").value = "0";
  document.getElementById("pur-form-hsn").value = "";
  document.getElementById("pur-form-gst-rate").value = "18";
  document.getElementById("pur-form-status").value = p.payment_status;
  
  currentPurchaseItems = matchingItems.map(item => ({
    product: item.product,
    quantity: item.quantity,
    rate: item.rate,
    hsn: state.products.find(prod => prod.name === item.product)?.hsn || "",
    gst_rate: item.gst_rate !== undefined ? item.gst_rate : 18
  }));
  
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
  
  renderPurchaseItemsTable();
  updatePurchaseTotals();
}

function editSale(saleId) {
  const matchingItems = state.sales.filter(sal => sal.id === saleId);
  if (matchingItems.length === 0) return;
  
  const s = matchingItems[0];
  
  openModal("modal-sale");
  document.getElementById("modal-sale-title").textContent = "Edit Sale Details";
  document.getElementById("sale-form-id").value = s.id;
  document.getElementById("sale-form-date").value = s.date;
  document.getElementById("sale-form-cust").value = s.customer;
  document.getElementById("sale-form-gst-treatment").value = s.gst_billing === "Without GST" ? "without" : "with";
  
  document.getElementById("sale-form-product").value = "";
  document.getElementById("sale-form-qty").value = "0";
  document.getElementById("sale-form-sellrate").value = "0";
  document.getElementById("sale-form-costrate").value = "0";
  document.getElementById("sale-form-hsn").value = "";
  document.getElementById("sale-form-gst-rate").value = "18";
  document.getElementById("sale-form-status").value = s.payment_status;
  
  currentSaleItems = matchingItems.map(item => ({
    product: item.product,
    quantity: item.quantity,
    rate: item.rate,
    cost_rate: item.cost_rate !== undefined ? item.cost_rate : 0,
    hsn: state.products.find(prod => prod.name === item.product)?.hsn || "",
    gst_rate: item.gst_rate !== undefined ? item.gst_rate : 18
  }));
  
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
  
  renderSaleItemsTable();
  updateSaleTotals();
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
      
      if (data.products && data.products.length > 0) state.products = data.products.map(p => ({ ...p, cost_price: parseFloat(p.cost_price) || 0, sell_price: parseFloat(p.sell_price) || 0, reorder_level: parseFloat(p.reorder_level) || 0, gst_rate: parseFloat(p.gst_rate || 18) || 0 }));
      if (data.vendors && data.vendors.length > 0) state.vendors = data.vendors;
      if (data.customers && data.customers.length > 0) state.customers = data.customers;
      if (data.purchases && data.purchases.length > 0) state.purchases = data.purchases.map(p => ({ ...p, quantity: parseFloat(p.quantity) || 0, rate: parseFloat(p.rate) || 0, taxable_value: parseFloat(p.taxable_value || p.quantity * p.rate) || 0, gst_rate: parseFloat(p.gst_rate || 0) || 0, cgst: parseFloat(p.cgst || 0) || 0, sgst: parseFloat(p.sgst || 0) || 0, igst: parseFloat(p.igst || 0) || 0, total: parseFloat(p.total) || 0, gst_billing: p.gst_billing || "With GST" }));
      if (data.sales && data.sales.length > 0) state.sales = data.sales.map(s => ({ ...s, quantity: parseFloat(s.quantity) || 0, cost_rate: parseFloat(s.cost_rate) || 0, cost_total: parseFloat(s.cost_total) || 0, rate: parseFloat(s.rate) || 0, taxable_value: parseFloat(s.taxable_value || s.quantity * s.rate) || 0, gst_rate: parseFloat(s.gst_rate || 0) || 0, cgst: parseFloat(s.cgst || 0) || 0, sgst: parseFloat(s.sgst || 0) || 0, igst: parseFloat(s.igst || 0) || 0, total: parseFloat(s.total) || 0, gst_billing: s.gst_billing || "With GST" }));
      if (data.payments && data.payments.length > 0) state.payments = data.payments.map(p => ({ ...p, amount: parseFloat(p.amount) || 0 }));
      
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


// ================= MULTI-PRODUCT LOGIC & HELPERS =================

window.deleteSaleItem = function(idx) {
  currentSaleItems.splice(idx, 1);
  renderSaleItemsTable();
  updateSaleTotals();
};

window.deletePurchaseItem = function(idx) {
  currentPurchaseItems.splice(idx, 1);
  renderPurchaseItemsTable();
  updatePurchaseTotals();
};

function renderSaleItemsTable() {
  const tbody = document.getElementById("sale-items-tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  
  const gstTreatment = document.getElementById("sale-form-gst-treatment").value;
  
  currentSaleItems.forEach((item, idx) => {
    const taxable = item.quantity * item.rate;
    const gstRate = gstTreatment === "without" ? 0 : item.gst_rate;
    const gstAmount = taxable * gstRate / 100;
    const total = taxable + gstAmount;
    
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="padding: 6px 12px; border-bottom: 1px solid var(--border-color);">${item.product}</td>
      <td style="padding: 6px 12px; text-align: center; border-bottom: 1px solid var(--border-color);">${item.quantity}</td>
      <td style="padding: 6px 12px; text-align: right; border-bottom: 1px solid var(--border-color);">₹${item.rate.toFixed(2)}</td>
      <td style="padding: 6px 12px; text-align: right; border-bottom: 1px solid var(--border-color);">₹${taxable.toFixed(2)}</td>
      <td style="padding: 6px 12px; text-align: right; border-bottom: 1px solid var(--border-color);">${gstRate}% (₹${gstAmount.toFixed(2)})</td>
      <td style="padding: 6px 12px; text-align: right; font-weight: bold; border-bottom: 1px solid var(--border-color);">₹${total.toFixed(2)}</td>
      <td style="padding: 6px 12px; text-align: center; border-bottom: 1px solid var(--border-color);">
        <button type="button" class="btn btn-sm btn-outline" style="color: var(--accent-orange); border-color: var(--accent-orange); padding: 2px 6px;" onclick="deleteSaleItem(${idx})">&times;</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderPurchaseItemsTable() {
  const tbody = document.getElementById("purchase-items-tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  
  const gstTreatment = document.getElementById("pur-form-gst-treatment").value;
  
  currentPurchaseItems.forEach((item, idx) => {
    const taxable = item.quantity * item.rate;
    const gstRate = gstTreatment === "without" ? 0 : item.gst_rate;
    const gstAmount = taxable * gstRate / 100;
    const total = taxable + gstAmount;
    
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="padding: 6px 12px; border-bottom: 1px solid var(--border-color);">${item.product}</td>
      <td style="padding: 6px 12px; text-align: center; border-bottom: 1px solid var(--border-color);">${item.quantity}</td>
      <td style="padding: 6px 12px; text-align: right; border-bottom: 1px solid var(--border-color);">₹${item.rate.toFixed(2)}</td>
      <td style="padding: 6px 12px; text-align: right; border-bottom: 1px solid var(--border-color);">₹${taxable.toFixed(2)}</td>
      <td style="padding: 6px 12px; text-align: right; border-bottom: 1px solid var(--border-color);">${gstRate}% (₹${gstAmount.toFixed(2)})</td>
      <td style="padding: 6px 12px; text-align: right; font-weight: bold; border-bottom: 1px solid var(--border-color);">₹${total.toFixed(2)}</td>
      <td style="padding: 6px 12px; text-align: center; border-bottom: 1px solid var(--border-color);">
        <button type="button" class="btn btn-sm btn-outline" style="color: var(--accent-orange); border-color: var(--accent-orange); padding: 2px 6px;" onclick="deletePurchaseItem(${idx})">&times;</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function updateSaleTotals() {
  const custName = document.getElementById("sale-form-cust").value;
  const cust = state.customers.find(c => c.name === custName);
  const stateName = cust ? (cust.state || "Telangana") : "Telangana";
  const isLocal = stateName.toLowerCase() === "telangana";
  const gstTreatment = document.getElementById("sale-form-gst-treatment").value;
  
  let totalTaxable = 0;
  let totalCGST = 0;
  let totalSGST = 0;
  let totalIGST = 0;
  
  currentSaleItems.forEach(item => {
    const taxable = item.quantity * item.rate;
    const gstRateVal = gstTreatment === "without" ? 0 : item.gst_rate;
    
    totalTaxable += taxable;
    if (isLocal) {
      totalCGST += taxable * (gstRateVal / 2) / 100;
      totalSGST += taxable * (gstRateVal / 2) / 100;
    } else {
      totalIGST += taxable * gstRateVal / 100;
    }
  });
  
  const totalGST = totalCGST + totalSGST + totalIGST;
  const grandTotal = totalTaxable + totalGST;
  
  document.getElementById("sale-calc-taxable").textContent = "₹" + totalTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2 });
  
  if (isLocal) {
    document.getElementById("sale-calc-cgst-row").style.display = "flex";
    document.getElementById("sale-calc-sgst-row").style.display = "flex";
    document.getElementById("sale-calc-igst-row").style.display = "none";
  } else {
    document.getElementById("sale-calc-cgst-row").style.display = "none";
    document.getElementById("sale-calc-sgst-row").style.display = "none";
    document.getElementById("sale-calc-igst-row").style.display = "flex";
  }
  
  document.getElementById("sale-calc-cgst").textContent = "₹" + totalCGST.toLocaleString('en-IN', { minimumFractionDigits: 2 });
  document.getElementById("sale-calc-sgst").textContent = "₹" + totalSGST.toLocaleString('en-IN', { minimumFractionDigits: 2 });
  document.getElementById("sale-calc-igst").textContent = "₹" + totalIGST.toLocaleString('en-IN', { minimumFractionDigits: 2 });
  document.getElementById("sale-calc-total-display").textContent = "₹" + grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 });
  
  // Set hidden compatibility inputs
  document.getElementById("sale-form-total").value = grandTotal.toFixed(2);
  document.getElementById("sale-form-gst").value = totalGST.toFixed(2);
  
  // Check for low stock warning
  const warnings = [];
  currentSaleItems.forEach(item => {
    const p = state.products.find(prod => prod.name === item.product);
    if (p && item.quantity > p.stock) {
      warnings.push(`${item.product} (Available: ${p.stock.toFixed(1)} ${p.unit}, Requested: ${item.quantity.toFixed(1)})`);
    }
  });
  
  const saleWarning = document.getElementById("sale-stock-warning");
  if (saleWarning) {
    if (warnings.length > 0) {
      saleWarning.classList.remove("hidden");
      document.getElementById("sale-stock-warning-text").innerHTML = 
        "Warning: Insufficient stock for: " + warnings.join(", ");
    } else {
      saleWarning.classList.add("hidden");
    }
  }
}

function updatePurchaseTotals() {
  const vendorName = document.getElementById("pur-form-vendor").value;
  const vendor = state.vendors.find(v => v.name === vendorName);
  const stateName = vendor ? (vendor.state || "Telangana") : "Telangana";
  const isLocal = stateName.toLowerCase() === "telangana";
  const gstTreatment = document.getElementById("pur-form-gst-treatment").value;
  
  let totalTaxable = 0;
  let totalCGST = 0;
  let totalSGST = 0;
  let totalIGST = 0;
  
  currentPurchaseItems.forEach(item => {
    const taxable = item.quantity * item.rate;
    const gstRateVal = gstTreatment === "without" ? 0 : item.gst_rate;
    
    totalTaxable += taxable;
    if (isLocal) {
      totalCGST += taxable * (gstRateVal / 2) / 100;
      totalSGST += taxable * (gstRateVal / 2) / 100;
    } else {
      totalIGST += taxable * gstRateVal / 100;
    }
  });
  
  const totalGST = totalCGST + totalSGST + totalIGST;
  const grandTotal = totalTaxable + totalGST;
  
  document.getElementById("pur-calc-taxable").textContent = "₹" + totalTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2 });
  
  if (isLocal) {
    document.getElementById("pur-calc-cgst-row").style.display = "flex";
    document.getElementById("pur-calc-sgst-row").style.display = "flex";
    document.getElementById("pur-calc-igst-row").style.display = "none";
  } else {
    document.getElementById("pur-calc-cgst-row").style.display = "none";
    document.getElementById("pur-calc-sgst-row").style.display = "none";
    document.getElementById("pur-calc-igst-row").style.display = "flex";
  }
  
  document.getElementById("pur-calc-cgst").textContent = "₹" + totalCGST.toLocaleString('en-IN', { minimumFractionDigits: 2 });
  document.getElementById("pur-calc-sgst").textContent = "₹" + totalSGST.toLocaleString('en-IN', { minimumFractionDigits: 2 });
  document.getElementById("pur-calc-igst").textContent = "₹" + totalIGST.toLocaleString('en-IN', { minimumFractionDigits: 2 });
  document.getElementById("pur-calc-total-display").textContent = "₹" + grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 });
  
  // Set hidden compatibility inputs
  document.getElementById("pur-form-total").value = grandTotal.toFixed(2);
  document.getElementById("pur-form-gst").value = totalGST.toFixed(2);
}

function addSaleItem() {
  const prodName = document.getElementById("sale-form-product").value;
  const qty = parseFloat(document.getElementById("sale-form-qty").value) || 0;
  const sellRate = parseFloat(document.getElementById("sale-form-sellrate").value) || 0;
  const costRate = parseFloat(document.getElementById("sale-form-costrate").value) || 0;
  const hsn = document.getElementById("sale-form-hsn").value;
  const gstRate = parseFloat(document.getElementById("sale-form-gst-rate").value) || 0;

  if (!prodName) {
    alert("Please select a product.");
    return;
  }
  if (qty <= 0) {
    alert("Quantity must be greater than 0.");
    return;
  }
  if (sellRate < 0) {
    alert("Sell price cannot be negative.");
    return;
  }

  const item = {
    product: prodName,
    quantity: qty,
    rate: sellRate,
    cost_rate: costRate,
    hsn: hsn,
    gst_rate: gstRate
  };

  const existingIdx = currentSaleItems.findIndex(i => i.product === prodName);
  if (existingIdx !== -1) {
    currentSaleItems[existingIdx].quantity += qty;
    currentSaleItems[existingIdx].rate = sellRate;
    currentSaleItems[existingIdx].cost_rate = costRate;
  } else {
    currentSaleItems.push(item);
  }

  // Clear inputs
  document.getElementById("sale-form-product").value = "";
  document.getElementById("sale-form-qty").value = "0";
  document.getElementById("sale-form-sellrate").value = "0";
  document.getElementById("sale-form-costrate").value = "0";
  document.getElementById("sale-form-hsn").value = "";
  document.getElementById("sale-form-gst-rate").value = "18";

  renderSaleItemsTable();
  updateSaleTotals();
}

function addPurchaseItem() {
  const prodName = document.getElementById("pur-form-product").value;
  const qty = parseFloat(document.getElementById("pur-form-qty").value) || 0;
  const rate = parseFloat(document.getElementById("pur-form-rate").value) || 0;
  const hsn = document.getElementById("pur-form-hsn").value;
  const gstRate = parseFloat(document.getElementById("pur-form-gst-rate").value) || 0;

  if (!prodName) {
    alert("Please select a product.");
    return;
  }
  if (qty <= 0) {
    alert("Quantity must be greater than 0.");
    return;
  }
  if (rate < 0) {
    alert("Price cannot be negative.");
    return;
  }

  const item = {
    product: prodName,
    quantity: qty,
    rate: rate,
    hsn: hsn,
    gst_rate: gstRate
  };

  const existingIdx = currentPurchaseItems.findIndex(i => i.product === prodName);
  if (existingIdx !== -1) {
    currentPurchaseItems[existingIdx].quantity += qty;
    currentPurchaseItems[existingIdx].rate = rate;
  } else {
    currentPurchaseItems.push(item);
  }

  // Clear inputs
  document.getElementById("pur-form-product").value = "";
  document.getElementById("pur-form-qty").value = "0";
  document.getElementById("pur-form-rate").value = "0";
  document.getElementById("pur-form-hsn").value = "";
  document.getElementById("pur-form-gst-rate").value = "18";

  renderPurchaseItemsTable();
  updatePurchaseTotals();
}

// Group helpers
function groupSales(salesList) {
  const grouped = {};
  salesList.forEach(s => {
    if (!grouped[s.id]) {
      grouped[s.id] = {
        id: s.id,
        date: s.date,
        customer: s.customer,
        payment_status: s.payment_status,
        gst_billing: s.gst_billing,
        items: [],
        quantity: 0,
        cost_total: 0,
        taxable_value: 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
        total: 0,
        products: [],
        rates: [],
        costRates: [],
        gst_rates: []
      };
    }
    const g = grouped[s.id];
    g.items.push(s);
    g.quantity += parseFloat(s.quantity) || 0;
    g.cost_total += parseFloat(s.cost_total) || 0;
    g.taxable_value += parseFloat(s.taxable_value) || 0;
    g.cgst += parseFloat(s.cgst) || 0;
    g.sgst += parseFloat(s.sgst) || 0;
    g.igst += parseFloat(s.igst) || 0;
    g.total += parseFloat(s.total) || 0;
    
    if (!g.products.includes(s.product)) {
      g.products.push(s.product);
    }
    const r = parseFloat(s.rate) || 0;
    if (!g.rates.includes(r)) {
      g.rates.push(r);
    }
    const cr = parseFloat(s.cost_rate) || 0;
    if (!g.costRates.includes(cr)) {
      g.costRates.push(cr);
    }
    const gr = parseFloat(s.gst_rate) || 0;
    if (!g.gst_rates.includes(gr)) {
      g.gst_rates.push(gr);
    }
  });
  return Object.values(grouped);
}

function groupPurchases(purchasesList) {
  const grouped = {};
  purchasesList.forEach(p => {
    if (!grouped[p.id]) {
      grouped[p.id] = {
        id: p.id,
        date: p.date,
        vendor: p.vendor,
        payment_status: p.payment_status,
        gst_billing: p.gst_billing,
        items: [],
        quantity: 0,
        taxable_value: 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
        total: 0,
        products: [],
        rates: [],
        gst_rates: []
      };
    }
    const g = grouped[p.id];
    g.items.push(p);
    g.quantity += parseFloat(p.quantity) || 0;
    g.taxable_value += parseFloat(p.taxable_value) || 0;
    g.cgst += parseFloat(p.cgst) || 0;
    g.sgst += parseFloat(p.sgst) || 0;
    g.igst += parseFloat(p.igst) || 0;
    g.total += parseFloat(p.total) || 0;
    
    if (!g.products.includes(p.product)) {
      g.products.push(p.product);
    }
    const r = parseFloat(p.rate) || 0;
    if (!g.rates.includes(r)) {
      g.rates.push(r);
    }
    const gr = parseFloat(p.gst_rate) || 0;
    if (!g.gst_rates.includes(gr)) {
      g.gst_rates.push(gr);
    }
  });
  return Object.values(grouped);
}
