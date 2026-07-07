---
name: Inventory adjustStock semantics
description: How the four inventory transaction types work in StateService.adjustStock().
---

## Rule
`StateService.adjustStock(itemId, type, quantity, notes, repairId?)`:

| type | meaning of `quantity` param | resulting `quantity_after` |
|------|-------------------------------|---------------------------|
| `receive` | units to add | before + quantity |
| `return` | units to add back | before + quantity |
| `use` | units to consume (clamped to available) | before - min(quantity, before) |
| `adjust` | absolute target stock level | quantity (direct set) |

**Why:** `adjust` is a manual correction (e.g. stock count); `use` is operational consumption. Allowing `adjust` to set 0 is intentional (write-off). The transaction records the effective delta, not the requested quantity, to keep history accurate.

**Guard:** `type !== 'adjust' && quantity <= 0` → early return (no-op). `adjust` accepts 0.
