/* ============================================================
   NUTBOLT — Catalog data
   10 categories + 50 deterministic products.
   Plain script (no modules) so it also works from file://.
   ============================================================ */
(function () {
  "use strict";

  const CATEGORIES = [
    { id: "hex-bolt",      name: "Hex Bolts",          singular: "Hex Bolt",           icon: "🔩", img: "images/product-1.png",  basePrice: 6.0,  weight: 24, sizes: ["M6", "M8", "M10", "M12", "M16"], tagline: "The all-purpose industrial workhorse" },
    { id: "socket-bolt",   name: "Socket Head Bolts",  singular: "Socket Head Bolt",   icon: "⚙️", img: "images/product-2.png",  basePrice: 8.5,  weight: 20, sizes: ["M5", "M6", "M8", "M10", "M12"], tagline: "Allen-key driven, high torque" },
    { id: "carriage-bolt", name: "Carriage Bolts",     singular: "Carriage Bolt",      icon: "🔨", img: "images/product-3.png",  basePrice: 7.2,  weight: 30, sizes: ["M6", "M8", "M10", "M12", "M16"], tagline: "Smooth head for timber & steel" },
    { id: "hex-nut",       name: "Hex Nuts",           singular: "Hex Nut",            icon: "🔘", img: "images/product-4.png",  basePrice: 2.4,  weight: 12, sizes: ["M4", "M6", "M8", "M10", "M12"], tagline: "Standard DIN 934 precision nuts" },
    { id: "lock-nut",      name: "Lock Nuts",          singular: "Nyloc Lock Nut",     icon: "🔒", img: "images/product-5.png",  basePrice: 3.6,  weight: 14, sizes: ["M6", "M8", "M10", "M12", "M16"], tagline: "Vibration-proof nylon insert" },
    { id: "wood-screw",    name: "Wood Screws",        singular: "Wood Screw",         icon: "🪚", img: "images/product-6.png",  basePrice: 1.8,  weight: 6,  sizes: ["M3", "M4", "M5", "M6", "M8"], tagline: "Sharp deep threads for timber" },
    { id: "self-tap",      name: "Self-Tapping Screws",singular: "Self-Tapping Screw", icon: "🪛", img: "images/product-7.png",  basePrice: 1.4,  weight: 5,  sizes: ["M3", "M4", "M5", "M6", "M8"], tagline: "Cuts its own path — no pilot hole" },
    { id: "washer",        name: "Washers",            singular: "Flat Washer",        icon: "⭕", img: "images/product-8.png",  basePrice: 0.9,  weight: 4,  sizes: ["M4", "M6", "M8", "M10", "M12"], tagline: "Spreads load, protects surfaces" },
    { id: "spring-washer", name: "Spring Washers",     singular: "Spring Washer",      icon: "🌀", img: "images/product-9.png",  basePrice: 1.1,  weight: 3,  sizes: ["M4", "M6", "M8", "M10", "M12"], tagline: "Live tension against loosening" },
    { id: "anchor",        name: "Anchor Fasteners",   singular: "Anchor Bolt",        icon: "⚓", img: "images/product-10.png", basePrice: 14.0, weight: 55, sizes: ["M8", "M10", "M12", "M16", "M20"], tagline: "Heavy anchoring into concrete" }
  ];

  const MATERIALS = ["MS", "SS 304", "SS 316", "Brass", "Nylon"];

  const SIZE_FACTOR = { M3: 0.42, M4: 0.55, M5: 0.68, M6: 0.85, M8: 1.0, M10: 1.45, M12: 2.1, M16: 3.4, M20: 5.2 };
  const MATERIAL_FACTOR = { "MS": 1.0, "SS 304": 1.7, "SS 316": 2.45, "Brass": 2.9, "Nylon": 0.75 };
  const LENGTHS = { M3: "12mm", M4: "16mm", M5: "20mm", M6: "30mm", M8: "40mm", M10: "50mm", M12: "60mm", M16: "80mm", M20: "100mm" };

  function round2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }

  function buildProducts() {
    const products = [];
    let seq = 1001;
    CATEGORIES.forEach(function (cat, ci) {
      cat.sizes.forEach(function (size, si) {
        const material = MATERIALS[(ci + si) % MATERIALS.length];
        const sf = SIZE_FACTOR[size] || 1;
        const mf = MATERIAL_FACTOR[material] || 1;
        const price = round2(Math.max(0.5, cat.basePrice * sf * mf));
        const weight = Math.round(cat.weight * sf * (material === "Brass" ? 1.15 : 1));
        const length = LENGTHS[size] || "";
        const stock = 120 + ((seq * 37) % 900);
        const rating = round2(4.1 + (((seq * 7) % 9) / 10));
        const reviews = 30 + ((seq * 53) % 420);
        let badge = "";
        if (seq % 9 === 0) badge = "Best Seller";
        else if (seq % 13 === 0) badge = "New";
        else if (material === "SS 316") badge = "Marine Grade";

        products.push({
          id: "NB-" + seq,
          name: material + " " + cat.singular,
          category: cat.id,
          categoryName: cat.name,
          size: size,
          length: length,
          material: material,
          thread: MATERIALS.length && ("Coarse"),
          price: price,
          weight: weight,
          stock: stock,
          rating: rating,
          reviews: reviews,
          image: cat.img,
          icon: cat.icon,
          badge: badge,
          custom: false
        });
        seq++;
      });
    });
    return products;
  }

  const PRODUCTS = buildProducts();

  window.NUTBOLT = {
    CATEGORIES: CATEGORIES,
    MATERIALS: MATERIALS,
    PRODUCTS: PRODUCTS,
    SIZES: ["M3", "M4", "M5", "M6", "M8", "M10", "M12", "M16", "M20"],
    round2: round2,
    categoryById: function (id) { return CATEGORIES.find(function (c) { return c.id === id; }) || null; },
    productById: function (id) {
      const all = window.NUTBOLT.allProducts();
      return all.find(function (p) { return p.id === id; }) || null;
    },
    customProducts: function () {
      try { return JSON.parse(localStorage.getItem("nutbolt_custom_products") || "[]"); }
      catch (e) { return []; }
    },
    priceOverrides: function () {
      try { return JSON.parse(localStorage.getItem("nutbolt_price_overrides") || "{}"); }
      catch (e) { return {}; }
    },
    savePriceOverrides: function (map) {
      localStorage.setItem("nutbolt_price_overrides", JSON.stringify(map || {}));
    },
    allProducts: function () {
      const overrides = window.NUTBOLT.priceOverrides();
      return PRODUCTS.concat(window.NUTBOLT.customProducts()).map(function (p) {
        if (overrides[p.id] != null) {
          return Object.assign({}, p, { price: Number(overrides[p.id]), basePrice: p.price, hiked: true });
        }
        return p;
      });
    },
    saveCustomProducts: function (list) {
      localStorage.setItem("nutbolt_custom_products", JSON.stringify(list));
    }
  };
})();
