/* ============================================================
   NUTBOLT — User dashboard
   Shows bookings belonging to the signed-in user.
   ============================================================ */
(function () {
  "use strict";

  function money(n) { return window.NUTBOLT_PRICING.formatINR(n); }
  function esc(s) { return window.NB.escapeHtml(s); }
  function allBookings() { return window.NB.readJSON("nutbolt_bookings", []); }
  function saveBookings(list) { window.NB.writeJSON("nutbolt_bookings", list); }

  function mine() {
    const u = window.NB.getUser();
    if (!u) return [];
    const email = (u.email || "").toLowerCase();
    const phone = (u.phone || "").replace(/\s/g, "");
    return allBookings().filter(function (b) {
      const be = (b.email || "").toLowerCase();
      const bp = (b.phone || "").replace(/\s/g, "");
      return (email && be === email) || (phone && bp === phone);
    });
  }

  function statusOf(b) { return (b.status || "Pending"); }

  function render() {
    const u = window.NB.getUser();
    const list = mine();

    document.getElementById("welcomeLine").textContent =
      "Welcome back, " + (u.name || "customer").split(" ")[0] + " · " + (u.email || "");

    const pending = list.filter(function (b) { return statusOf(b) === "Pending" || statusOf(b) === "Processing"; }).length;
    const completed = list.filter(function (b) { return statusOf(b) === "Completed"; }).length;
    const spent = list.filter(function (b) { return statusOf(b) !== "Cancelled"; })
      .reduce(function (s, b) { return s + (Number(b.total) || 0); }, 0);

    document.getElementById("kpiTotal").textContent = list.length;
    document.getElementById("kpiPending").textContent = pending;
    document.getElementById("kpiCompleted").textContent = completed;
    document.getElementById("kpiSpent").textContent = money(spent);

    const wrap = document.getElementById("bookingList");
    if (!list.length) {
      wrap.innerHTML =
        '<div class="empty-state" style="padding:60px 20px"><div class="big">📦</div>' +
        "<h3>No bookings yet</h3><p>Your placed orders will appear here.</p>" +
        '<a class="btn" style="margin-top:16px" href="index.html#catalog">Browse catalog</a></div>';
      return;
    }

    wrap.innerHTML = list.map(function (b) {
      const itemsText = (b.items || []).map(function (it) {
        return it.name + " (" + it.size + ") × " + it.qty;
      }).join(" · ");
      const cancellable = statusOf(b) === "Pending" || statusOf(b) === "Processing";
      return (
        '<div class="booking-card" data-bid="' + esc(b.id) + '">' +
          '<div class="bc-top">' +
            '<div><span class="bc-id">' + esc(b.id) + "</span>" +
              '<div class="bc-date">' + esc(b.dateLabel || b.date || "") + " · " + esc((b.method || "").toUpperCase()) + "</div></div>" +
            '<span class="badge ' + esc(statusOf(b).toLowerCase()) + '">' + esc(statusOf(b)) + "</span>" +
          "</div>" +
          '<div class="bc-body">' +
            '<div class="bc-field"><div class="f-l">Items</div><div class="f-v">' + esc(b.totalItems || (b.items || []).length + " items") + "</div></div>" +
            '<div class="bc-field"><div class="f-l">Deliver to</div><div class="f-v">' + esc((b.city || "—") + " · " + (b.pincode || "")) + "</div></div>" +
            '<div class="bc-field"><div class="f-l">Payment</div><div class="f-v">' + esc(b.method || "—") + "</div></div>" +
            '<div class="bc-total">' + money(b.total) + "</div>" +
          "</div>" +
          '<div class="bc-items">' + esc(itemsText) + "</div>" +
          '<div class="row-actions" style="margin-top:14px">' +
            (cancellable ? '<button class="mini-btn danger" data-cancel="' + esc(b.id) + '">Cancel booking</button>' : "") +
            '<button class="mini-btn" data-track-id="' + esc(b.id) + '">Track</button>' +
          "</div>" +
        "</div>"
      );
    }).join("");
  }

  function init() {
    if (!window.NB) return;
    if (!window.NB.requireLogin()) return;

    render();

    document.getElementById("bookingList").addEventListener("click", function (e) {
      const cancelBtn = e.target.closest("[data-cancel]");
      if (cancelBtn) {
        const id = cancelBtn.getAttribute("data-cancel");
        if (!confirm("Cancel booking " + id + "?")) return;
        const list = allBookings().map(function (b) {
          if (b.id === id) b.status = "Cancelled";
          return b;
        });
        saveBookings(list);
        window.NB.toast("Booking " + id + " cancelled", "info");
        render();
        return;
      }
      const trackBtn = e.target.closest("[data-track-id]");
      if (trackBtn) {
        window.NB.openTrack();
        const inp = document.getElementById("trackInput");
        if (inp) inp.value = trackBtn.getAttribute("data-track-id");
      }
    });

    document.getElementById("logoutBtn").addEventListener("click", function () {
      window.NB.clearUser();
      window.NB.toast("Signed out", "info");
      setTimeout(function () { location.href = "index.html"; }, 400);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
