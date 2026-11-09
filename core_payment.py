#!/usr/bin/env python3
"""
NUTBOLT — Simulated payment processor.

Reads a JSON object from stdin and writes a JSON result to stdout.

Input:
  {
    "method": "netbanking" | "upi" | "card" | "credit",
    "amount": 1652.00,
    "expected_amount": 1652.00,
    "gstin": "27ABCDE1234F1Z5",
    "bankName": "SBI",
    "vpa": "raj@okhdfcbank"
  }

Output:
  {"status": "SUCCESS", "transaction_id": "TXN...", "amount": 1652.0, ...}
  {"status": "FAILED", "error": "..."}

Security notes (demo):
  - The server is the source of truth for the amount. If the client
    amount differs from expected_amount we refuse the transaction.
  - In production, prices must be looked up from a database/pricing
    service on the server, not trusted from the client at all.
"""

import sys
import json
import random
import string

GSTIN_LENGTH = 15


def generate_transaction_id() -> str:
    chars = string.ascii_uppercase + string.digits
    return "TXN" + "".join(random.choice(chars) for _ in range(13))


def process_payment(data: dict) -> dict:
    try:
        method = str(data.get("method", "unknown"))
        amount = float(data.get("amount", 0) or 0)
        expected = float(data.get("expected_amount", amount) or amount)

        # --- Security: never trust the client-supplied amount ---
        if abs(amount - expected) > 0.01:
            return {
                "status": "FAILED",
                "error": "Security Alert: amount mismatch detected on the server.",
            }

        if amount <= 0:
            return {"status": "FAILED", "error": "Invalid order amount."}

        if method == "credit":
            gstin = str(data.get("gstin", "") or "").strip().upper()
            if len(gstin) != GSTIN_LENGTH:
                return {
                    "status": "FAILED",
                    "error": "B2B credit requires a valid 15-character GSTIN.",
                }

        if method == "upi":
            vpa = str(data.get("vpa", "") or "").strip()
            if "@" not in vpa:
                return {"status": "FAILED", "error": "Invalid UPI ID."}

        # --- Simulate a bank response: 90% success ---
        if random.random() > 0.10:
            return {
                "status": "SUCCESS",
                "transaction_id": generate_transaction_id(),
                "amount": round(amount, 2),
                "method": method,
                "msg": "Payment processed successfully (sandbox).",
            }

        return {
            "status": "FAILED",
            "error": "Bank network timeout: please retry your payment.",
        }

    except Exception as exc:  # noqa: BLE001
        return {"status": "FAILED", "error": "Internal payment error: " + str(exc)}


def main() -> None:
    try:
        raw = sys.stdin.read()
        data = json.loads(raw) if raw.strip() else {}
        print(json.dumps(process_payment(data)))
    except Exception as exc:  # noqa: BLE001
        print(json.dumps({"status": "FAILED", "error": "Invalid JSON input: " + str(exc)}))


if __name__ == "__main__":
    main()
