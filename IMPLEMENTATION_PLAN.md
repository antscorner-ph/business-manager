## Stage 1: Confirm root cause and business model
**Goal**: Verify the P&L engine was ignoring cash-out COGS transactions and that gross profit should be calculated as sales minus cost of goods sold.
**Success Criteria**: A failing regression proves COGS is currently missing from gross-profit math.
**Tests**: `computeProfitAndLoss` covers Sales, COGS, and paid operating expenses.
**Status**: Complete

## Stage 2: Implement COGS-aware gross-profit accounting
**Goal**: Add `costOfGoodsSold` and `grossProfit` support in the financial calculation layer and surface it in the P&L report.
**Success Criteria**: The report includes a gross-profit row and treats COGS as a deductible expense before net income.
**Tests**: `src/lib/financeMath.test.ts`
**Status**: In Progress

## Stage 3: Update UI / transaction inputs for cost-of-goods entries
**Goal**: Allow users to record COGS as a valid cash-out category and view the gross-profit output in the dashboard.
**Success Criteria**: The transaction form includes `Cost of Goods Sold`, and the P&L statement and summary cards reflect gross profit.
**Tests**: Manual UI validation and targeted regression suite
**Status**: In Progress

## Stage 4: Final validation
**Goal**: Confirm the finance math remains stable across the existing regression suite and build pipeline.
**Success Criteria**: `npm run test:run` and `npm run build` complete successfully.
**Tests**: Full project checks
**Status**: Pending
