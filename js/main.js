/* ============================================================
   NUTBOLT — Shared shell
   Injects header/footer, manages cart, toasts, track-order modal.
   ============================================================ */
(function () {
  "use strict";

  const CART_KEY = "nutbolt_cart";
  const USER_KEY = "nutbolt_user";
  const BOOK_KEY = "nutbolt_bookings";

  /* ----------------------------- helpers ----------------------------- */
  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }
  function readJSON(key, fallback) {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
    catch (e) { return fallback; }
  }
  function writeJSON(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
  function money(n) { return window.NUTBOLT_PRICING.formatINR(n); }

  /* ----------------------------- cart state ----------------------------- */
  function getCart() {
    const c = readJSON(CART_KEY, []);
    return Array.isArray(c) ? c.filter(function (x) { return x && x.id && x.qty > 0; }) : [];
  }
  function saveCart(cart) { writeJSON(CART_KEY, cart); updateBadge(); renderDrawer(); }

  function addToCart(id, qty) {
    qty = Math.max(1, parseInt(qty, 10) || 1);
    const cart = getCart();
    const found = cart.find(function (x) { return x.id === id; });
    if (found) found.qty += qty; else cart.push({ id: id, qty: qty });
    saveCart(cart);
    const p = window.NUTBOLT.productById(id);
    toast((p ? p.name : "Item") + " added to cart", "success");
    bounceBadge();
  }
  function setQty(id, qty) {
    const cart = getCart();
    const it = cart.find(function (x) { return x.id === id; });
    if (!it) return;
    it.qty = parseInt(qty, 10) || 0;
    if (it.qty <= 0) return removeFromCart(id);
    saveCart(cart);
  }
  function removeFromCart(id) {
    saveCart(getCart().filter(function (x) { return x.id !== id; }));
  }
  function clearCart() { saveCart([]); }
  function cartCount() { return getCart().reduce(function (s, x) { return s + (Number(x.qty) || 0); }, 0); }

  function detailedCart() {
    const items = [];
    getCart().forEach(function (line) {
      const p = window.NUTBOLT.productById(line.id);
      if (!p) return;
      items.push({
        id: p.id, qty: line.qty, product: p,
        price: p.price, weight: p.weight,
        lineTotal: Math.round(p.price * line.qty * 100) / 100
      });
    });
    const breakup = window.NUTBOLT_PRICING.computeBreakup(items);
    return { items: items, breakup: breakup };
  }

  /* ----------------------------- toast ----------------------------- */
  function toast(msg, type) {
    let wrap = document.querySelector(".toast-wrap");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.className = "toast-wrap";
      document.body.appendChild(wrap);
    }
    const t = document.createElement("div");
    t.className = "toast " + (type || "info");
    const ico = type === "success" ? "✓" : type === "error" ? "✕" : "ℹ";
    t.innerHTML = '<span class="t-ico">' + ico + "</span><span>" + escapeHtml(msg) + "</span>";
    wrap.appendChild(t);
    setTimeout(function () {
      t.classList.add("out");
      setTimeout(function () { t.remove(); }, 320);
    }, 2800);
  }

  /* ----------------------------- user ----------------------------- */
  function getUser() { return readJSON(USER_KEY, null); }
  function setUser(u) { writeJSON(USER_KEY, u); }
  function clearUser() { localStorage.removeItem(USER_KEY); }
  function requireLogin() {
    if (!getUser()) {
      window.location.href = "login.html?next=" + encodeURIComponent(location.pathname.split("/").pop() || "dashboard.html");
      return false;
    }
    return true;
  }

  /* ----------------------------- header ----------------------------- */
  function currentPage() { return (document.body && document.body.getAttribute("data-page")) || "home"; }

  function navLink(href, label, key) {
    const active = currentPage() === key ? " active" : "";
    return '<a class="' + active.trim() + '" href="' + href + '">' + label + "</a>";
  }

  function buildHeader() {
    const u = getUser();
    const userHtml = u
      ? '<a class="user-chip" href="dashboard.html" title="My dashboard"><span class="user-avatar">' +
          escapeHtml((u.name || "U").charAt(0).toUpperCase()) + "</span><span>" +
          escapeHtml((u.name || "User").split(" ")[0]) + "</span></a>"
      : '<a class="btn btn-ghost btn-sm" href="login.html">Login</a>';

    return (
      '<div class="topbar"><div class="container topbar-inner">' +
        '<div class="topbar-left">' +
          '<span>📞 +91 98960 00000</span>' +
          '<span>✉️ support@nutbolt.in</span>' +
          '<span><i class="dot"></i> Open today · 9am–9pm</span>' +
        "</div>" +
        '<div class="topbar-right">' +
          '<a href="index.html#about">About</a>' +
          '<a href="#" data-track>Track Order</a>' +
          '<a href="admin.html">Admin</a>' +
          '<a href="login.html">Login / Sign Up</a>' +
        "</div>" +
      "</div></div>" +
      '<header class="site-header"><div class="container header-inner">' +
        '<a class="brand" href="index.html">' +
          '<img src="images/logo.png" alt="Nutbolt logo" />' +
          '<span class="brand-text"><strong>NUT<em>BOLT</em></strong><small>Fasteners &amp; Fittings</small></span>' +
        "</a>" +
        '<nav class="main-nav" id="mainNav">' +
          navLink("index.html", "Home", "home") +
          navLink("index.html#catalog", "Catalog", "catalog") +
          navLink("index.html#bulk", "Bulk Rates", "bulk") +
          navLink("dashboard.html", "Dashboard", "dashboard") +
          navLink("admin.html", "Admin", "admin") +
        "</nav>" +
        '<div class="header-actions">' +
          '<button class="icon-btn nav-toggle" id="navToggle" aria-label="Menu">☰</button>' +
          '<button class="icon-btn" id="cartBtn" aria-label="Open cart" title="Cart">🛒' +
            '<span class="cart-count" id="cartCount">0</span>' +
          "</button>" +
          userHtml +
        "</div>" +
      "</div></header>"
    );
  }

  /* ----------------------------- footer ----------------------------- */
  function buildFooter() {
    return (
      '<footer class="site-footer"><div class="container">' +
        '<div class="footer-grid">' +
          '<div class="footer-brand">' +
            '<a class="brand" href="index.html"><img src="images/logo.png" alt="Nutbolt logo" />' +
              '<span class="brand-text"><strong>NUT<em>BOLT</em></strong><small>Fasteners &amp; Fittings</small></span></a>' +
            '<p>Industrial-grade nuts, bolts, screws and washers delivered to your workshop. Bulk pricing, GST invoices and same-day dispatch.</p>' +
            '<div class="footer-social"><a href="#" aria-label="Instagram">📷</a><a href="#" aria-label="Facebook">f</a><a href="#" aria-label="X">✕</a><a href="#" aria-label="WhatsApp">💬</a></div>' +
          "</div>" +
          '<div class="footer-col"><h4>Shop</h4>' +
            '<a href="index.html#catalog">Full Catalog</a><a href="index.html#categories">Categories</a>' +
            '<a href="index.html#bulk">Bulk Rates</a><a href="#" data-track>Track Order</a></div>' +
          '<div class="footer-col"><h4>Account</h4>' +
            '<a href="login.html">Login / Sign Up</a><a href="dashboard.html">My Bookings</a>' +
            '<a href="admin.html">Admin Panel</a><a href="booking.html">Checkout</a></div>' +
          '<div class="footer-col"><h4>Company</h4>' +
            '<a href="index.html#about">About Us</a><a href="index.html#how">How It Works</a>' +
            '<a href="index.html#contact">Contact</a><a href="#">Privacy Policy</a></div>' +
        "</div>" +
        '<div class="footer-bottom"><span>© 2026 Nutbolt · Crafted by <b>Raj Gautam</b></span>' +
          '<span>Made for workshops, mechanics &amp; factories across India.</span></div>' +
      "</div></footer>"
    );
  }

  /* ----------------------------- cart drawer ----------------------------- */
  function ensureDrawer() {
    if (document.getElementById("cartDrawer")) return;
    const el = document.createElement("div");
    el.innerHTML =
      '<div class="overlay" id="cartOverlay"></div>' +
      '<aside class="cart-drawer" id="cartDrawer" aria-label="Shopping cart">' +
        '<div class="cart-head"><h3>🛒 Your Cart <span class="count-badge" id="drawerCount">0</span></h3>' +
          '<button class="close-x" id="cartClose" aria-label="Close">✕</button></div>' +
        '<div class="cart-items" id="cartItems"></div>' +
        '<div class="cart-foot" id="cartFoot"></div>' +
      "</aside>" +
      '<div class="loader-overlay" id="loaderOverlay">' +
        '<div class="screw-loader"><span class="ring"></span><span class="bolt-head"></span></div>' +
        '<div class="lo-text" id="loaderText">Processing payment…</div>' +
        '<div class="lo-sub">Locking your order into place</div>' +
      "</div>" +
      '<div class="modal" id="trackModal"><div class="modal-bg" data-close-modal></div>' +
        '<div class="modal-card"><button class="modal-close" data-close-modal>✕</button>' +
          '<h3>Track your order</h3><p class="sub">Enter your booking ID (e.g. NB-A1B2) to see its status.</p>' +
          '<div class="field"><label>Booking ID</label><input id="trackInput" placeholder="NB-XXXX" autocomplete="off" /></div>' +
          '<button class="btn btn-block" id="trackBtn">Track Order</button>' +
          '<div id="trackResult" style="margin-top:16px"></div>' +
        "</div></div>";
    document.body.appendChild(el);

    document.getElementById("cartOverlay").addEventListener("click", closeCart);
    document.getElementById("cartClose").addEventListener("click", closeCart);
    document.getElementById("cartItems").addEventListener("click", onDrawerClick);
    document.getElementById("cartFoot").addEventListener("click", onDrawerClick);
    const tm = document.getElementById("trackModal");
    tm.querySelectorAll("[data-close-modal]").forEach(function (b) {
      b.addEventListener("click", function () { tm.classList.remove("open"); });
    });
    document.getElementById("trackBtn").addEventListener("click", doTrack);
    document.getElementById("trackInput").addEventListener("keydown", function (e) {
      if (e.key === "Enter") doTrack();
    });
  }

  function onDrawerClick(e) {
    const t = e.target.closest("[data-act]");
    if (!t) return;
    const act = t.getAttribute("data-act");
    const id = t.getAttribute("data-id");
    if (act === "inc") setQty(id, getCart().find(function (x) { return x.id === id; }).qty + 1);
    else if (act === "dec") setQty(id, getCart().find(function (x) { return x.id === id; }).qty - 1);
    else if (act === "remove") { removeFromCart(id); toast("Item removed", "info"); }
    else if (act === "checkout") {
      if (cartCount() === 0) return toast("Your cart is empty", "error");
      window.location.href = "booking.html";
    }
  }

  function renderDrawer() {
    const itemsEl = document.getElementById("cartItems");
    const footEl = document.getElementById("cartFoot");
    if (!itemsEl || !footEl) return;
    const d = detailedCart();
    document.getElementById("drawerCount").textContent = cartCount();

    if (!d.items.length) {
      itemsEl.innerHTML =
        '<div class="cart-empty"><div class="big">🧰</div><p>Your cart is empty.</p>' +
        '<p class="small muted" style="margin-top:6px">Add fasteners from the catalog to begin.</p>' +
        '<a class="btn btn-sm" style="margin-top:16px" href="index.html#catalog">Browse Catalog</a></div>';
      footEl.innerHTML = "";
      return;
    }

    itemsEl.innerHTML = d.items.map(function (it) {
      const p = it.product;
      return (
        '<div class="cart-item">' +
          '<img src="' + p.image + '" alt="' + escapeHtml(p.name) + '" />' +
          '<div class="ci-main">' +
            '<div class="ci-name">' + escapeHtml(p.name) + "</div>" +
            '<div class="ci-spec">' + escapeHtml(p.size + (p.length ? " × " + p.length : "") + " · " + p.material) + "</div>" +
            '<div class="ci-bottom">' +
              '<div class="qty-control">' +
                '<button data-act="dec" data-id="' + p.id + '">−</button>' +
                '<input value="' + it.qty + '" readonly />' +
                '<button data-act="inc" data-id="' + p.id + '">+</button>' +
              "</div>" +
              '<span class="ci-price">' + money(it.lineTotal) + "</span>" +
            "</div>" +
            '<button class="ci-remove" data-act="remove" data-id="' + p.id + '">Remove</button>' +
          "</div>" +
        "</div>"
      );
    }).join("");

    footEl.innerHTML =
      '<div class="cart-summary-line"><span>Subtotal</span><span>' + money(d.breakup.subtotal) + "</span></div>" +
      (d.breakup.discount > 0
        ? '<div class="cart-summary-line" style="color:var(--green)"><span>' + d.breakup.tier + "</span><span>−" + money(d.breakup.discount) + "</span></div>"
        : "") +
      '<div class="cart-summary-line"><span>GST (18%) &amp; shipping</span><span>+ ' + money(d.breakup.gst + d.breakup.shipping) + "</span></div>" +
      '<div class="cart-summary-line total"><span>Total</span><b>' + money(d.breakup.total) + "</b></div>" +
      '<button class="btn btn-block btn-lg" data-act="checkout">Proceed to Checkout →</button>' +
      '<p class="note">Prices include GST calculation at checkout. Free store pickup available.</p>';
  }

  function openCart() {
    ensureDrawer();
    renderDrawer();
    document.getElementById("cartDrawer").classList.add("open");
    document.getElementById("cartOverlay").classList.add("open");
    document.body.classList.add("no-scroll");
  }
  function closeCart() {
    const d = document.getElementById("cartDrawer");
    const o = document.getElementById("cartOverlay");
    if (d) d.classList.remove("open");
    if (o) o.classList.remove("open");
    document.body.classList.remove("no-scroll");
  }

  function updateBadge() {
    const n = cartCount();
    document.querySelectorAll("#cartCount, .cart-count").forEach(function (el) {
      el.textContent = n;
      el.style.display = n > 0 ? "flex" : "flex";
      el.style.opacity = n > 0 ? "1" : "0.6";
    });
  }
  function bounceBadge() {
    const b = document.getElementById("cartCount");
    if (!b) return;
    b.style.transform = "scale(1.5)";
    setTimeout(function () { b.style.transform = ""; }, 220);
  }

  /* ----------------------------- track order ----------------------------- */
  function doTrack() {
    const input = document.getElementById("trackInput");
    const out = document.getElementById("trackResult");
    const id = (input.value || "").trim().toUpperCase();
    if (!id) { out.innerHTML = '<p style="color:var(--red);font-size:13px">Please enter a booking ID.</p>'; return; }
    const bookings = readJSON(BOOK_KEY, []);
    const b = bookings.find(function (x) { return String(x.id).toUpperCase() === id; });
    if (!b) {
      out.innerHTML = '<p style="color:var(--red);font-size:13px">No booking found for <b>' + escapeHtml(id) + "</b>.</p>";
      return;
    }
    out.innerHTML =
      '<div style="padding:16px;border:1px solid var(--line);border-radius:12px;background:var(--surface)">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">' +
          '<span class="bc-id">' + escapeHtml(b.id) + "</span>" +
          '<span class="badge ' + escapeHtml((b.status || "pending").toLowerCase()) + '">' + escapeHtml(b.status || "Pending") + "</span>" +
        "</div>" +
        '<div class="small muted">' + escapeHtml(b.totalItems || "") + "</div>" +
        '<div style="display:flex;justify-content:space-between;margin-top:10px;font-size:13px">' +
          "<span class=\"muted\">Placed " + escapeHtml(b.date || "") + "</span>" +
          "<b class=\"accent\">" + money(b.total) + "</b>" +
        "</div>" +
      "</div>";
  }

  function openTrack() {
    ensureDrawer();
    document.getElementById("trackModal").classList.add("open");
    setTimeout(function () { document.getElementById("trackInput").focus(); }, 120);
  }

  /* ----------------------------- boot ----------------------------- */
  function boot() {
    const h = document.getElementById("site-header");
    const f = document.getElementById("site-footer");
    if (h) h.innerHTML = buildHeader();
    if (f) f.innerHTML = buildFooter();

    ensureDrawer();
    updateBadge();
    renderDrawer();

    const cartBtn = document.getElementById("cartBtn");
    if (cartBtn) cartBtn.addEventListener("click", openCart);

    const navToggle = document.getElementById("navToggle");
    const mainNav = document.getElementById("mainNav");
    if (navToggle && mainNav) {
      navToggle.addEventListener("click", function () { mainNav.classList.toggle("open"); });
    }

    document.querySelectorAll("[data-track]").forEach(function (el) {
      el.addEventListener("click", function (e) { e.preventDefault(); openTrack(); });
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        closeCart();
        const tm = document.getElementById("trackModal");
        if (tm) tm.classList.remove("open");
      }
    });

    // Reveal-on-scroll
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
        });
      }, { threshold: 0.12 });
      document.querySelectorAll(".reveal").forEach(function (el) { io.observe(el); });
    } else {
      document.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("in"); });
    }
  }

  window.NB = {
    cart: {
      get: getCart, add: addToCart, setQty: setQty, remove: removeFromCart,
      clear: clearCart, count: cartCount, detailed: detailedCart, save: saveCart
    },
    openCart: openCart, closeCart: closeCart, openTrack: openTrack,
    toast: toast, money: money, escapeHtml: escapeHtml,
    getUser: getUser, setUser: setUser, clearUser: clearUser, requireLogin: requireLogin,
    readJSON: readJSON, writeJSON: writeJSON,
    bounceBadge: bounceBadge
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
