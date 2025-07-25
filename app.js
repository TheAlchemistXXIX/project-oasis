// app.js

let products = JSON.parse(localStorage.getItem('products')) || [];
let stockHistory = JSON.parse(localStorage.getItem('stockHistory')) || [];

const form = document.getElementById('product-form');
const tableBody = document.querySelector('#inventory-table tbody');
const searchInput = document.getElementById('search');
const vatRate = 0.075;
const exportBtn = document.getElementById('export-btn');
const lowStockThreshold = 5;
const pdfBtn = document.getElementById('pdf-btn');
const loginBtn = document.getElementById('login-btn');
const paginationContainer = document.getElementById('pagination');
const dashboardContainer = document.getElementById('dashboard-summary');
const categoryFilter = document.getElementById('category-filter');

let currentPage = 1;
const itemsPerPage = 10;

form.addEventListener('submit', function (e) {
  e.preventDefault();

  const name = document.getElementById('product-name').value;
  const costPrice = parseFloat(document.getElementById('cost-price').value);
  const quantity = parseInt(document.getElementById('quantity').value);
  const category = document.getElementById('category').value;
  const brand = document.getElementById('brand')?.value || '';
  const size = document.getElementById('size')?.value || '';
  const expiryDate = document.getElementById('expiry-date')?.value || '';
  const supplier = document.getElementById('supplier')?.value || '';
  const reorderLevel = parseInt(document.getElementById('reorder-level')?.value || '0');

  const vat = +(costPrice * vatRate).toFixed(2);
  const shelfPrice = +(costPrice + vat).toFixed(2);
  const totalValue = +(shelfPrice * quantity).toFixed(2);

  const product = { name, costPrice, vat, shelfPrice, quantity, totalValue, category, brand, size, expiryDate, supplier, reorderLevel };
  products.push(product);
  stockHistory.push({ name, quantity, date: new Date().toLocaleString(), type: 'Added' });
  localStorage.setItem('products', JSON.stringify(products));
  localStorage.setItem('stockHistory', JSON.stringify(stockHistory));

  form.reset();
  displayProducts();
  updateDashboard();
});

function displayProducts(filter = '') {
  tableBody.innerHTML = '';
  const filtered = products
    .filter(prod => (prod.name.toLowerCase().includes(filter.toLowerCase()) || prod.category.toLowerCase().includes(filter.toLowerCase())))
    .sort((a, b) => a.name.localeCompare(b.name));

  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);

  paginated.forEach((prod, index) => {
    const isLowStock = prod.quantity < (prod.reorderLevel || lowStockThreshold);
    const isExpiringSoon = prod.expiryDate && new Date(prod.expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const rowStyle = isLowStock ? ' style="background-color:#ffe6e6"' : isExpiringSoon ? ' style="background-color:#fff0cc"' : '';
    const row = document.createElement('tr');
    row.innerHTML = `
      <tr${rowStyle}>
        <td>${prod.name}</td>
        <td>${prod.category}</td>
        <td>${prod.brand || ''}</td>
        <td>${prod.size || ''}</td>
        <td>${prod.supplier || ''}</td>
        <td>${prod.expiryDate || ''}</td>
        <td>${prod.reorderLevel || ''}</td>
        <td>₦${prod.costPrice.toFixed(2)}</td>
        <td>₦${prod.vat.toFixed(2)}</td>
        <td>₦${prod.shelfPrice.toFixed(2)}</td>
        <td>${prod.quantity}</td>
        <td>₦${prod.totalValue.toFixed(2)}</td>
        <td><button onclick="editProduct(${index + startIndex})">Edit</button> <button onclick="deleteProduct(${index + startIndex})">Delete</button></td>
      </tr>
    `;
    tableBody.appendChild(row);
  });

  displayPagination(filtered.length);
  updateDashboard();
}

displayProducts();

function displayPagination(totalItems) {
  paginationContainer.innerHTML = '';
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement('button');
    btn.textContent = i;
    btn.onclick = () => {
      currentPage = i;
      displayProducts(searchInput.value);
    };
    paginationContainer.appendChild(btn);
  }
}

function editProduct(index) {
  const prod = products[index];
  document.getElementById('product-name').value = prod.name;
  document.getElementById('cost-price').value = prod.costPrice;
  document.getElementById('quantity').value = prod.quantity;
  document.getElementById('category').value = prod.category;
  if (document.getElementById('brand')) document.getElementById('brand').value = prod.brand;
  if (document.getElementById('size')) document.getElementById('size').value = prod.size;
  if (document.getElementById('expiry-date')) document.getElementById('expiry-date').value = prod.expiryDate;
  if (document.getElementById('supplier')) document.getElementById('supplier').value = prod.supplier;
  if (document.getElementById('reorder-level')) document.getElementById('reorder-level').value = prod.reorderLevel;

  products.splice(index, 1);
  localStorage.setItem('products', JSON.stringify(products));
  displayProducts();
}

function deleteProduct(index) {
  if (confirm('Are you sure you want to delete this product?')) {
    const deleted = products[index];
    stockHistory.push({ name: deleted.name, quantity: deleted.quantity, date: new Date().toLocaleString(), type: 'Deleted' });
    products.splice(index, 1);
    localStorage.setItem('products', JSON.stringify(products));
    localStorage.setItem('stockHistory', JSON.stringify(stockHistory));
    displayProducts();
  }
}

function calculateVAT() {
  const base = parseFloat(document.getElementById('vat-base').value);
  if (isNaN(base)) {
    document.getElementById('vat-result').textContent = 'Please enter a valid number.';
    return;
  }
  const vatAmount = +(base * vatRate).toFixed(2);
  const total = +(base + vatAmount).toFixed(2);
  document.getElementById('vat-result').textContent = `VAT (7.5%): ₦${vatAmount.toFixed(2)} | Total: ₦${total.toFixed(2)}`;
}

function navigate(section) {
  document.getElementById('inventory-section').style.display = section === 'inventory' ? 'block' : 'none';
  document.getElementById('vat-section').style.display = section === 'vat' ? 'block' : 'none';
  document.getElementById('stock-history-section').style.display = section === 'stock-history' ? 'block' : 'none';
}

searchInput.addEventListener('input', function () {
  displayProducts(this.value);
});

if (categoryFilter) {
  categoryFilter.addEventListener('change', function () {
    displayProducts(this.value);
  });
}

function exportToCSV() {
  let csv = 'Name,Category,Brand,Size,Supplier,Expiry Date,Reorder Level,Cost Price,VAT,Shelf Price,Quantity,Total Value\n';
  products.forEach(p => {
    csv += `${p.name},${p.category},${p.brand || ''},${p.size || ''},${p.supplier || ''},${p.expiryDate || ''},${p.reorderLevel || ''},${p.costPrice},${p.vat},${p.shelfPrice},${p.quantity},${p.totalValue}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('hidden', '');
  a.setAttribute('href', url);
  a.setAttribute('download', 'inventory.csv');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

if (exportBtn) {
  exportBtn.addEventListener('click', exportToCSV);
}

function exportToPDF() {
  let content = 'Name\tCategory\tBrand\tSize\tSupplier\tExpiry Date\tReorder Level\tCost Price\tVAT\tShelf Price\tQuantity\tTotal Value\n';
  products.forEach(p => {
    content += `${p.name}\t${p.category}\t${p.brand || ''}\t${p.size || ''}\t${p.supplier || ''}\t${p.expiryDate || ''}\t${p.reorderLevel || ''}\t₦${p.costPrice}\t₦${p.vat}\t₦${p.shelfPrice}\t${p.quantity}\t₦${p.totalValue}\n`;
  });

  const blob = new Blob([content], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('hidden', '');
  a.setAttribute('href', url);
  a.setAttribute('download', 'inventory.pdf');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

if (pdfBtn) {
  pdfBtn.addEventListener('click', exportToPDF);
}

function login(username, password) {
  if (username === 'admin' && password === 'password') {
    alert('Login successful!');
  } else {
    alert('Invalid credentials');
  }
}

function updateDashboard() {
  if (!dashboardContainer) return;

  const totalStock = products.reduce((sum, p) => sum + p.quantity, 0);
  const totalValue = products.reduce((sum, p) => sum + p.totalValue, 0);
  const lowStockItems = products.filter(p => p.quantity < (p.reorderLevel || lowStockThreshold)).length;

  dashboardContainer.innerHTML = `
    <h3>Dashboard Summary</h3>
    <p>Total Products: ${products.length}</p>
    <p>Total Stock Quantity: ${totalStock}</p>
    <p>Total Inventory Value: ₦${totalValue.toFixed(2)}</p>
    <p>Low Stock Items: ${lowStockItems}</p>
  `;
}

updateDashboard();
