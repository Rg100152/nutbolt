/* ============================================================
   NUTBOLT — Node + TypeScript API
   Serves the static site and provides /api/checkout, which
   re-computes the total server-side (anti price-tampering) and
   delegates the simulated bank response to core_payment.py.
   ============================================================ */
import express, { Request, Response } from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { spawn } from "child_process";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Works both under ts-node (project root) and compiled dist/.
const ROOT = fs.existsSync(path.join(__dirname, "index.html"))
  ? __dirname
  : path.resolve(__dirname, "..");

app.use(cors());
app.use(express.json({ limit: "256kb" }));
app.use(express.static(ROOT));

/* ----------------------------- pricing (mirror of js/pricing.js) ----------------------------- */
const GST_RATE = 0.18;

interface CartItem { id?: string; name?: string; price: number; qty: number; weight?: number; }
interface CheckoutBody {
  method?: string;
  amount?: number;
  items?: CartItem[];
  gstin?: string;
  bankName?: string;
  vpa?: string;
}
interface Breakup {
  subtotal: number; discountRate: number; discount: number; taxable: number;
  gst: number; shipping: number; total: number; weightGrams: number;
}
interface PaymentResult {
  status: "SUCCESS" | "FAILED";
  transaction_id?: string;
  amount?: number;
  method?: string;
  msg?: string;
  error?: string;
  source?: "python" | "node-fallback" | "local";
}

function round2(n: number): number { return Math.round((n + Number.EPSILON) * 100) / 100; }

function discountRateFor(subtotal: number): number {
  if (subtotal >= 10000) return 0.10;
  if (subtotal >= 5000) return 0.05;
  return 0;
}

function computeBreakup(items: CartItem[]): Breakup {
  let subtotal = 0;
  let weight = 0;
  for (const it of items) {
    const qty = Number(it.qty) || 0;
    subtotal += (Number(it.price) || 0) * qty;
    weight += (Number(it.weight) || 0) * qty;
  }
  subtotal = round2(subtotal);
  const rate = discountRateFor(subtotal);
  const discount = round2(subtotal * rate);
  const taxable = round2(subtotal - discount);
  const gst = round2(taxable * GST_RATE);
  const shipping = (!subtotal || !weight) ? 0 : Math.max(60, Math.ceil(weight / 1000) * 12);
  const total = round2(taxable + gst + shipping);
  return { subtotal, discountRate: rate, discount, taxable, gst, shipping, total, weightGrams: weight };
}

/* ----------------------------- simulated fallback ----------------------------- */
function randTxn(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let s = "";
  for (let i = 0; i < 13; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
  return "TXN" + s;
}

function simulateInNode(payload: { method?: string; amount: number }): PaymentResult {
  if (Math.random() > 0.1) {
    return { status: "SUCCESS", transaction_id: randTxn(), amount: round2(payload.amount), method: payload.method, msg: "Payment successful (node fallback).", source: "node-fallback" };
  }
  return { status: "FAILED", error: "Bank network timeout. Please retry.", source: "node-fallback" };
}

/* ----------------------------- python bridge ----------------------------- */
function runPython(payload: Record<string, unknown>): Promise<PaymentResult> {
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn("python3", [path.join(ROOT, "core_payment.py")]);
    } catch (err) {
      resolve(simulateInNode({ method: payload.method as string, amount: Number(payload.amount) }));
      return;
    }

    let out = "";
    let settled = false;

    child.stdout.on("data", (d: Buffer) => { out += d.toString(); });
    child.on("error", () => {
      if (settled) return;
      settled = true;
      // python3 not available — degrade gracefully
      resolve(simulateInNode({ method: payload.method as string, amount: Number(payload.amount) }));
    });
    child.on("close", () => {
      if (settled) return;
      settled = true;
      try {
        const parsed = JSON.parse(out.trim()) as PaymentResult;
        parsed.source = "python";
        resolve(parsed);
      } catch (e) {
        resolve({ status: "FAILED", error: "Payment service returned an invalid response.", source: "python" });
      }
    });

    try {
      child.stdin.write(JSON.stringify(payload));
      child.stdin.end();
    } catch (e) {
      if (settled) return;
      settled = true;
      resolve(simulateInNode({ method: payload.method as string, amount: Number(payload.amount) }));
    }
  });
}

/* ----------------------------- routes ----------------------------- */
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ ok: true, service: "nutbolt-checkout", time: new Date().toISOString() });
});

app.post("/api/checkout", async (req: Request, res: Response) => {
  const body = req.body as CheckoutBody;

  if (!body || !Array.isArray(body.items) || body.items.length === 0) {
    res.status(400).json({ status: "FAILED", error: "Cart is empty or items are missing." });
    return;
  }

  for (const it of body.items) {
    if (typeof it.price !== "number" || it.price < 0 || typeof it.qty !== "number" || it.qty <= 0) {
      res.status(400).json({ status: "FAILED", error: "Invalid cart item payload." });
      return;
    }
  }

  const server = computeBreakup(body.items);
  const clientAmount = round2(Number(body.amount) || 0);

  // Anti price-tampering: server total is the source of truth.
  if (Math.abs(clientAmount - server.total) > 0.01) {
    res.status(400).json({
      status: "FAILED",
      error: "Security Alert: price tampering detected — client total does not match the server total.",
      serverTotal: server.total
    });
    return;
  }

  const result = await runPython({
    method: body.method || "unknown",
    amount: server.total,
    expected_amount: server.total,
    gstin: body.gstin || "",
    bankName: body.bankName || "",
    vpa: body.vpa || ""
  });

  if (result.status === "SUCCESS") {
    res.status(200).json({ ...result, breakup: server });
  } else {
    res.status(400).json({ ...result, breakup: server });
  }
});

app.listen(PORT, () => {
  console.log("");
  console.log("  🔩  NUTBOLT server running");
  console.log("  →  http://localhost:" + PORT);
  console.log("  ⚡  Checkout API: POST /api/checkout");
  console.log("");
});
