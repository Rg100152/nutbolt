# 🔩 Nutbolt — Fastener Catalog & Booking System

An industrial-grade nuts, bolts, screws and washers catalog with a full
booking/checkout flow, user dashboard, admin panel and a **simulated**
payment gateway built with **Node + TypeScript + Python**.

> Developer credit: **Raj Gautam** · © 2026

---

## Features

- **Storefront** — dark matte-metallic UI, animated hero, 10 category circles.
- **Catalog** — 50 products with live search, category chips, material/size
  filters, sorting and stock badges.
- **Bulk calculator** — tiered discounts (5% at ₹5k, 10% at ₹10k), GST and
  weight-based shipping, with an animated price counter.
- **Cart drawer** — add/remove/quantity, persisted in `localStorage`.
- **Checkout** — customer details, optional GSTIN, and 4 payment modes
  (Net Banking, UPI, Card, B2B Credit) with validation.
- **Backend** — `server.ts` recomputes the total server-side to block
  client-side price tampering, then delegates to `core_payment.py`.
- **Dashboard** — login-protected; shows the user's bookings with cancel.
- **Admin panel** — all bookings (complete/delete), inventory entry for new
  products, and a one-click "raise all SS prices by X%" tool.
- **Mock auth** — any valid-looking details create a local session.
- Fully responsive; no frameworks, no external APIs.

---

## Run it (recommended: with backend)

Requires **Node 18+** and **Python 3**.

```bash
cd "nut bolt"
npm install
npm start
```

Open **http://localhost:3000** — the site and the checkout API are served
together (no CORS issues).

- `POST /api/checkout` — validates the order and simulates payment
- `GET  /api/health` — health check

If `python3` is not on your PATH, the server automatically falls back to a
Node-side simulation so checkout still works.

### Static-only mode

You can also just open `index.html` in a browser. Everything works except the
server; checkout will **simulate the payment locally** and show an info toast.
(For fully static mode, run a simple server in the folder, e.g.
`python3 -m http.server 8000`.)

---

## Project structure

```text
nut bolt/
├── index.html          # Storefront + catalog + bulk calculator
├── booking.html        # Checkout
├── login.html          # Mock login
├── dashboard.html      # My bookings
├── admin.html          # Bookings + inventory + price management
├── css/style.css       # Design system (industrial dark theme)
├── js/
│   ├── data.js         # 10 categories + 50 products (+ overrides)
│   ├── pricing.js      # Shared price/GST/shipping engine
│   ├── main.js         # Header/footer, cart, toast, track-order modal
│   ├── catalog.js      # Filters, grid, bulk calculator
│   ├── booking.js      # Checkout + payment request
│   ├── auth.js         # Mock auth
│   ├── dashboard.js    # User bookings
│   └── admin.js        # Admin tools
├── images/             # logo, hero + 10 product images
├── server.ts           # Express + TS API + static server
├── core_payment.py     # Simulated payment processor
├── package.json
└── tsconfig.json
```

---

## Data stored in the browser (`localStorage`)

| Key | Contents |
| --- | --- |
| `nutbolt_cart` | `[{ id, qty }]` |
| `nutbolt_bookings` | Array of booking objects |
| `nutbolt_user` | Signed-in user `{ name, email, phone }` |
| `nutbolt_custom_products` | Products added via the admin panel |
| `nutbolt_price_overrides` | `{ productId: newPrice }` from price hikes |

---

## How the payment flow works

1. Checkout validates all fields client-side.
2. `booking.js` computes the breakup and sends `{ method, amount, items, gstin }`.
3. `server.ts` recomputes subtotal, discount, GST and shipping **from the items**
   and compares it to the client `amount`.
4. If they differ → `FAILED` with a tampering warning (no charge).
5. If they match → `core_payment.py` simulates the bank (90% success) and
   returns a transaction ID.
6. The booking is saved with `status: "Pending"` and the cart is cleared.

> ⚠️ This is a **demo/sandbox**. It intentionally trusts client-supplied unit
> prices for the server-side recomputation. In production, prices must come
> from a database or pricing service, and real payment credentials would be
> handled by an actual gateway (Razorpay/Stripe/etc.).

---

## Image mapping

The original images were renamed for clean references:

| Original | New |
| --- | --- |
| `logo.png` | `images/logo.png` |
| `bg.png` | `images/hero-bg.png` |
| `bg1.png` | `images/hero-product.png` |
| `bg3.gif` | `images/hero-anim.gif` |
| `Pasted Image.png` | `images/product-1.png` |
| `Pasted Image (Copy 1..9).png` | `images/product-2..10.png` |

If a product photo doesn't match its category, swap the file or edit the
`img` path in `js/data.js` (`CATEGORIES` array).
