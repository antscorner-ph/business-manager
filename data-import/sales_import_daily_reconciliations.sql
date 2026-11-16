-- Create daily reconciliation rows for each sales-summary date
WITH daily_rows AS (
  SELECT '2026-09-30'::date AS date, 0::numeric(12,2) AS opening_balance, 12737.00::numeric(12,2) AS total_cash_in, 8883.84::numeric(12,2) AS total_cash_out, 3853.16::numeric(12,2) AS expected_balance
  UNION ALL SELECT '2026-09-29'::date AS date, 0::numeric(12,2) AS opening_balance, 7560.00::numeric(12,2) AS total_cash_in, 5314.65::numeric(12,2) AS total_cash_out, 2245.35::numeric(12,2) AS expected_balance
  UNION ALL SELECT '2026-09-28'::date AS date, 0::numeric(12,2) AS opening_balance, 16252.00::numeric(12,2) AS total_cash_in, 11818.29::numeric(12,2) AS total_cash_out, 4433.71::numeric(12,2) AS expected_balance
  UNION ALL SELECT '2026-09-27'::date AS date, 0::numeric(12,2) AS opening_balance, 12978.00::numeric(12,2) AS total_cash_in, 9635.39::numeric(12,2) AS total_cash_out, 3342.61::numeric(12,2) AS expected_balance
  UNION ALL SELECT '2026-09-26'::date AS date, 0::numeric(12,2) AS opening_balance, 7600.00::numeric(12,2) AS total_cash_in, 5793.84::numeric(12,2) AS total_cash_out, 1806.16::numeric(12,2) AS expected_balance
  UNION ALL SELECT '2026-09-25'::date AS date, 0::numeric(12,2) AS opening_balance, 13556.00::numeric(12,2) AS total_cash_in, 9228.10::numeric(12,2) AS total_cash_out, 4327.90::numeric(12,2) AS expected_balance
  UNION ALL SELECT '2026-09-24'::date AS date, 0::numeric(12,2) AS opening_balance, 19097.00::numeric(12,2) AS total_cash_in, 13584.66::numeric(12,2) AS total_cash_out, 5512.34::numeric(12,2) AS expected_balance
  UNION ALL SELECT '2026-09-23'::date AS date, 0::numeric(12,2) AS opening_balance, 8707.00::numeric(12,2) AS total_cash_in, 6161.80::numeric(12,2) AS total_cash_out, 2545.20::numeric(12,2) AS expected_balance
  UNION ALL SELECT '2026-09-22'::date AS date, 0::numeric(12,2) AS opening_balance, 14496.00::numeric(12,2) AS total_cash_in, 10567.54::numeric(12,2) AS total_cash_out, 3928.46::numeric(12,2) AS expected_balance
  UNION ALL SELECT '2026-09-21'::date AS date, 0::numeric(12,2) AS opening_balance, 16506.50::numeric(12,2) AS total_cash_in, 12185.13::numeric(12,2) AS total_cash_out, 4321.37::numeric(12,2) AS expected_balance
  UNION ALL SELECT '2026-09-20'::date AS date, 0::numeric(12,2) AS opening_balance, 7846.00::numeric(12,2) AS total_cash_in, 5890.77::numeric(12,2) AS total_cash_out, 1955.23::numeric(12,2) AS expected_balance
  UNION ALL SELECT '2026-09-19'::date AS date, 0::numeric(12,2) AS opening_balance, 8091.00::numeric(12,2) AS total_cash_in, 5804.48::numeric(12,2) AS total_cash_out, 2286.52::numeric(12,2) AS expected_balance
  UNION ALL SELECT '2026-09-18'::date AS date, 0::numeric(12,2) AS opening_balance, 18368.72::numeric(12,2) AS total_cash_in, 13084.36::numeric(12,2) AS total_cash_out, 5284.36::numeric(12,2) AS expected_balance
  UNION ALL SELECT '2026-09-17'::date AS date, 0::numeric(12,2) AS opening_balance, 13702.00::numeric(12,2) AS total_cash_in, 9737.38::numeric(12,2) AS total_cash_out, 3964.62::numeric(12,2) AS expected_balance
  UNION ALL SELECT '2026-09-16'::date AS date, 0::numeric(12,2) AS opening_balance, 10904.00::numeric(12,2) AS total_cash_in, 7740.53::numeric(12,2) AS total_cash_out, 3163.47::numeric(12,2) AS expected_balance
  UNION ALL SELECT '2026-09-15'::date AS date, 0::numeric(12,2) AS opening_balance, 14812.00::numeric(12,2) AS total_cash_in, 10875.22::numeric(12,2) AS total_cash_out, 3936.78::numeric(12,2) AS expected_balance
  UNION ALL SELECT '2026-09-14'::date AS date, 0::numeric(12,2) AS opening_balance, 14946.22::numeric(12,2) AS total_cash_in, 10704.31::numeric(12,2) AS total_cash_out, 4241.91::numeric(12,2) AS expected_balance
  UNION ALL SELECT '2026-09-13'::date AS date, 0::numeric(12,2) AS opening_balance, 10844.00::numeric(12,2) AS total_cash_in, 7795.59::numeric(12,2) AS total_cash_out, 3048.41::numeric(12,2) AS expected_balance
  UNION ALL SELECT '2026-09-12'::date AS date, 0::numeric(12,2) AS opening_balance, 8082.00::numeric(12,2) AS total_cash_in, 6011.54::numeric(12,2) AS total_cash_out, 2070.46::numeric(12,2) AS expected_balance
  UNION ALL SELECT '2026-09-11'::date AS date, 0::numeric(12,2) AS opening_balance, 14946.00::numeric(12,2) AS total_cash_in, 10190.73::numeric(12,2) AS total_cash_out, 4755.27::numeric(12,2) AS expected_balance
  UNION ALL SELECT '2026-09-10'::date AS date, 0::numeric(12,2) AS opening_balance, 9035.00::numeric(12,2) AS total_cash_in, 6342.60::numeric(12,2) AS total_cash_out, 2692.40::numeric(12,2) AS expected_balance
  UNION ALL SELECT '2026-09-09'::date AS date, 0::numeric(12,2) AS opening_balance, 8871.00::numeric(12,2) AS total_cash_in, 6750.13::numeric(12,2) AS total_cash_out, 2120.87::numeric(12,2) AS expected_balance
  UNION ALL SELECT '2026-09-08'::date AS date, 0::numeric(12,2) AS opening_balance, 10399.00::numeric(12,2) AS total_cash_in, 7290.32::numeric(12,2) AS total_cash_out, 3108.68::numeric(12,2) AS expected_balance
  UNION ALL SELECT '2026-09-07'::date AS date, 0::numeric(12,2) AS opening_balance, 17859.27::numeric(12,2) AS total_cash_in, 12951.19::numeric(12,2) AS total_cash_out, 4908.08::numeric(12,2) AS expected_balance
  UNION ALL SELECT '2026-09-06'::date AS date, 0::numeric(12,2) AS opening_balance, 6963.28::numeric(12,2) AS total_cash_in, 5310.29::numeric(12,2) AS total_cash_out, 1652.99::numeric(12,2) AS expected_balance
  UNION ALL SELECT '2026-09-05'::date AS date, 0::numeric(12,2) AS opening_balance, 12531.00::numeric(12,2) AS total_cash_in, 8776.25::numeric(12,2) AS total_cash_out, 3754.75::numeric(12,2) AS expected_balance
  UNION ALL SELECT '2026-09-04'::date AS date, 0::numeric(12,2) AS opening_balance, 14774.00::numeric(12,2) AS total_cash_in, 10605.90::numeric(12,2) AS total_cash_out, 4168.10::numeric(12,2) AS expected_balance
  UNION ALL SELECT '2026-09-03'::date AS date, 0::numeric(12,2) AS opening_balance, 14159.00::numeric(12,2) AS total_cash_in, 10000.11::numeric(12,2) AS total_cash_out, 4158.89::numeric(12,2) AS expected_balance
  UNION ALL SELECT '2026-09-02'::date AS date, 0::numeric(12,2) AS opening_balance, 14019.00::numeric(12,2) AS total_cash_in, 9638.21::numeric(12,2) AS total_cash_out, 4380.79::numeric(12,2) AS expected_balance
  UNION ALL SELECT '2026-09-01'::date AS date, 0::numeric(12,2) AS opening_balance, 14695.00::numeric(12,2) AS total_cash_in, 10464.36::numeric(12,2) AS total_cash_out, 4230.64::numeric(12,2) AS expected_balance
)
INSERT INTO public.daily_reconciliations (
  date, opening_balance, total_cash_in, total_cash_out, expected_balance, actual_cash, variance, status, created_at, updated_at
)
SELECT
  date,
  opening_balance,
  total_cash_in,
  total_cash_out,
  expected_balance,
  NULL,
  NULL,
  'pending',
  date::timestamp with time zone,
  date::timestamp with time zone
FROM daily_rows
ON CONFLICT (date) DO NOTHING;

INSERT INTO public.transactions (
  reconciliation_id, type, category, description, amount, transaction_date, created_at
)
WITH daily_rows AS (
  SELECT '2026-09-30'::date AS date, 0::numeric(12,2) AS opening_balance, 12737.00::numeric(12,2) AS total_cash_in, 8883.84::numeric(12,2) AS total_cash_out, 3853.16::numeric(12,2) AS expected_balance
  UNION ALL SELECT '2026-09-29'::date AS date, 0::numeric(12,2) AS opening_balance, 7560.00::numeric(12,2) AS total_cash_in, 5314.65::numeric(12,2) AS total_cash_out, 2245.35::numeric(12,2) AS expected_balance
  UNION ALL SELECT '2026-09-28'::date AS date, 0::numeric(12,2) AS opening_balance, 16252.00::numeric(12,2) AS total_cash_in, 11818.29::numeric(12,2) AS total_cash_out, 4433.71::numeric(12,2) AS expected_balance
  UNION ALL SELECT '2026-09-27'::date AS date, 0::numeric(12,2) AS opening_balance, 12978.00::numeric(12,2) AS total_cash_in, 9635.39::numeric(12,2) AS total_cash_out, 3342.61::numeric(12,2) AS expected_balance
  UNION ALL SELECT '2026-09-26'::date AS date, 0::numeric(12,2) AS opening_balance, 7600.00::numeric(12,2) AS total_cash_in, 5793.84::numeric(12,2) AS total_cash_out, 1806.16::numeric(12,2) AS expected_balance
  UNION ALL SELECT '2026-09-25'::date AS date, 0::numeric(12,2) AS opening_balance, 13556.00::numeric(12,2) AS total_cash_in, 9228.10::numeric(12,2) AS total_cash_out, 4327.90::numeric(12,2) AS expected_balance
  UNION ALL SELECT '2026-09-24'::date AS date, 0::numeric(12,2) AS opening_balance, 19097.00::numeric(12,2) AS total_cash_in, 13584.66::numeric(12,2) AS total_cash_out, 5512.34::numeric(12,2) AS expected_balance
  UNION ALL SELECT '2026-09-23'::date AS date, 0::numeric(12,2) AS opening_balance, 8707.00::numeric(12,2) AS total_cash_in, 6161.80::numeric(12,2) AS total_cash_out, 2545.20::numeric(12,2) AS expected_balance
  UNION ALL SELECT '2026-09-22'::date AS date, 0::numeric(12,2) AS opening_balance, 14496.00::numeric(12,2) AS total_cash_in, 10567.54::numeric(12,2) AS total_cash_out, 3928.46::numeric(12,2) AS expected_balance
  UNION ALL SELECT '2026-09-21'::date AS date, 0::numeric(12,2) AS opening_balance, 16506.50::numeric(12,2) AS total_cash_in, 12185.13::numeric(12,2) AS total_cash_out, 4321.37::numeric(12,2) AS expected_balance
  UNION ALL SELECT '2026-09-20'::date AS date, 0::numeric(12,2) AS opening_balance, 7846.00::numeric(12,2) AS total_cash_in, 5890.77::numeric(12,2) AS total_cash_out, 1955.23::numeric(12,2) AS expected_balance
  UNION ALL SELECT '2026-09-19'::date AS date, 0::numeric(12,2) AS opening_balance, 8091.00::numeric(12,2) AS total_cash_in, 5804.48::numeric(12,2) AS total_cash_out, 2286.52::numeric(12,2) AS expected_balance
  UNION ALL SELECT '2026-09-18'::date AS date, 0::numeric(12,2) AS opening_balance, 18368.72::numeric(12,2) AS total_cash_in, 13084.36::numeric(12,2) AS total_cash_out, 5284.36::numeric(12,2) AS expected_balance
  UNION ALL SELECT '2026-09-17'::date AS date, 0::numeric(12,2) AS opening_balance, 13702.00::numeric(12,2) AS total_cash_in, 9737.38::numeric(12,2) AS total_cash_out, 3964.62::numeric(12,2) AS expected_balance
  UNION ALL SELECT '2026-09-16'::date AS date, 0::numeric(12,2) AS opening_balance, 10904.00::numeric(12,2) AS total_cash_in, 7740.53::numeric(12,2) AS total_cash_out, 3163.47::numeric(12,2) AS expected_balance
  UNION ALL SELECT '2026-09-15'::date AS date, 0::numeric(12,2) AS opening_balance, 14812.00::numeric(12,2) AS total_cash_in, 10875.22::numeric(12,2) AS total_cash_out, 3936.78::numeric(12,2) AS expected_balance
  UNION ALL SELECT '2026-09-14'::date AS date, 0::numeric(12,2) AS opening_balance, 14946.22::numeric(12,2) AS total_cash_in, 10704.31::numeric(12,2) AS total_cash_out, 4241.91::numeric(12,2) AS expected_balance
  UNION ALL SELECT '2026-09-13'::date AS date, 0::numeric(12,2) AS opening_balance, 10844.00::numeric(12,2) AS total_cash_in, 7795.59::numeric(12,2) AS total_cash_out, 3048.41::numeric(12,2) AS expected_balance
  UNION ALL SELECT '2026-09-12'::date AS date, 0::numeric(12,2) AS opening_balance, 8082.00::numeric(12,2) AS total_cash_in, 6011.54::numeric(12,2) AS total_cash_out, 2070.46::numeric(12,2) AS expected_balance
  UNION ALL SELECT '2026-09-11'::date AS date, 0::numeric(12,2) AS opening_balance, 14946.00::numeric(12,2) AS total_cash_in, 10190.73::numeric(12,2) AS total_cash_out, 4755.27::numeric(12,2) AS expected_balance
  UNION ALL SELECT '2026-09-10'::date AS date, 0::numeric(12,2) AS opening_balance, 9035.00::numeric(12,2) AS total_cash_in, 6342.60::numeric(12,2) AS total_cash_out, 2692.40::numeric(12,2) AS expected_balance
  UNION ALL SELECT '2026-09-09'::date AS date, 0::numeric(12,2) AS opening_balance, 8871.00::numeric(12,2) AS total_cash_in, 6750.13::numeric(12,2) AS total_cash_out, 2120.87::numeric(12,2) AS expected_balance
  UNION ALL SELECT '2026-09-08'::date AS date, 0::numeric(12,2) AS opening_balance, 10399.00::numeric(12,2) AS total_cash_in, 7290.32::numeric(12,2) AS total_cash_out, 3108.68::numeric(12,2) AS expected_balance
  UNION ALL SELECT '2026-09-07'::date AS date, 0::numeric(12,2) AS opening_balance, 17859.27::numeric(12,2) AS total_cash_in, 12951.19::numeric(12,2) AS total_cash_out, 4908.08::numeric(12,2) AS expected_balance
  UNION ALL SELECT '2026-09-06'::date AS date, 0::numeric(12,2) AS opening_balance, 6963.28::numeric(12,2) AS total_cash_in, 5310.29::numeric(12,2) AS total_cash_out, 1652.99::numeric(12,2) AS expected_balance
  UNION ALL SELECT '2026-09-05'::date AS date, 0::numeric(12,2) AS opening_balance, 12531.00::numeric(12,2) AS total_cash_in, 8776.25::numeric(12,2) AS total_cash_out, 3754.75::numeric(12,2) AS expected_balance
  UNION ALL SELECT '2026-09-04'::date AS date, 0::numeric(12,2) AS opening_balance, 14774.00::numeric(12,2) AS total_cash_in, 10605.90::numeric(12,2) AS total_cash_out, 4168.10::numeric(12,2) AS expected_balance
  UNION ALL SELECT '2026-09-03'::date AS date, 0::numeric(12,2) AS opening_balance, 14159.00::numeric(12,2) AS total_cash_in, 10000.11::numeric(12,2) AS total_cash_out, 4158.89::numeric(12,2) AS expected_balance
  UNION ALL SELECT '2026-09-02'::date AS date, 0::numeric(12,2) AS opening_balance, 14019.00::numeric(12,2) AS total_cash_in, 9638.21::numeric(12,2) AS total_cash_out, 4380.79::numeric(12,2) AS expected_balance
  UNION ALL SELECT '2026-09-01'::date AS date, 0::numeric(12,2) AS opening_balance, 14695.00::numeric(12,2) AS total_cash_in, 10464.36::numeric(12,2) AS total_cash_out, 4230.64::numeric(12,2) AS expected_balance
)
SELECT
  dr.id,
  s.type,
  s.category,
  s.description,
  s.amount,
  dr.date AS transaction_date,
  dr.date::timestamp with time zone AS created_at
FROM (
  SELECT
    date,
    'cash_in'::text AS type,
    'Sales'::text AS category,
    'Net sales - ' || date::text AS description,
    total_cash_in AS amount
  FROM daily_rows

  UNION ALL

  SELECT
    date,
    'cash_out'::text AS type,
    'Cost of Goods Sold'::text AS category,
    'Cost of goods sold - ' || date::text AS description,
    total_cash_out AS amount
  FROM daily_rows
) AS s
JOIN public.daily_reconciliations dr ON dr.date = s.date;
