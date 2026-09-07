# Historical Data Import Kit

This folder contains CSV templates for importing historical data that drives:
- Cash Flow
- Profit and Loss
- Balance Sheet

## Import order
1. `suppliers.csv`
2. `customers.csv`
3. `products.csv`
4. `purchase_orders.csv`
5. `purchase_order_items.csv`
6. `receivables.csv`
7. `receivable_payments.csv`
8. `expenses.csv`
9. `daily_reconciliations.csv`
10. `transactions.csv`
11. `bank_deposits.csv`
12. `bank_deposit_items.csv`

## Date format
Use `YYYY-MM-DD` for date columns and ISO datetime (`YYYY-MM-DDTHH:mm:ssZ`) for timestamp columns.

## Enum values
- `purchase_orders.payment_status`: `unpaid`, `partial`, `paid`
- `purchase_orders.status`: `pending`, `approved`, `cancelled`, `delivered`
- `expenses.status`: `paid`, `unpaid`, `partially_paid`
- `expenses.payment_method`: `cash`, `gcash`, `check`, `bank_transfer`, `other`
- `receivables.status`: `pending`, `partially_paid`, `paid`, `written_off`
- `bank_deposits.status`: `pending`, `confirmed`, `reconciled`
- `transactions.type`: `cash_in`, `cash_out`

## ID columns
For idempotent imports, keep stable IDs in CSV for tables that use UUID `id` as the primary key.

## Notes
- `purchase_orders.voucher_no` must be unique.
- `daily_reconciliations.date` must be unique.
- `purchase_order_items.line_total` should normally be `po_in_pcs * unit_cost`.
- `receivable_payments` updates receivable balances via trigger.
