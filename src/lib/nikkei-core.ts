// 日経平均採用銘柄のうち、時価総額・流動性・業績安定性から
// 監視対象として有用な主要銘柄リスト（手動選定）。
// このリストから AI が候補をピックアップする。

export type CoreStock = {
  ticker: string;
  company_name: string;
  sector: string;
};

export const NIKKEI_CORE_STOCKS: CoreStock[] = [
  { ticker: "7203", company_name: "トヨタ自動車", sector: "自動車" },
  { ticker: "6758", company_name: "ソニーグループ", sector: "電機" },
  { ticker: "6861", company_name: "キーエンス", sector: "電機" },
  { ticker: "9984", company_name: "ソフトバンクグループ", sector: "情報通信" },
  { ticker: "7974", company_name: "任天堂", sector: "ゲーム" },
  { ticker: "6098", company_name: "リクルートホールディングス", sector: "サービス" },
  { ticker: "9432", company_name: "日本電信電話", sector: "情報通信" },
  { ticker: "8306", company_name: "三菱UFJフィナンシャル・グループ", sector: "銀行" },
  { ticker: "8316", company_name: "三井住友フィナンシャルグループ", sector: "銀行" },
  { ticker: "8411", company_name: "みずほフィナンシャルグループ", sector: "銀行" },
  { ticker: "6501", company_name: "日立製作所", sector: "電機" },
  { ticker: "6594", company_name: "ニデック", sector: "電機" },
  { ticker: "6954", company_name: "ファナック", sector: "機械" },
  { ticker: "6367", company_name: "ダイキン工業", sector: "機械" },
  { ticker: "4063", company_name: "信越化学工業", sector: "化学" },
  { ticker: "4503", company_name: "アステラス製薬", sector: "医薬品" },
  { ticker: "4568", company_name: "第一三共", sector: "医薬品" },
  { ticker: "4519", company_name: "中外製薬", sector: "医薬品" },
  { ticker: "7267", company_name: "ホンダ", sector: "自動車" },
  { ticker: "7741", company_name: "HOYA", sector: "精密機器" },
  { ticker: "4661", company_name: "オリエンタルランド", sector: "サービス" },
  { ticker: "9433", company_name: "KDDI", sector: "情報通信" },
  { ticker: "9434", company_name: "ソフトバンク", sector: "情報通信" },
  { ticker: "9983", company_name: "ファーストリテイリング", sector: "小売" },
  { ticker: "8001", company_name: "伊藤忠商事", sector: "商社" },
  { ticker: "8058", company_name: "三菱商事", sector: "商社" },
  { ticker: "8031", company_name: "三井物産", sector: "商社" },
  { ticker: "8035", company_name: "東京エレクトロン", sector: "半導体製造装置" },
  { ticker: "6920", company_name: "レーザーテック", sector: "半導体製造装置" },
  { ticker: "6146", company_name: "ディスコ", sector: "半導体製造装置" },
  { ticker: "4452", company_name: "花王", sector: "化学" },
  { ticker: "2914", company_name: "日本たばこ産業", sector: "食品" },
  { ticker: "3382", company_name: "セブン&アイ・ホールディングス", sector: "小売" },
  { ticker: "8766", company_name: "東京海上ホールディングス", sector: "保険" },
  { ticker: "6902", company_name: "デンソー", sector: "自動車部品" },
  { ticker: "6273", company_name: "SMC", sector: "機械" },
  { ticker: "4543", company_name: "テルモ", sector: "精密機器" },
  { ticker: "6981", company_name: "村田製作所", sector: "電子部品" },
  { ticker: "6503", company_name: "三菱電機", sector: "電機" },
  { ticker: "5108", company_name: "ブリヂストン", sector: "タイヤ" },
];
