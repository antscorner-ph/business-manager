-- Import November 2025 expense report entries
BEGIN;

INSERT INTO public.expenses
  (expense_date, description, category, payment_method, status, amount, notes)
VALUES
  ('2025-11-01', 'Storage Rental Fee (Steph)', 'Rental Expense', 'cash', 'paid', 0.00, 'We are setting it to 0 because the total renovation cost will be deducted from the rental income first. Payments to Steph will begin once the renovation costs have been fully covered.'),
  ('2025-11-03', 'SALARY (THEA)', 'Salaries', 'cash', 'paid', 300.00, NULL),
  ('2025-11-07', 'HYACINTH TOKEN', 'Operating Expense', 'cash', 'paid', 316.25, NULL),
  ('2025-11-07', 'SALARY (CHIN2)', 'Salaries', 'cash', 'paid', 300.00, NULL),
  ('2025-11-07', 'PLETE (DELIVER STOCKS)', 'Operating Expense', 'cash', 'paid', 20.00, NULL),
  ('2025-11-08', 'Anniversary Dinner', 'Operating Expense', 'cash', 'paid', 3954.00, NULL),
  ('2025-11-08', 'SALARY (THEA)', 'Salaries', 'cash', 'paid', 150.00, NULL),
  ('2025-11-09', 'SALARY (THEA)', 'Salaries', 'cash', 'paid', 300.00, NULL),
  ('2025-11-10', 'SALARY (BEBE) MON-SAT', 'Salaries', 'cash', 'paid', 1800.00, NULL),
  ('2025-11-12', 'SANDO BAG XL (blue)', 'Operating Expense', 'cash', 'paid', 900.00, NULL),
  ('2025-11-15', 'SALARY (THEA) SAT&SUN', 'Salaries', 'cash', 'paid', 600.00, NULL),
  ('2025-11-15', 'WIFI LOAD', 'Operating Expense', 'gcash', 'paid', 502.00, NULL),
  ('2025-11-15', 'WIFI LOAD', 'Operating Expense', 'gcash', 'paid', 502.00, NULL),
  ('2025-11-15', 'WIFI LOAD', 'Operating Expense', 'gcash', 'paid', 502.00, NULL),
  ('2025-11-16', 'LABOR (MAMA B STORAGE)', 'Store Renovation', 'cash', 'paid', 1100.00, NULL),
  ('2025-11-16', 'MATERIALS  (MAMA B STORAGE)', 'Store Renovation', 'cash', 'paid', 1693.00, NULL),
  ('2025-11-17', 'SALARY (BEBE) MON-THU', 'Salaries', 'cash', 'paid', 1200.00, NULL),
  ('2025-11-20', 'TRANSPARENT PLASTICS', 'Operating Expense', 'gcash', 'paid', 268.00, NULL),
  ('2025-11-20', 'SALARY (THEA)', 'Salaries', 'cash', 'paid', 300.00, NULL),
  ('2025-11-21', 'HAULING F''ONE DELIVERY', 'Operating Expense', 'cash', 'paid', 200.00, NULL),
  ('2025-11-22', 'SALARY (THEA) SAT&SUN', 'Salaries', 'cash', 'paid', 600.00, NULL),
  ('2025-11-22', 'TISSUE', 'Office Supply', 'cash', 'paid', 35.00, NULL),
  ('2025-11-24', 'SALARY (BEBE)', 'Salaries', 'cash', 'paid', 300.00, NULL),
  ('2025-11-27', 'MR&MS CHMSU SPONSORSHIP', 'Operating Expense', 'cash', 'unpaid', 1000.00, NULL),
  ('2025-11-27', 'MR&MS CHMSU SPONSORSHIP- SASH', 'Operating Expense', 'gcash', 'paid', 360.00, NULL),
  ('2025-11-27', 'ELECTRIC BILL', 'Utilities', 'check', 'unpaid', 1382.00, NULL),
  ('2025-11-28', 'SALARY (TEP &ROSE) OFFSET', 'Salaries', 'cash', 'paid', 6000.00, NULL),
  ('2025-11-29', 'RENTAL RODMART', 'Rental Expense', 'check', 'paid', 12500.00, NULL),
  ('2025-11-30', 'LOYVERSE SUBSCRIPTION', 'Operating Expense', 'cash', 'unpaid', 300.00, NULL),
  ('2025-11-30', 'GAS ALLOWANCE (LOPE)', 'Operating Expense', 'cash', 'unpaid', 1000.00, NULL),
  ('2025-11-30', 'GAS ALLOWANCE (JANZ)', 'Operating Expense', 'cash', 'unpaid', 1000.00, NULL),
  ('2025-11-30', 'INVENTORY WRITE-OFF', 'Inventory Write-Off', 'cash', 'paid', 3266.89, NULL);

COMMIT;
