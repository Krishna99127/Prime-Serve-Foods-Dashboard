# Prime Serve Foods — B2B Wholesale Dashboard

A premium, real-time static B2B wholesale business dashboard built for **Prime Serve Foods (Hyderabad)**. This dashboard integrates directly with a Google Sheets backend via Google Apps Script and is fully compliant with Indian Accounting & GST standards.

## 🚀 Key Features

- **Indian GST Compliance**:
  - Automatically calculates local transactions (**CGST + SGST** at half rates for Telangana state code `36`).
  - Automatically calculates interstate transactions (**IGST** at full rate for outside states).
  - Flexible **With GST** and **Without GST** billing treatments at the transaction level.
  - Supports HSN Codes, GSTIN numbers, and State tracking for Vendors and Customers.
- **Double-Entry Financial Reports**:
  - **Separate Ledgers**: Isolated debit/credit running ledgers for Customers and Vendors.
  - **Cash Book**: General ledger tracking real-time cash flow and general accounts.
  - **Balance Sheet**: Dynamically computed Statement of Financial Position. Net GST Payable (liability) or GST Refundable (Input Tax Credit asset) are tracked automatically to keep the accounting equation (`Assets = Liabilities + Equity`) perfectly balanced.
- **Serverless Google Sheet Sync**:
  - Direct connection to a Google Sheet via a Google Apps Script Web App.
  - Offline-first cache: Fallback to local storage if internet connection is down.
  - Seeding: One-click local database push to seed headers and records in Google Sheets.

## 📂 Project Structure

- `index.html` — HTML5 dashboard interface structure (styled with Outfit font and premium dark aesthetics).
- `styles.css` — Custom styling and animations.
- `app.js` — Core frontend state machine and accounting computation engine.
- `google_apps_script.js` — Backend Google Apps Script code to copy into your Google Sheets project.
- `README.md` — Project description and setup instructions.

---

## 🛠️ Deployment to GitHub Pages (Hosting)

Since this is a fully static client-side application, you can deploy it to **GitHub Pages** for free.

### ⚠️ Security Notice
GitHub Pages websites are **publicly accessible**. Because the dashboard is static, your Google Apps Script URL will be visible in the source code (in `app.js`) to anyone who inspects the page. Anyone with access to the URL could potentially read or write to your spreadsheet.
* **Recommendation**: If your business data is sensitive, consider keeping the repository private, running it locally (`http://localhost:8000`), or deploying behind an authentication gate (such as Vercel password protection or Netlify Identity).

### Step-by-Step GitHub Pages Deployment:

1. **Create a GitHub Repository**:
   - Go to [GitHub](https://github.com) and create a new repository (e.g. `prime-serve-dashboard`).
   - Keep it **Public** (required for free GitHub Pages hosting) or **Private** (if using GitHub Pages with a premium plan).

2. **Initialize Git & Push Files**:
   Open a terminal (such as PowerShell or Command Prompt) in this project folder (`H:\Consultancy\Prime Serve Foods`) and run:
   ```bash
   # Initialize git
   git init

   # Create a gitignore to keep excel raw files and cache out of public git
   echo "_PSF-MAY.xlsx" >> .gitignore
   echo "PSF-JUN (1).xlsx" >> .gitignore
   echo "data.json" >> .gitignore

   # Add all files
   git add .

   # Commit
   git commit -m "Initial commit of Prime Serve Foods B2B GST Dashboard"

   # Rename branch to main
   git branch -M main

   # Link to your GitHub repository (replace with your actual repository URL)
   git remote add origin https://github.com/YOUR_USERNAME/prime-serve-dashboard.git

   # Push code
   git push -u origin main
   ```

3. **Enable GitHub Pages**:
   - Go to your repository page on GitHub.
   - Click on **Settings** (top tabs) -> **Pages** (left sidebar).
   - Under **Build and deployment** -> **Source**, choose **Deploy from a branch**.
   - Under **Branch**, select `main` and `/ (root)`, then click **Save**.
   - After a minute, GitHub will provide your live URL (e.g., `https://YOUR_USERNAME.github.io/prime-serve-dashboard/`).
