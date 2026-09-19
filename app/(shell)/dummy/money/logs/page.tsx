import { connection } from "next/server";
import AssetLogTab from "../../../../components/AssetLogTab";
import {
  DUMMY_LOG_OPTIONS,
  dummyAssetGrowthLog,
  dummyInvestmentLog,
  dummySavingsLog,
  dummyStockOptionsLog,
  dummySuperannuationLog,
} from "../../../../lib/dummyData";

export default async function DummyLogsPage() {
  await connection();
  return (
    <AssetLogTab
      assetGrowthLog={dummyAssetGrowthLog()}
      investmentLog={dummyInvestmentLog()}
      savingsLog={dummySavingsLog()}
      superannuationLog={dummySuperannuationLog()}
      stockOptionsLog={dummyStockOptionsLog()}
      brokerOptions={DUMMY_LOG_OPTIONS.brokers}
      tickerOptions={DUMMY_LOG_OPTIONS.tickers}
      bankOptions={DUMMY_LOG_OPTIONS.banks}
      accountOptions={DUMMY_LOG_OPTIONS.accounts}
      providerOptions={DUMMY_LOG_OPTIONS.providers}
      employerOptions={DUMMY_LOG_OPTIONS.employers}
    />
  );
}
