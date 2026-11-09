/* ============================================================
   NUTBOLT — Mock authentication
   No server. Any valid-looking details create a local session.
   ============================================================ */
(function () {
  "use strict";

  function val(id) { const el = document.getElementById(id); return el ? el.value.trim() : ""; }
  function mark(fieldId, bad) {
    const el = document.getElementById(fieldId);
    if (el) el.classList.toggle("invalid", bad);
    return !bad;
  }

  function nextUrl() {
    const params = new URLSearchParams(location.search);
    const n = params.get("next");
    if (n && /^[\w.\-]+\.html$/.test(n)) return n;
    return "dashboard.html";
  }

  function init() {
    // Already signed in? Go straight to the dashboard.
    if (window.NB.getUser()) {
      location.replace(nextUrl());
      return;
    }

    const form = document.getElementById("loginForm");
    if (!form) return;

    document.querySelectorAll("#loginForm input").forEach(function (el) {
      el.addEventListener("input", function () {
        const f = el.closest(".field"); if (f) f.classList.remove("invalid");
      });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      let ok = true;
      ok = mark("f-name", val("lName").length < 2) && ok;
      ok = mark("f-email", !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val("lEmail"))) && ok;
      ok = mark("f-phone", !/^[6-9]\d{9}$/.test(val("lPhone"))) && ok;
      ok = mark("f-pass", val("lPass").length < 4) && ok;
      if (!ok) {
        window.NB.toast("Please fix the highlighted fields", "error");
        return;
      }

      const user = {
        name: val("lName"),
        email: val("lEmail").toLowerCase(),
        phone: val("lPhone"),
        loggedInAt: new Date().toISOString()
      };
      window.NB.setUser(user);
      window.NB.toast("Signed in as " + user.name, "success");
      setTimeout(function () { location.href = nextUrl(); }, 500);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
