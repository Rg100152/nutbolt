/* ============================================================
   NUTBOLT — Checkout
   Validates customer + payment details, computes the breakup,
   posts to the Node/Python payment backend, saves the booking.
   ============================================================ */
(function () {
  "use strict";

  let selectedMethod = "netbanking";
  let selectedBank = "SBI";
  let submitting = false;

  const BANKS = ["SBI", "HDFC", "ICICI", "AXIS"];

  function money(n) { return window.NUTBOLT_PRICING.formatINR(n); }
  function esc(s) { return window.NB.escapeHtml(s); }
  function val(id) { const el = document.getElementById(id); return el ? el.value.trim() : ""; }

  /* ----------------------------- summary ----------------------------- */
  function renderSummary() {
    const d = window.NB.cart.detailed();
    const itemsEl = document.getElementById("summaryItems");
    const linesEl = document.getElementById("summaryLines");
    const totalEl = document.getElementById("summaryTotal");
    if (!itemsEl) return;
    const b = d.breakup;

    itemsEl.innerHTML = d.items.map(function (it) {
      const p = it.product;
      return (
        '<div class="summary-item">' +
          '<img src="' + esc(p.image) + '" alt="" />' +
          '<div><div class="si-name">' + esc(p.name) + "</div>" +
          '<div class="si-meta">' + esc(p.size + (p.length ? " × " + p.length : "") + " · " + p.material + " · qty " + it.qty) + "</div></div>" +
          '<div class="si-total">' + money(it.lineTotal) + "</div>" +
        "</div>"
      );
    }).join("");

    linesEl.innerHTML =
      '<div class="summary-line"><span>Subtotal</span><b>' + money(b.subtotal) + "</b></div>" +
      (b.discount > 0 ? '<div class="summary-line discount"><span>' + esc(b.tier) + "</span><b>−" + money(b.discount) + "</b></div>" : "") +
      '<div class="summary-line"><span>GST (18%)</span><b>' + money(b.gst) + "</b></div>" +
      '<div class="summary-line"><span>Shipping (' + (b.weightGrams / 1000).toFixed(1) + ' kg)</span><b>' + money(b.shipping) + "</b></div>";

    totalEl.textContent = money(b.total);
  }

  /* ----------------------------- payment detail ----------------------------- */
  function renderPayDetail() {
    const box = document.getElementById("payDetail");
    if (!box) return;

    if (selectedMethod === "netbanking") {
      box.innerHTML =
        '<div class="field" style="margin-bottom:12px"><label>Select your bank</label></div>' +
        '<div class="bank-grid" id="bankGrid">' +
          BANKS.map(function (b) {
            return '<div class="bank-opt' + (b === selectedBank ? " selected" : "") + '" data-bank="' + b + '">' +
              '<span class="b-logo">' + b.charAt(0) + "</span>" + b + "</div>";
          }).join("") +
        "</div>";
    } else if (selectedMethod === "upi") {
      box.innerHTML =
        '<div class="field" style="margin-bottom:0"><label>UPI ID</label>' +
        '<input id="upiVpa" type="text" placeholder="yourname@bank" autocomplete="off" />' +
        '<div class="hint">Demo mode — any valid UPI ID format is accepted.</div></div>';
    } else if (selectedMethod === "card") {
      box.innerHTML =
        '<div class="field"><label>Card number</label><input id="cardNumber" inputmode="numeric" maxlength="19" placeholder="1234 5678 9012 3456" /></div>' +
        '<div class="field"><label>Name on card</label><input id="cardName" type="text" placeholder="RAJ GAUTAM" /></div>' +
        '<div class="field-row"><div class="field" style="margin-bottom:0"><label>Expiry</label><input id="cardExp" maxlength="5" placeholder="MM/YY" /></div>' +
        '<div class="field" style="margin-bottom:0"><label>CVV</label><input id="cardCvv" inputmode="numeric" maxlength="4" placeholder="123" /></div></div>';
    } else {
      box.innerHTML =
        '<div style="padding:14px;border-radius:10px;background:var(--surface-2);border:1px solid var(--line);font-size:12.5px;color:var(--muted)">' +
        "🧾 <b style='color:var(--text)'>30-day B2B credit.</b> Your order is booked now and invoiced with payment terms. A valid GSTIN is required.</div>";
    }
  }

  /* ----------------------------- validation ----------------------------- */
  function mark(fieldId, bad) {
    const el = document.getElementById(fieldId);
    if (el) el.classList.toggle("invalid", bad);
    return !bad;
  }

  function validateAll() {
    let ok = true;
    ok = mark("f-name", val("cName").length < 2) && ok;
    ok = mark("f-phone", !/^[6-9]\d{9}$/.test(val("cPhone"))) && ok;
    ok = mark("f-email", !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val("cEmail"))) && ok;
    ok = mark("f-address", val("cAddress").length < 5) && ok;
    ok = mark("f-city", val("cCity").length < 2) && ok;
    ok = mark("f-pin", !/^\d{6}$/.test(val("cPin"))) && ok;

    if (selectedMethod === "netbanking" && !selectedBank) {
      window.NB.toast("Please select a bank", "error"); ok = false;
    }
    if (selectedMethod === "upi") {
      const vpa = val("upiVpa");
      if (!/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(vpa)) {
        window.NB.toast("Enter a valid UPI ID (e.g. raj@okhdfcbank)", "error"); ok = false;
      }
    }
    if (selectedMethod === "card") {
      const num = val("cardNumber").replace(/\s/g, "");
      const exp = val("cardExp");
      const cvv = val("cardCvv");
      if (!/^\d{16}$/.test(num)) { window.NB.toast("Card number must be 16 digits", "error"); ok = false; }
      else if (!/^\d{2}\/\d{2}$/.test(exp)) { window.NB.toast("Expiry must be MM/YY", "error"); ok = false; }
      else if (!/^\d{3,4}$/.test(cvv)) { window.NB.toast("CVV must be 3-4 digits", "error"); ok = false; }
      else if (val("cardName").length < 2) { window.NB.toast("Enter the name on the card", "error"); ok = false; }
    }
    if (selectedMethod === "credit") {
      const g = val("gstin").toUpperCase();
      if (g.length !== 15) { window.NB.toast("A valid 15-character GSTIN is required for credit", "error"); ok = false; }
    }
    return ok;
  }

  /* ----------------------------- id helpers ----------------------------- */
  function randId(len) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let s = "";
    for (let i = 0; i < len; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
    return s;
  }
  function generateTxn() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let s = "";
    for (let i = 0; i < 13; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
    return "TXN" + s;
  }
  function uniqueBookingId() {
    const existing = window.NB.readJSON("nutbolt_bookings", []);
    let id;
    do { id = "NB-" + randId(4); } while (existing.some(function (b) { return b.id === id; }));
    return id;
  }

  /* ----------------------------- payment request ----------------------------- */
  function endpoints() {
    if (location.protocol === "file:") return ["http://localhost:3000/api/checkout"];
    return ["/api/checkout", "http://localhost:3000/api/checkout"];
  }

  async function postPayment(payload) {
    for (const url of endpoints()) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await res.json().catch(function () { return null; });
        if (data && data.status) return data;
      } catch (err) { /* try next endpoint */ }
    }
    return null;
  }

  function simulateLocally(payload) {
    return new Promise(function (resolve) {
      setTimeout(function () {
        if (Math.random() > 0.1) {
          resolve({
            status: "SUCCESS",
            transaction_id: generateTxn(),
            amount: payload.amount,
            method: payload.method,
            local: true,
            msg: "Simulated payment successful (backend offline)."
          });
        } else {
          resolve({ status: "FAILED", error: "Simulated bank network timeout. Please retry." });
        }
      }, 1600);
    });
  }

  /* ----------------------------- booking save ----------------------------- */
  function saveBooking(data, breakup) {
    const d = window.NB.cart.detailed();
    const user = window.NB.getUser() || {};
    const now = new Date();
    const booking = {
      id: uniqueBookingId(),
      txnId: data.transaction_id,
      status: "Pending",
      date: now.toISOString(),
      dateLabel: now.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }),
      name: val("cName"),
      phone: val("cPhone"),
      email: val("cEmail"),
      address: val("cAddress"),
      city: val("cCity"),
      pincode: val("cPin"),
      deliveryMode: val("deliveryMode"),
      notes: val("cNotes"),
      gstin: val("gstin").toUpperCase(),
      company: val("company"),
      method: selectedMethod,
      bank: selectedMethod === "netbanking" ? selectedBank : "",
      items: d.items.map(function (it) {
        const p = it.product;
        return {
          id: p.id, name: p.name, size: p.size, material: p.material,
          qty: it.qty, price: it.price, lineTotal: it.lineTotal
        };
      }),
      totalItems: d.items.reduce(function (s, it) { return s + it.qty; }, 0) + " pieces",
      subtotal: breakup.subtotal,
      discount: breakup.discount,
      gst: breakup.gst,
      shipping: breakup.shipping,
      total: Number(data.amount) || breakup.total,
      weightGrams: breakup.weightGrams,
      userEmail: user.email || "",
      userId: user.email || ""
    };
    const all = window.NB.readJSON("nutbolt_bookings", []);
    all.unshift(booking);
    window.NB.writeJSON("nutbolt_bookings", all);
    return booking;
  }

  function showLoader(show) {
    const el = document.getElementById("loaderOverlay");
    if (!el) return;
    el.classList.toggle("open", !!show);
    document.body.classList.toggle("no-scroll", !!show);
  }

  /* ----------------------------- submit ----------------------------- */
  async function onSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    const d = window.NB.cart.detailed();
    if (!d.items.length) { window.NB.toast("Your cart is empty", "error"); return; }
    if (!validateAll()) {
      const firstBad = document.querySelector(".field.invalid");
      if (firstBad) firstBad.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    submitting = true;
    const btn = document.getElementById("payBtn");
    if (btn) { btn.disabled = true; btn.textContent = "Processing…"; }
    showLoader(true);

    const breakup = d.breakup;
    const payload = {
      method: selectedMethod,
      amount: breakup.total,
      items: d.items.map(function (it) {
        return { id: it.id, name: it.product.name, price: it.price, qty: it.qty, weight: it.weight };
      }),
      gstin: val("gstin").toUpperCase(),
      bankName: selectedMethod === "netbanking" ? selectedBank : "",
      vpa: selectedMethod === "upi" ? val("upiVpa") : ""
    };

    let data = await postPayment(payload);
    let offline = false;
    if (!data) { offline = true; data = await simulateLocally(payload); }

    showLoader(false);
    submitting = false;
    if (btn) { btn.disabled = false; btn.textContent = "Confirm & Pay"; }

    if (!data || data.status !== "SUCCESS") {
      window.NB.toast((data && data.error) || "Payment failed. Please retry.", "error");
      return;
    }

    const booking = saveBooking(data, breakup);
    window.NB.cart.clear();

    if (offline) window.NB.toast("Backend offline — payment simulated locally.", "info");

    document.getElementById("checkoutRoot").classList.add("hidden");
    document.getElementById("successRoot").classList.remove("hidden");
    document.getElementById("txnId").textContent = data.transaction_id || "TXN-UNKNOWN";
    document.getElementById("bookingId").textContent = booking.id;
    window.scrollTo({ top: 0, behavior: "smooth" });
    window.NB.toast("Payment successful! Order " + booking.id + " booked.", "success");
  }

  /* ----------------------------- init ----------------------------- */
  function init() {
    if (!window.NB || !window.NUTBOLT_PRICING) return;
    const d = window.NB.cart.detailed();

    if (!d.items.length) {
      document.getElementById("checkoutRoot").classList.add("hidden");
      document.getElementById("emptyRoot").classList.remove("hidden");
      return;
    }

    const user = window.NB.getUser();
    if (user) {
      if (user.name) document.getElementById("cName").value = user.name;
      if (user.email) document.getElementById("cEmail").value = user.email;
      if (user.phone) document.getElementById("cPhone").value = user.phone;
    }

    renderSummary();
    renderPayDetail();

    document.getElementById("payMethods").addEventListener("click", function (e) {
      const m = e.target.closest("[data-method]");
      if (!m) return;
      selectedMethod = m.getAttribute("data-method");
      document.querySelectorAll("#payMethods .pay-method").forEach(function (x) {
        x.classList.toggle("selected", x === m);
      });
      renderPayDetail();
    });

    document.getElementById("payDetail").addEventListener("click", function (e) {
      const b = e.target.closest("[data-bank]");
      if (!b) return;
      selectedBank = b.getAttribute("data-bank");
      document.querySelectorAll("#payDetail .bank-opt").forEach(function (x) {
        x.classList.toggle("selected", x === b);
      });
    });

    // clear invalid state as the user types
    document.querySelectorAll("input, textarea, select").forEach(function (el) {
      el.addEventListener("input", function () {
        const f = el.closest(".field");
        if (f) f.classList.remove("invalid");
      });
    });

    document.getElementById("checkoutForm").addEventListener("submit", onSubmit);

    const edit = document.getElementById("editCart");
    if (edit) edit.addEventListener("click", function () { window.NB.openCart(); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
