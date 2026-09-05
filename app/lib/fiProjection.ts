// Financial independence projection model.
//
// Every number reflects the *beginning* of its year. Year 0 is today
// (FI_START_YEAR, e.g. 2026) — exactly what you currently hold, with no
// growth applied yet: Income[0] = netIncome, Investment[0] = startingInvestment,
// Saving[0] = startingSaving, Superannuation[0] = startingSuperannuation, so
// Asset[0] is simply the sum of the three starting balances.
//
// From year 1 on, the balance you have at the *start* of year y is funded by
// the income you actually earned the year before (Income[y-1]) — that income
// was received throughout year y-1 and has become available to invest by the
// time year y begins:
//
//   Income[y]         = Income[y-1] * (1 + incomeGrowth)
//   Spending[y]        = annualSpending * (1 + inflation)^y
//   Investment[y]      = Investment[y-1] * (1 + investmentReturn) + (Income[y-1] - Spending[y-1]) * investmentPct
//   Saving[y]          = Saving[y-1] * (1 + depositReturn) + (Income[y-1] - Spending[y-1]) * (1 - investmentPct)
//   Superannuation[y]  = Superannuation[y-1] * (1 + superReturn) + Income[y-1] * superRate
//   Asset[y]           = Investment[y] + Saving[y] + Superannuation[y]
//   InvestmentSpendingRatio[y] = Investment[y] / Spending[y]
//   AssetSpendingRatio[y]      = Asset[y] / Spending[y]
//
// The reinvestment surplus is last year's income minus what you actually
// spent last year (the inflated Spending[y-1], not the fixed annual-spending
// assumption) — consistent with everything else here being funded by what
// happened the year before.

export type FIAssumptions = {
  // Income
  grossIncome: number;
  netIncome: number;
  // Starting point
  startingInvestment: number;
  startingSaving: number;
  startingSuperannuation: number;
  // Spending budget
  mainSpending: number;
  tertiaryNeeds: number;
  // Rate assumptions (all stored as decimals, e.g. 0.08 = 8%)
  investmentPct: number;
  investmentReturn: number;
  superReturn: number;
  incomeGrowth: number;
  inflation: number;
  superRate: number;
  depositReturn: number;
  // Projection length
  years: number;
};

export const DEFAULT_FI_ASSUMPTIONS: FIAssumptions = {
  grossIncome: 100000,
  netIncome: 79200,
  startingInvestment: 46000,
  startingSaving: 30000,
  startingSuperannuation: 25000,
  mainSpending: 48000,
  tertiaryNeeds: 7000,
  investmentPct: 0.8,
  investmentReturn: 0.1,
  superReturn: 0.08,
  incomeGrowth: 0.08,
  inflation: 0.03,
  superRate: 0.12,
  depositReturn: 0.02,
  years: 18,
};

// Metadata for every editable assumption — shared by the UI form (grouping,
// labels, percent formatting) and the Notion persistence layer (property
// names, percent<->stored-number conversion), so the two can't drift apart.
export type FIFieldGroup = "income" | "startingPoint" | "spendingBudget" | "rates" | "length";

export type FIFieldMeta = {
  key: keyof FIAssumptions;
  label: string;
  group: FIFieldGroup;
  percent?: boolean;
  notionProperty: string;
  // Fixed reference-point facts (what you actually hold today) rather than
  // scenario assumptions — shown read-only in the form. Still loaded from
  // and saved to Notion like any other field; edit them there, not here.
  locked?: boolean;
};

export const FI_FIELDS: FIFieldMeta[] = [
  { key: "grossIncome", label: "Gross Income", group: "income", notionProperty: "Gross Income" },
  { key: "netIncome", label: "Net Income", group: "income", notionProperty: "Net Income" },
  { key: "startingInvestment", label: "Starting Investment", group: "startingPoint", notionProperty: "Starting Investment", locked: true },
  { key: "startingSaving", label: "Starting Saving", group: "startingPoint", notionProperty: "Starting Saving", locked: true },
  { key: "startingSuperannuation", label: "Starting Superannuation", group: "startingPoint", notionProperty: "Starting Superannuation", locked: true },
  { key: "mainSpending", label: "Main Spending", group: "spendingBudget", notionProperty: "Main Spending" },
  { key: "tertiaryNeeds", label: "Tertiary Needs", group: "spendingBudget", notionProperty: "Tertiary Needs" },
  { key: "investmentPct", label: "Investment (%)", group: "rates", percent: true, notionProperty: "Investment %" },
  { key: "investmentReturn", label: "Investment return", group: "rates", percent: true, notionProperty: "Investment Return" },
  { key: "superReturn", label: "Superannuation return", group: "rates", percent: true, notionProperty: "Superannuation Return" },
  { key: "incomeGrowth", label: "Income growth rate", group: "rates", percent: true, notionProperty: "Income Growth" },
  { key: "inflation", label: "Inflation", group: "rates", percent: true, notionProperty: "Inflation" },
  { key: "superRate", label: "Superannuation rate (on net)", group: "rates", percent: true, notionProperty: "Superannuation Rate" },
  { key: "depositReturn", label: "Deposit return", group: "rates", percent: true, notionProperty: "Deposit Return" },
  { key: "years", label: "Years", group: "length", notionProperty: "Years" },
];

// Year 0 of the projection is this calendar year — a fixed reference point,
// not a scenario assumption, so it's a constant rather than an editable field.
export const FI_START_YEAR = 2026;

export type FIYearRow = {
  year: number;
  calendarYear: number;
  income: number;
  investment: number;
  saving: number;
  superannuation: number;
  spending: number;
  asset: number;
  investmentSpendingRatio: number;
  assetSpendingRatio: number;
};

export function computeFIProjection(a: FIAssumptions): FIYearRow[] {
  const annualSpending = a.mainSpending + a.tertiaryNeeds;
  const years = Math.max(0, Math.floor(a.years));

  const rows: FIYearRow[] = [];
  let income = a.netIncome;
  let investment = a.startingInvestment;
  let saving = a.startingSaving;
  let superannuation = a.startingSuperannuation;

  for (let year = 0; year <= years; year++) {
    if (year > 0) {
      // `income` still holds Income[year-1] here — last year's income (net
      // of what was actually spent last year, inflation-adjusted) funds this
      // year's opening balances. Grow it to Income[year] afterward.
      const prevSpending = annualSpending * Math.pow(1 + a.inflation, year - 1);
      const surplus = income - prevSpending;
      investment = investment * (1 + a.investmentReturn) + surplus * a.investmentPct;
      saving = saving * (1 + a.depositReturn) + surplus * (1 - a.investmentPct);
      superannuation = superannuation * (1 + a.superReturn) + income * a.superRate;
      income *= 1 + a.incomeGrowth;
    }

    const spending = annualSpending * Math.pow(1 + a.inflation, year);
    const asset = investment + saving + superannuation;

    rows.push({
      year,
      calendarYear: FI_START_YEAR + year,
      income,
      investment,
      saving,
      superannuation,
      spending,
      asset,
      investmentSpendingRatio: spending !== 0 ? investment / spending : 0,
      assetSpendingRatio: spending !== 0 ? asset / spending : 0,
    });
  }

  return rows;
}
