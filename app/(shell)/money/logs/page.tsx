import AssetLogTab from "../../../components/AssetLogTab";
import { getAssetGrowthLog } from "../../../lib/getAssetGrowthLog";
import { getInvestmentLog } from "../../../lib/getInvestmentLog";
import { getSavingsLog } from "../../../lib/getSavingsLog";
import { getSuperannuationLog } from "../../../lib/getSuperannuationLog";
import { getStockOptionsLog } from "../../../lib/getStockOptionsLog";
import { getSelectOptions } from "../../../lib/getSelectOptions";

export default async function LogsPage() {
  const [
    assetGrowthLog,
    investmentLog,
    savingsLog,
    superannuationLog,
    stockOptionsLog,
    brokerOptions,
    tickerOptions,
    bankOptions,
    accountOptions,
    providerOptions,
    employerOptions,
  ] = await Promise.all([
    getAssetGrowthLog(),
    getInvestmentLog(),
    getSavingsLog(),
    getSuperannuationLog(),
    getStockOptionsLog(),
    getSelectOptions(process.env.NOTION_INVESTMENTS_VALUE_LOG_ID, "Broker"),
    getSelectOptions(process.env.NOTION_INVESTMENTS_VALUE_LOG_ID, "Stock/ETF/Cash"),
    getSelectOptions(process.env.NOTION_SAVINGS_LOG_ID, "Bank"),
    getSelectOptions(process.env.NOTION_SAVINGS_LOG_ID, "Account"),
    getSelectOptions(process.env.NOTION_SUPERANNUATION_LOG_ID, "Provider"),
    getSelectOptions(process.env.NOTION_STOCK_OPTIONS_LOG_ID, "Employer"),
  ]);

  return (
    <AssetLogTab
      assetGrowthLog={assetGrowthLog}
      investmentLog={investmentLog}
      savingsLog={savingsLog}
      superannuationLog={superannuationLog}
      stockOptionsLog={stockOptionsLog}
      brokerOptions={brokerOptions}
      tickerOptions={tickerOptions}
      bankOptions={bankOptions}
      accountOptions={accountOptions}
      providerOptions={providerOptions}
      employerOptions={employerOptions}
    />
  );
}
