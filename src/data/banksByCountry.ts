/** Country-specific bank database for Mercenta onboarding. */
export interface BankEntry {
  name: string;
  swift: string;
  accountFormat: string;
  routingLabel?: string;
  routingExample?: string;
}
export const BANKS_BY_COUNTRY: BanksByCountry = {
  "United States": [
    { name: "JPMorgan Chase", swift: "CHASUS33", accountFormat: "9-digit routing + account", routingLabel: "ABA Routing", routingExample: "021000021" },
    { name: "Bank of America", swift: "BOFAUS3N", accountFormat: "9-digit routing + account", routingLabel: "ABA Routing", routingExample: "026009593" },
    { name: "Wells Fargo", swift: "WFBIUS6S", accountFormat: "9-digit routing + account", routingLabel: "ABA Routing", routingExample: "121000248" },
    { name: "Citibank", swift: "CITIUS33", accountFormat: "9-digit routing + account", routingLabel: "ABA Routing", routingExample: "021000089" },
  ],
  Canada: [
    { name: "Royal Bank of Canada", swift: "ROYCCAT2", accountFormat: "Inst+Transit+Account", routingLabel: "Transit #", routingExample: "00010-12345" },
    { name: "TD Canada Trust", swift: "TDOMCATTTOR", accountFormat: "Inst+Transit+Account", routingLabel: "Transit #", routingExample: "0004-12345" },
    { name: "Scotiabank", swift: "NOSCCATT", accountFormat: "Inst+Transit+Account", routingLabel: "Transit #", routingExample: "0002-12345" },
  ],
  Germany: [
    { name: "Deutsche Bank", swift: "DEUTDEFF", accountFormat: "IBAN DE22 5007 0010...", routingLabel: "BLZ", routingExample: "50070010" },
    { name: "Commerzbank", swift: "COBADEFF", accountFormat: "IBAN DE22 5004 0000...", routingLabel: "BLZ", routingExample: "50040000" },
  ],
  France: [
    { name: "BNP Paribas", swift: "BNPAFRPP", accountFormat: "IBAN FR22 3000...", routingLabel: "Code Banque", routingExample: "30004" },
    { name: "Societe Generale", swift: "SOGEFRPP", accountFormat: "IBAN FR22 3000...", routingLabel: "Code Banque", routingExample: "30003" },
  ],
  Italy: [
    { name: "Intesa Sanpaolo", swift: "BCITITMM", accountFormat: "IBAN IT22 X...", routingLabel: "ABI/CAB", routingExample: "03069/03396" },
    { name: "UniCredit", swift: "UNCRITMM", accountFormat: "IBAN IT22 X...", routingLabel: "ABI/CAB", routingExample: "02008/12345" },
  ],
  Netherlands: [
    { name: "ING Bank", swift: "INGBNL2A", accountFormat: "IBAN NL22 INGB...", routingLabel: "BIC", routingExample: "INGBNL2A" },
    { name: "ABN AMRO", swift: "ABNANL2A", accountFormat: "IBAN NL22 ABNA...", routingLabel: "BIC", routingExample: "ABNANL2A" },
    { name: "Rabobank", swift: "RABONL2U", accountFormat: "IBAN NL22 RABO...", routingLabel: "BIC", routingExample: "RABONL2U" },
  ],
  Spain: [
    { name: "Banco Santander", swift: "BSCHESMM", accountFormat: "IBAN ES22 0049...", routingLabel: "CCC", routingExample: "0049-1234-56" },
    { name: "BBVA", swift: "BBVAESMM", accountFormat: "IBAN ES22 0182...", routingLabel: "CCC", routingExample: "0182-1234-56" },
  ],
  "United Kingdom": [
    { name: "HSBC UK", swift: "HBUKGB4B", accountFormat: "SC + Account Number", routingLabel: "Sort Code", routingExample: "40-12-34" },
    { name: "Barclays", swift: "BARCGB22", accountFormat: "SC + Account Number", routingLabel: "Sort Code", routingExample: "20-12-34" },
    { name: "Lloyds Bank", swift: "LOYDGB21", accountFormat: "SC + Account Number", routingLabel: "Sort Code", routingExample: "30-12-34" },
    { name: "NatWest", swift: "NWBKGB2L", accountFormat: "SC + Account Number", routingLabel: "Sort Code", routingExample: "50-12-34" },
  ],
  Zimbabwe: [
    { name: "CBZ Bank", swift: "CBZZZWHX", accountFormat: "7-digit account", routingLabel: "Branch", routingExample: "3001" },
    { name: "Stanbic Zimbabwe", swift: "SBICZWHX", accountFormat: "7-10 digit account", routingLabel: "Branch", routingExample: "3301" },
    { name: "NMB Bank", swift: "NMBAZWHX", accountFormat: "7-digit account", routingLabel: "Branch", routingExample: "5101" },
    { name: "FBC Bank", swift: "FBCPZWHX", accountFormat: "7-10 digit account", routingLabel: "Branch", routingExample: "6501" },
  ],
  "South Africa": [
    { name: "Standard Bank", swift: "SBZAZAJJ", accountFormat: "BC + 10-digit acc", routingLabel: "Branch Code", routingExample: "051001" },
    { name: "FNB", swift: "FIRNZAJJ", accountFormat: "BC + 10-digit acc", routingLabel: "Branch Code", routingExample: "250655" },
    { name: "Absa Bank", swift: "ABSAZAJJ", accountFormat: "BC + 10-digit acc", routingLabel: "Branch Code", routingExample: "632005" },
    { name: "Nedbank", swift: "NEDSZAJJ", accountFormat: "BC + 10-digit acc", routingLabel: "Branch Code", routingExample: "198765" },
  ],
  Kenya: [
    { name: "KCB Bank", swift: "KCBLKENX", accountFormat: "8-15 digit account", routingLabel: "Branch", routingExample: "110" },
    { name: "Equity Bank", swift: "EQBLKENA", accountFormat: "8-15 digit account", routingLabel: "Branch", routingExample: "068" },
    { name: "Co-op Bank", swift: "COOPKENA", accountFormat: "8-15 digit account", routingLabel: "Branch", routingExample: "001" },
  ],
  Nigeria: [
    { name: "Access Bank", swift: "ACCINGLA", accountFormat: "10-digit NUBAN", routingLabel: "Bank Code", routingExample: "000" },
    { name: "Zenith Bank", swift: "ZEIBNGLA", accountFormat: "10-digit NUBAN", routingLabel: "Bank Code", routingExample: "057" },
    { name: "GTBank", swift: "GTBINGLA", accountFormat: "10-digit NUBAN", routingLabel: "Bank Code", routingExample: "058" },
    { name: "First Bank Nigeria", swift: "FBNINGLA", accountFormat: "10-digit NUBAN", routingLabel: "Bank Code", routingExample: "011" },
  ],
  Ghana: [
    { name: "GCB Bank", swift: "GCBKGHAC", accountFormat: "10-15 digit account", routingLabel: "Branch", routingExample: "101" },
    { name: "Ecobank Ghana", swift: "ECOCHGHA", accountFormat: "10-15 digit account", routingLabel: "Branch", routingExample: "201" },
    { name: "Stanbic Ghana", swift: "SBICGHAC", accountFormat: "10-15 digit account", routingLabel: "Branch", routingExample: "191" },
  ],
  Ethiopia: [
    { name: "CBE", swift: "CBETETAA", accountFormat: "7-14 digit account", routingLabel: "Branch", routingExample: "101" },
    { name: "Dashen Bank", swift: "DASHETAA", accountFormat: "7-14 digit account", routingLabel: "Branch", routingExample: "202" },
    { name: "Awash Bank", swift: "AWINETAA", accountFormat: "7-14 digit account", routingLabel: "Branch", routingExample: "303" },
  ],
  Tanzania: [
    { name: "CRDB Bank", swift: "CRDBTZTZ", accountFormat: "8-15 digit account", routingLabel: "Branch", routingExample: "001" },
    { name: "NMB Tanzania", swift: "NMBATZTZ", accountFormat: "8-15 digit account", routingLabel: "Branch", routingExample: "002" },
    { name: "NBC Bank", swift: "NLCBTZTZ", accountFormat: "8-15 digit account", routingLabel: "Branch", routingExample: "003" },
  ],
  Rwanda: [
    { name: "Bank of Kigali", swift: "BKIGRWRW", accountFormat: "8-16 digit account", routingLabel: "Branch", routingExample: "001" },
    { name: "Equity Rwanda", swift: "EQBLRWRW", accountFormat: "8-16 digit account", routingLabel: "Branch", routingExample: "002" },
    { name: "I&M Bank Rwanda", swift: "IMBCRWRW", accountFormat: "8-16 digit account", routingLabel: "Branch", routingExample: "003" },
  ],
};