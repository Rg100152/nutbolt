/* ============================================================
   NUTBOLT — Homepage catalog
   Renders categories, filters, product grid and bulk calculator.
   ============================================================ */
(function () {
  "use strict";

  const state = { search: "", category: "all", material: "all", size: "all", sort: "featured" };
  let bulkProduct = null;

  function money(n) { return window.NUTBOLT_PRICING.formatINR(n); }
  function esc(s) { return window.NB.escapeHtml(s); }

  function productsInCategory(catId) {
    return window.NUTBOLT.allProducts().filter(function (p) { return p.category === catId; });
  }

  /* ----------------------------- categories ----------------------------- */
  function renderCategories() {
    const grid = document.getElementById("categoryGrid");
    if (!grid) return;
    grid.innerHTML = window.NUTBOLT.CATEGORIES.map(function (c) {
      const items = productsInCategory(c.id);
      const min = items.length ? Math.min.apply(null, items.map(function (p) { return p.price; })) : 0;
      return (
        '<button class="circle-card" data-cat="' + c.id + '">' +
          '<span class="circle-thumb"><img src="' + c.img + '" alt="' + esc(c.name) + '" />' +
            '<span class="count">' + items.length + "</span></span>" +
          '<span class="c-name">' + esc(c.name) + "</span>" +
          '<span class="c-price">from ' + money(min) + "</span>" +
        "</button>"
      );
    }).join("");

    grid.addEventListener("click", function (e) {
      const card = e.target.closest("[data-cat]");
      if (!card) return;
      state.category = card.getAttribute("data-cat");
      syncChips();
      renderProducts();
      const target = document.getElementById("catalog");
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  /* ----------------------------- filters ----------------------------- */
  function populateSelects() {
    const mat = document.getElementById("materialFilter");
    const size = document.getElementById("sizeFilter");
    window.NUTBOLT.MATERIALS.forEach(function (m) {
      const o = document.createElement("option"); o.value = m; o.textContent = m; mat.appendChild(o);
    });
    window.NUTBOLT.SIZES.forEach(function (s) {
      const o = document.createElement("option"); o.value = s; o.textContent = s; size.appendChild(o);
    });
  }

  function renderChips() {
    const row = document.getElementById("chipRow");
    if (!row) return;
    row.innerHTML = '<button class="chip active" data-chip="all">All products</button>' +
      window.NUTBOLT.CATEGORIES.map(function (c) {
        return '<button class="chip" data-chip="' + c.id + '">' + esc(c.name) + "</button>";
      }).join("");
    row.addEventListener("click", function (e) {
      const chip = e.target.closest("[data-chip]");
      if (!chip) return;
      state.category = chip.getAttribute("data-chip");
      syncChips();
      renderProducts();
    });
  }

  function syncChips() {
    document.querySelectorAll("#chipRow .chip").forEach(function (chip) {
      chip.classList.toggle("active", chip.getAttribute("data-chip") === state.category);
    });
  }

  /* ----------------------------- products ----------------------------- */
  function matches(p) {
    if (state.category !== "all" && p.category !== state.category) return false;
    if (state.material !== "all" && p.material !== state.material) return false;
    if (state.size !== "all" && p.size !== state.size) return false;
    if (state.search) {
      const hay = [p.name, p.categoryName, p.material, p.size, p.length, p.id].join(" ").toLowerCase();
      if (hay.indexOf(state.search.toLowerCase()) === -1) return false;
    }
    return true;
  }

  function sortList(list) {
    const arr = list.slice();
    switch (state.sort) {
      case "price-low": arr.sort(function (a, b) { return a.price - b.price; }); break;
      case "price-high": arr.sort(function (a, b) { return b.price - a.price; }); break;
      case "rating": arr.sort(function (a, b) { return b.rating - a.rating; }); break;
      case "name": arr.sort(function (a, b) { return a.name.localeCompare(b.name); }); break;
      default: arr.sort(function (a, b) {
        const ba = a.badge ? 1 : 0, bb = b.badge ? 1 : 0;
        if (ba !== bb) return bb - ba;
        return b.reviews - a.reviews;
      });
    }
    return arr;
  }

  function stockPill(p) {
    if (p.stock <= 0) return '<span class="stock-pill out">Out of stock</span>';
    if (p.stock < 80) return '<span class="stock-pill low">Low stock</span>';
    return '<span class="stock-pill">In stock</span>';
  }

  function stars(rating) {
    const full = Math.round(rating);
    let s = "";
    for (let i = 0; i < 5; i++) s += i < full ? "★" : "☆";
    return '<span class="s">' + s + "</span>";
  }

  function cardHtml(p) {
    return (
      '<article class="product-card" data-id="' + esc(p.id) + '">' +
        '<div class="product-media">' +
          '<img src="' + esc(p.image) + '" alt="' + esc(p.name) + '" loading="lazy" />' +
          '<span class="cat-pill">' + esc(p.categoryName) + "</span>" +
          stockPill(p) +
        "</div>" +
        '<div class="product-body">' +
          '<h3 class="product-name">' + esc(p.name) + "</h3>" +
          '<div class="spec-row">' +
            '<span class="spec-tag hot">' + esc(p.size) + "</span>" +
            '<span class="spec-tag">' + esc(p.material) + "</span>" +
            (p.length ? '<span class="spec-tag">' + esc(p.length) + "</span>" : "") +
            (p.badge ? '<span class="spec-tag">' + esc(p.badge) + "</span>" : "") +
          "</div>" +
          '<div class="stars">' + stars(p.rating) + " " + p.rating.toFixed(1) + " (" + p.reviews + ")</div>" +
          '<div class="product-foot">' +
            '<div class="price-block"><div class="p">' + money(p.price) + ' <span>/pc</span></div>' +
              '<div class="tier">Bulk save up to 10%</div></div>' +
            '<button class="add-btn" data-add="' + esc(p.id) + '" title="Add to cart"' + (p.stock <= 0 ? " disabled" : "") + ">+</button>" +
          "</div>" +
        "</div>" +
      "</article>"
    );
  }

  function renderProducts() {
    const grid = document.getElementById("productGrid");
    if (!grid) return;
    const all = window.NUTBOLT.allProducts();
    const list = sortList(all.filter(matches));

    const badge = document.getElementById("countBadge");
    if (badge) badge.innerHTML = "Showing <b>" + list.length + "</b> of " + all.length + " products";

    if (!list.length) {
      grid.innerHTML =
        '<div class="empty-state"><div class="big">🔎</div><h3>No fasteners found</h3>' +
        "<p>No products match \u201c" + esc(state.search || state.category) + "\u201d. Try clearing filters.</p>" +
        '<button class="btn btn-sm" style="margin-top:16px" data-reset>Reset filters</button></div>';
      return;
    }
    grid.innerHTML = list.map(cardHtml).join("");
  }

  /* ----------------------------- bulk calculator ----------------------------- */
  function populateBulkCategory() {
    const sel = document.getElementById("bcCategory");
    if (!sel) return;
    sel.innerHTML = window.NUTBOLT.CATEGORIES.map(function (c) {
      return '<option value="' + c.id + '">' + esc(c.name) + "</option>";
    }).join("");
    sel.value = "hex-bolt";
  }

  function updateBulk() {
    const sel = document.getElementById("bcCategory");
    const qtyEl = document.getElementById("bcQty");
    if (!sel || !qtyEl) return;

    const catId = sel.value;
    const items = window.NUTBOLT.allProducts()
      .filter(function (p) { return p.category === catId; })
      .sort(function (a, b) { return a.price - b.price; });
    bulkProduct = items[0] || null;

    const qty = parseInt(qtyEl.value, 10) || 100;
    document.getElementById("bcQtyLabel").textContent = qty.toLocaleString("en-IN");

    if (!bulkProduct) {
      document.getElementById("bcTotal").textContent = "—";
      return;
    }

    const b = window.NUTBOLT_PRICING.computeBreakup([
      { price: bulkProduct.price, qty: qty, weight: bulkProduct.weight }
    ]);

    document.getElementById("bcName").textContent = bulkProduct.name + " (" + bulkProduct.size + ")";
    document.getElementById("bcUnit").textContent = money(bulkProduct.price) + " / pc";
    document.getElementById("bcSub").textContent = money(b.subtotal);
    document.getElementById("bcDisc").textContent = "−" + money(b.discount);
    document.getElementById("bcGst").textContent = money(b.gst);
    document.getElementById("bcShip").textContent = money(b.shipping);
    document.getElementById("bcGrand").textContent = money(b.total);
    document.getElementById("bcTotal").textContent = money(b.total);
    document.getElementById("bcPer").textContent = "for " + qty.toLocaleString("en-IN") + " pieces · " + money(b.total / qty) + " / pc incl. tax";
    document.getElementById("bcTier").textContent = b.tier;

    const big = document.getElementById("bcTotal");
    big.classList.remove("flash");
    void big.offsetWidth;
    big.classList.add("flash");
  }

  /* ----------------------------- init ----------------------------- */
  function init() {
    if (!window.NUTBOLT || !window.NUTBOLT_PRICING || !window.NB) return;

    renderCategories();
    populateSelects();
    renderChips();
    renderProducts();
    populateBulkCategory();
    updateBulk();

    const search = document.getElementById("searchInput");
    const clear = document.getElementById("searchClear");
    if (search) {
      search.addEventListener("input", function () {
        state.search = search.value.trim();
        if (clear) clear.classList.toggle("show", !!state.search);
        renderProducts();
      });
    }
    if (clear) clear.addEventListener("click", function () {
      state.search = ""; search.value = ""; clear.classList.remove("show"); renderProducts();
    });

    ["materialFilter", "sizeFilter", "sortFilter"].forEach(function (id) {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("change", function () {
        if (id === "materialFilter") state.material = el.value;
        if (id === "sizeFilter") state.size = el.value;
        if (id === "sortFilter") state.sort = el.value;
        renderProducts();
      });
    });

    const grid = document.getElementById("productGrid");
    if (grid) {
      grid.addEventListener("click", function (e) {
        const add = e.target.closest("[data-add]");
        if (add) { window.NB.cart.add(add.getAttribute("data-add"), 1); return; }
        if (e.target.closest("[data-reset]")) {
          state.search = ""; state.category = "all"; state.material = "all"; state.size = "all"; state.sort = "featured";
          if (search) search.value = "";
          if (clear) clear.classList.remove("show");
          const m = document.getElementById("materialFilter"); if (m) m.value = "all";
          const s = document.getElementById("sizeFilter"); if (s) s.value = "all";
          const so = document.getElementById("sortFilter"); if (so) so.value = "featured";
          syncChips(); renderProducts();
        }
      });
      grid.addEventListener("mousemove", function (e) {
        const card = e.target.closest(".product-card");
        if (!card) return;
        const r = card.getBoundingClientRect();
        card.style.setProperty("--mx", ((e.clientX - r.left) / r.width * 100) + "%");
        card.style.setProperty("--my", ((e.clientY - r.top) / r.height * 100) + "%");
      });
    }

    const bcSel = document.getElementById("bcCategory");
    const bcQty = document.getElementById("bcQty");
    if (bcSel) bcSel.addEventListener("change", updateBulk);
    if (bcQty) bcQty.addEventListener("input", updateBulk);

    const bcAdd = document.getElementById("bcAdd");
    if (bcAdd) bcAdd.addEventListener("click", function () {
      if (!bulkProduct) return;
      const qty = parseInt(bcQty.value, 10) || 100;
      window.NB.cart.add(bulkProduct.id, qty);
      window.NB.openCart();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
