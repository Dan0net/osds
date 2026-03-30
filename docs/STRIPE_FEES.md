# Stripe Fee Analysis

## Current Money Flow

OSDS uses **Stripe Connect with Destination Charges** (Express accounts for walkers).

```
Client pays gross amount
        |
        v
   Stripe processes payment
        |
        +-- Stripe keeps: ~3.4% + 20p (from the application_fee)
        +-- OSDS keeps:   remainder of application_fee (5% platform margin target)
        +-- Walker gets:  net price they set (via transfer_data.destination)
```

### Gross-Up Formula

The walker sets a net price. The client pays a grossed-up amount that covers all fees:

```
grossUp(netCents) = ceil((netCents + 20) / (1 - 0.084))

0.084 = 5% OSDS fee + 3.4% Stripe estimate
```

Example: walker sets £50 net -> client pays ~£54.31 -> walker receives £50.

### Hardcoded Constants

```
OSDS_FEE_RATE       = 0.05    // 5% platform fee
STRIPE_PERCENT_RATE = 0.034   // 3.4% (2.9% + 0.5% cross-border buffer)
STRIPE_FIXED_PENCE  = 20      // 20p per transaction
COMBINED_RATE       = 0.084   // 8.4% total variable rate
```

These are defined in `src/lib/utils.js`, `create-checkout.js`, `create-booking-request.js`, `walker-create-booking.js`, and `cancel-booking.js`.

---

## The Problem: Stripe's Fee Is Variable

Stripe's actual fee depends on the card type and origin, but we can't know which card the client will use before they pay.

| Card Type               | Stripe Fee        |
|--------------------------|-------------------|
| UK domestic (standard)   | 1.5% + 20p        |
| UK domestic (premium)    | 1.5% + 20p        |
| EU cards                 | 2.5% + 20p        |
| International cards      | 3.25% + 20p       |
| Amex                     | Higher still       |
| Corporate cards          | Varies             |

Our hardcoded 3.4% covers most cases but is not guaranteed. An exotic corporate international Amex could exceed it.

### Why We Can't Know the Fee in Advance

- Stripe does not expose the card's country or type before the charge completes.
- There is no pre-authorization hook that reveals fee details before money moves.
- Stripe Radar rules can block cards by country, but they fire during the charge — the session either succeeds or is blocked, with no middle ground.

---

## Options to Control Fee Variance

### 1. Radar Rules to Restrict Card Types (simplest)

Add Stripe Radar rules to only accept domestic UK cards:

- `block if :card_country: != 'GB'`
- `block if :card_brand: = 'amex'`

**Pros:** Guarantees the fee is always the UK domestic rate (1.5% + 20p). Our 3.4% hardcode would overestimate, so OSDS always keeps more margin than the stated 5%.

**Cons:** Blocks all non-UK clients. Amex users can't pay.

### 2. Hardcode a Conservative Rate (current approach)

Keep the worst-case estimate baked into the gross-up formula. Adjust periodically based on actual fee data from Stripe reporting.

**Pros:** Simple. No client-facing restrictions. Most transactions will cost less than estimated, increasing OSDS margin.

**Cons:** An unusually expensive card could still exceed the estimate. OSDS absorbs the rare loss.

### 3. Separate Charges and Transfers (instead of Destination Charges)

Instead of `transfer_data.destination`, charge the client on the OSDS platform account, then manually transfer to the walker after inspecting the real fee.

Flow:
1. Charge client -> money lands in OSDS Stripe account
2. Read `balance_transaction.fee` for the exact Stripe fee
3. Transfer `net_amount` to walker's Express account

**Pros:** Full control over fee allocation. Never lose money on any transaction.

**Cons:** More complex. OSDS holds funds temporarily (regulatory implications). Must manage payout timing. Walkers see delayed payouts.

### 4. Post-Charge Reconciliation

Keep destination charges but reconcile after each payment:
1. Charge goes through with estimated `application_fee_amount`
2. Fetch `balance_transaction` to see actual Stripe fee
3. If actual fee exceeded estimate, log it and adjust application fee on next charge (or accept the loss)

**Pros:** No architectural change. Gives visibility into variance.

**Cons:** Doesn't prevent the loss, only tracks it. Adjustments are retroactive.

### 5. Interchange++ Pricing (Stripe Enterprise)

On Stripe's enterprise plan, you pay the actual interchange fee + a fixed Stripe markup, giving per-transaction fee transparency.

**Pros:** Full fee visibility. Predictable Stripe markup.

**Cons:** Requires negotiation with Stripe. Needs higher transaction volume to qualify.

---

## Recommendation

For a UK-focused dog walking platform:

1. **Keep the current gross-up approach** — it's simple and works well.
2. **Add Radar rules to block non-GB cards** if the user base is strictly UK. This caps the fee at 1.5% + 20p, well within our 3.4% estimate.
3. **Monitor actual vs. estimated fees** monthly via Stripe reporting. If the average fee is consistently much lower than 3.4%, consider reducing the hardcoded rate to lower client prices.
4. **If international clients become important**, switch to separate charges and transfers (option 3) to get exact fee visibility before paying out walkers.
