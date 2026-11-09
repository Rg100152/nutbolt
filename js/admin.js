/* ============================================================
   NUTBOLT — Admin panel
   Booking management, inventory entry and global price control.
   ============================================================ */
(function () {
  "use strict";

  const LENGTHS = { M3: "12mm", M4: "16mm", M5: "20mm", M6: "30mm", M8: "40mm", M10: "50mm", M12: "60mm", M16: "80mm", M20: "100mm" };

  function money(n) { return window.NUTBOLT_PRICING.formatINR(n); }
  function esc(s) { return window.NB.escapeHtml(s); }
  function val(id) { const el = document.getElementById(id); return el ? el.value.trim() : ""; }
  function bookings() { return window.NB.readJSON("nutbolt_bookings", []); }
  function saveBookings(list) { window.NB.writeJSON("nutbolt_bookings", list); }
  function statusClass(s) { return String(s || "Pending").toLowerCase(); }

  /* ----------------------------- KPIs ----------------------------- */
  function renderKpis() {
    const list = bookings();
    const revenue = list.filter(function (b) { return statusClass(b.status) !== "cancelled"; })
      .reduce(function (s, b) { return s + (Number(b.total) || 0); }, 0);
    const pending = list.filter(function (b) { return statusClass(b.status) === "pending" || statusClass(b.status) === "processing"; }).length;
    document.getElementById("kpiBookings").textContent = list.length;
    document.getElementById("kpiRevenue").textContent = money(revenue);
    document.getElementById("kpiPending").textContent = pending;
    document.getElementById("kpiCustom").textContent = window.NUTBOLT.customProducts().length;
  }

  /* ----------------------------- bookings table ----------------------------- */
  function renderBookings() {
    const tbody = document.getElementById("bookingsBody");
    const list = bookings();
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--muted);padding:40px">No bookings yet. Place an order from the storefront to see it here.</td></tr>';
      return;
    }
    tbody.innerHTML = list.map(function (b) {
      const st = statusClass(b.status);
      const canComplete = st !== "completed" && st !== "cancelled";
      const itemsCount = b.totalItems || ((b.items || []).length + " items");
      return (
        "<tr>" +
          '<td class="mono">' + esc(b.id) + "</td>" +
          "<td>" + esc(b.name || "—") + "</td>" +
          "<td><div>" + esc(b.phone || "—") + '</div><div class="tiny muted">' + esc(b.email || "") + "</div></td>" +
          "<td>" + esc(itemsCount) + "</td>" +
          '<td class="price-cell">' + money(b.total) + "</td>" +
          "<td>" + esc((b.method || "—")) + "</td>" +
          '<td><span class="badge ' + esc(st) + '">' + esc(b.status || "Pending") + "</span></td>" +
          '<td class="tiny muted">' + esc(b.dateLabel || (b.date || "").slice(0, 10)) + "</td>" +
          '<td><div class="row-actions">' +
            (canComplete ? '<button class="mini-btn ok" data-complete="' + esc(b.id) + '">Complete</button>' : "") +
            '<button class="mini-btn danger" data-del="' + esc(b.id) + '">Delete</button>' +
          "</div></td>" +
        "</tr>"
      );
    }).join("");
  }

  /* ----------------------------- custom products ----------------------------- */
  function renderCustom() {
    const tbody = document.getElementById("customBody");
    const list = window.NUTBOLT.customProducts();
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:30px">No custom products yet. Add one on the left.</td></tr>';
      return;
    }
    tbody.innerHTML = list.map(function (p) {
      return (
        "<tr>" +
          "<td>" + esc(p.name) + "</td>" +
          "<td>" + esc(p.categoryName || p.category) + "</td>" +
          "<td>" + esc(p.size || "—") + "</td>" +
          "<td>" + esc(p.material || "—") + "</td>" +
          '<td class="price-cell">' + money(p.price) + "</td>" +
          "<td>" + esc(p.stock) + "</td>" +
          '<td><button class="mini-btn danger" data-del-prod="' + esc(p.id) + '">Delete</button></td>' +
        "</tr>"
      );
    }).join("");
  }

  /* ----------------------------- selects ----------------------------- */
  function populateSelects() {
    const cat = document.getElementById("pCategory");
    const size = document.getElementById("pSize");
    const mat = document.getElementById("pMaterial");
    cat.innerHTML = window.NUTBOLT.CATEGORIES.map(function (c) {
      return '<option value="' + c.id + '">' + esc(c.name) + "</option>";
    }).join("");
    size.innerHTML = window.NUTBOLT.SIZES.map(function (s) {
      return '<option value="' + s + '">' + s + "</option>";
    }).join("");
    size.value = "M8";
    mat.innerHTML = window.NUTBOLT.MATERIALS.map(function (m) {
      return '<option value="' + m + '">' + m + "</option>";
    }).join("");
    mat.value = "SS 304";
  }

  /* ----------------------------- add product ----------------------------- */
  function addProduct() {
    const catId = val("pCategory");
    const cat = window.NUTBOLT.categoryById(catId);
    const size = val("pSize") || "M8";
    const material = val("pMaterial") || "MS";
    const price = parseFloat(val("pPrice"));
    const stock = parseInt(val("pStock"), 10);
    const weight = parseInt(val("pWeight"), 10) || 20;
    let name = val("pName");

    if (!name) name = material + " " + (cat ? cat.singular : "Fastener");
    if (!(price > 0)) { window.NB.toast("Enter a valid price greater than 0", "error"); return; }
    if (isNaN(stock) || stock < 0) { window.NB.toast("Enter a valid stock quantity", "error"); return; }

    const product = {
      id: "C-" + Date.now().toString(36).toUpperCase(),
      name: name,
      category: catId,
      categoryName: cat ? cat.name : catId,
      size: size,
      length: LENGTHS[size] || "",
      material: material,
      thread: "Coarse",
      price: window.NUTBOLT.round2(price),
      weight: weight,
      stock: stock,
      rating: 4.5,
      reviews: 0,
      image: cat ? cat.img : "images/product-1.png",
      icon: cat ? cat.icon : "🔩",
      badge: "New",
      custom: true
    };

    const list = window.NUTBOLT.customProducts();
    list.push(product);
    window.NUTBOLT.saveCustomProducts(list);

    ["pName", "pPrice", "pStock", "pWeight"].forEach(function (id) {
      const el = document.getElementById(id); if (el) el.value = "";
    });

    renderCustom();
    renderKpis();
    window.NB.toast("Added \u201c" + name + "\u201d to the live catalog", "success");
  }

  /* ----------------------------- price hike ----------------------------- */
  function applyHike() {
    const pct = parseFloat(val("hikePct"));
    if (!(pct > 0) || pct > 50) { window.NB.toast("Enter a hike between 0.5% and 50%", "error"); return; }
    const all = window.NUTBOLT.allProducts();
    const overrides = window.NUTBOLT.priceOverrides();
    let count = 0;
    all.forEach(function (p) {
      if (String(p.material).toUpperCase().indexOf("SS") !== -1) {
        overrides[p.id] = window.NUTBOLT.round2(p.price * (1 + pct / 100));
        count++;
      }
    });
    window.NUTBOLT.savePriceOverrides(overrides);
    renderCustom();
    window.NB.toast("Raised prices on " + count + " SS products by " + pct + "%", "success");
  }

  function resetPrices() {
    window.NUTBOLT.savePriceOverrides({});
    renderCustom();
    window.NB.toast("All prices reset to base rates", "info");
  }

  /* ----------------------------- tabs ----------------------------- */
  function setupTabs() {
    document.querySelectorAll(".tab").forEach(function (tab) {
      tab.addEventListener("click", function () {
        const name = tab.getAttribute("data-tab");
        document.querySelectorAll(".tab").forEach(function (t) { t.classList.toggle("active", t === tab); });
        document.getElementById("tab-bookings").classList.toggle("hidden", name !== "bookings");
        document.getElementById("tab-inventory").classList.toggle("hidden", name !== "inventory");
      });
    });
  }

  /* ----------------------------- events ----------------------------- */
  function init() {
    if (!window.NB || !window.NUTBOLT) return;
    populateSelects();
    setupTabs();
    renderKpis();
    renderBookings();
    renderCustom();

    document.getElementById("addProductBtn").addEventListener("click", addProduct);
    document.getElementById("hikeBtn").addEventListener("click", applyHike);
    document.getElementById("resetPricesBtn").addEventListener("click", resetPrices);

    document.getElementById("bookingsBody").addEventListener("click", function (e) {
      const done = e.target.closest("[data-complete]");
      if (done) {
        const id = done.getAttribute("data-complete");
        saveBookings(bookings().map(function (b) { if (b.id === id) b.status = "Completed"; return b; }));
        window.NB.toast("Marked " + id + " as completed", "success");
        renderKpis(); renderBookings();
        return;
      }
      const del = e.target.closest("[data-del]");
      if (del) {
        const id = del.getAttribute("data-del");
        if (!confirm("Delete booking " + id + "? This cannot be undone.")) return;
        saveBookings(bookings().filter(function (b) { return b.id !== id; }));
        window.NB.toast("Booking deleted", "info");
        renderKpis(); renderBookings();
      }
    });

    document.getElementById("customBody").addEventListener("click", function (e) {
      const del = e.target.closest("[data-del-prod]");
      if (!del) return;
      const id = del.getAttribute("data-del-prod");
      if (!confirm("Remove this product from the catalog?")) return;
      const list = window.NUTBOLT.customProducts().filter(function (p) { return p.id !== id; });
      window.NUTBOLT.saveCustomProducts(list);
      renderCustom(); renderKpis();
      window.NB.toast("Product removed", "info");
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
