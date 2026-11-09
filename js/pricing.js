/* ============================================================
   NUTBOLT — Shared pricing engine
   NOTE: This formula is intentionally mirrored in server.ts.
   If you change it here, change it there too.
   ============================================================ */
(function () {
  "use strict";

  const GST_RATE = 0.18;

  function round2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }

  function discountRateFor(subtotal) {
    if (subtotal >= 10000) return 0.10;   // Platinum
    if (subtotal >= 5000) return 0.05;    // Gold
    return 0;                              // Standard
  }

  function tierNameFor(rate) {
    if (rate >= 0.10) return "Platinum Tier · 10% off";
    if (rate >= 0.05) return "Gold Tier · 5% off";
    return "Standard Rate";
  }

  function shippingFor(weightGrams, subtotal) {
    if (!subtotal || !weightGrams) return 0;
    return Math.max(60, Math.ceil(weightGrams / 1000) * 12);
  }

  // items: [{ price, qty, weight }]
  function computeBreakup(items) {
    let subtotal = 0;
    let weight = 0;
    (items || []).forEach(function (it) {
      const qty = Number(it.qty) || 0;
      subtotal += (Number(it.price) || 0) * qty;
      weight += (Number(it.weight) || 0) * qty;
    });
    subtotal = round2(subtotal);
    const rate = discountRateFor(subtotal);
    const discount = round2(subtotal * rate);
    const taxable = round2(subtotal - discount);
    const gst = round2(taxable * GST_RATE);
    const shipping = shippingFor(weight, subtotal);
    const total = round2(taxable + gst + shipping);
    return {
      subtotal: subtotal,
      discountRate: rate,
      discount: discount,
      taxable: taxable,
      gst: gst,
      shipping: shipping,
      total: total,
      weightGrams: weight,
      tier: tierNameFor(rate)
    };
  }

  function formatINR(n) {
    const v = Number(n) || 0;
    return "₹" + v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatINRCompact(n) {
    const v = Number(n) || 0;
    return "₹" + v.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  }

  window.NUTBOLT_PRICING = {
    GST_RATE: GST_RATE,
    round2: round2,
    computeBreakup: computeBreakup,
    discountRateFor: discountRateFor,
    tierNameFor: tierNameFor,
    formatINR: formatINR,
    formatINRCompact: formatINRCompact
  };
})();
