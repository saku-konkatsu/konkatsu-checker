import { useState } from "react";

const INCOME_OPTIONS = [
  { label: "こだわらない",  value: 1.00, min: 0    },
  { label: "400万以上",    value: 0.70, min: 400   },
  { label: "500万以上",    value: 0.45, min: 500   },
  { label: "600万以上",    value: 0.25, min: 600   },
  { label: "700万以上",    value: 0.12, min: 700   },
  { label: "800万以上",    value: 0.06, min: 800   },
  { label: "1000万以上",   value: 0.025,min: 1000  },
];
const EDU_OPTIONS = [
  { label: "こだわらない",        value: 1.0  },
  { label: "大卒以上",            value: 0.6  },
  { label: "GMARCH・関関同立以上",  value: 0.15 },
  { label: "早慶上智・旧帝大以上", value: 0.05 },
];
const HEIGHT_OPTIONS = [
  { label: "こだわらない", value: 1.0  },
  { label: "165cm以上",   value: 0.86 },
  { label: "170cm以上",   value: 0.58 },
  { label: "175cm以上",   value: 0.26 },
];
const MY_AGE_OPTIONS = [
  { label: "25歳以下",  value: 25 },
  { label: "26〜28歳", value: 27 },
  { label: "29〜31歳", value: 30 },
  { label: "32〜34歳", value: 33 },
  { label: "35歳以上", value: 36 },
];
// 女性側年収（男性と同じ切り口）
const MY_INCOME_OPTIONS = [
  { label: "400万未満",  value: 350, min: 0    },
  { label: "400万以上",  value: 450, min: 400  },
  { label: "500万以上",  value: 550, min: 500  },
  { label: "600万以上",  value: 700, min: 600  },
  { label: "800万以上",  value: 900, min: 800  },
];
// 女性側学歴（上昇婚判定に使用）
const MY_EDU_OPTIONS = [
  { label: "高卒・専門卒",           value: "high"  },
  { label: "大卒以上",               value: "univ"  },
  { label: "GMARCH・関関同立以上",   value: "march" },
  { label: "早慶上智・旧帝大以上",   value: "top"   },
];
// 女性学歴 → 男性学歴グループのマッピング（上昇婚判定）
const MY_EDU_RANK = { high:0, univ:1, march:2, top:3 };
const IDEAL_EDU_RANK = { 1.0:0, 0.6:1, 0.15:2, 0.05:3 };

const TOGGLES = [
  { id:"age",    label:"同年代（±3歳以内）",  sub:"年上・年下不問の場合はOFF",        value:0.30, adviceLabel:"同年代条件をなくすと" },
  { id:"loc",    label:"都内・近郊在住限定",    sub:"遠距離不可の場合はON",             value:0.30, adviceLabel:"都内在住条件をなくすと" },
  { id:"job",    label:"正社員・安定職限定",    sub:"フリーランス・自営不可の場合はON", value:0.75, adviceLabel:"職種条件を緩めると" },
  { id:"single", label:"バツイチを除く",        sub:"初婚限定の場合はON",               value:0.80, adviceLabel:"バツイチOKにすると" },
  { id:"alc",    label:"お酒を飲まない",        sub:"下戸・禁酒の相手を求める場合はON", value:0.35, adviceLabel:"飲酒OKにすると" },
  { id:"smoke",  label:"タバコを吸わない",      sub:"非喫煙者限定の場合はON",           value:0.70, adviceLabel:"喫煙OKにすると" },
];

const AGE_POPULATION = { 25:176, 27:146, 30:197, 33:161, 36:27 };
const TOTAL_POPULATION = 610;

// ===== 相関補正テーブル =====
// 同年代OFFのとき: 全年代加重平均の学歴内年収割合を使用（未婚男性人口で加重）
// 出典: 年齢帯別未婚男性人口（国勢調査）で加重平均
const INCOME_EDU_PROB_ALL = {
  "400_0.6":0.615, "500_0.6":0.381, "600_0.6":0.195, "700_0.6":0.078, "800_0.6":0.024, "1000_0.6":0.010,
  "400_0.15":0.706,"500_0.15":0.501,"600_0.15":0.313,"700_0.15":0.167,"800_0.15":0.072,"1000_0.15":0.010,
  "400_0.05":0.811,"500_0.05":0.656,"600_0.05":0.493,"700_0.05":0.340,"800_0.05":0.206,"1000_0.05":0.044,
};
// 全男性ベース（既婚・未婚混在）の学歴内年収割合
// 出典: 22〜35歳全男性人口で加重平均（全男性は30代が多いため未婚より高めになる）
const INCOME_EDU_PROB_ALL_MALE = {
  "400_0.6":0.654,"500_0.6":0.429,"600_0.6":0.235,"700_0.6":0.103,"800_0.6":0.034,"1000_0.6":0.010,
  "400_0.15":0.742,"500_0.15":0.552,"600_0.15":0.367,"700_0.15":0.212,"800_0.15":0.100,"1000_0.15":0.011,
  "400_0.05":0.837,"500_0.05":0.699,"600_0.05":0.548,"700_0.05":0.397,"800_0.05":0.257,"1000_0.05":0.065,
};
// 学歴→年収の因果関係を正しく反映
// 計算式: rate = edu_val × P(年収≥X | 学歴, 年齢) × height_val
// P(年収≥X | 学歴, 年齢) = 各学歴・年齢帯の中で年収X以上の割合
// 出典: OpenWork「出身大学別年収」+ 厚労省「賃金構造基本統計調査」令和5年を正規分布で近似
const INCOME_EDU_AGE_PROB = {
    "25_400_0.6": 0.262,
  "25_500_0.6": 0.061,
  "25_600_0.6": 0.01,
  "25_700_0.6": 0.01,
  "25_800_0.6": 0.01,
  "25_1000_0.6": 0.01,
  "25_400_0.15": 0.369,
  "25_500_0.15": 0.122,
  "25_600_0.15": 0.023,
  "25_700_0.15": 0.01,
  "25_800_0.15": 0.01,
  "25_1000_0.15": 0.01,
  "25_400_0.05": 0.5,
  "25_500_0.05": 0.221,
  "25_600_0.05": 0.062,
  "25_700_0.05": 0.011,
  "25_800_0.05": 0.01,
  "25_1000_0.05": 0.01,
  "27_400_0.6": 0.5,
  "27_500_0.6": 0.202,
  "27_600_0.6": 0.048,
  "27_700_0.6": 0.01,
  "27_800_0.6": 0.01,
  "27_1000_0.6": 0.01,
  "27_400_0.15": 0.591,
  "27_500_0.15": 0.295,
  "27_600_0.15": 0.095,
  "27_700_0.15": 0.019,
  "27_800_0.15": 0.01,
  "27_1000_0.15": 0.01,
  "27_400_0.05": 0.755,
  "27_500_0.05": 0.5,
  "27_600_0.05": 0.245,
  "27_700_0.05": 0.084,
  "27_800_0.05": 0.019,
  "27_1000_0.05": 0.01,
  "30_400_0.6": 0.762,
  "30_500_0.6": 0.5,
  "30_600_0.6": 0.238,
  "30_700_0.6": 0.077,
  "30_800_0.6": 0.016,
  "30_1000_0.6": 0.01,
  "30_400_0.15": 0.857,
  "30_500_0.15": 0.655,
  "30_600_0.15": 0.395,
  "30_700_0.15": 0.175,
  "30_800_0.15": 0.055,
  "30_1000_0.15": 0.01,
  "30_400_0.05": 0.96,
  "30_500_0.05": 0.87,
  "30_600_0.05": 0.691,
  "30_700_0.05": 0.45,
  "30_800_0.05": 0.227,
  "30_1000_0.05": 0.023,
  "33_400_0.6": 0.871,
  "33_500_0.6": 0.68,
  "33_600_0.6": 0.421,
  "33_700_0.6": 0.193,
  "33_800_0.6": 0.063,
  "33_1000_0.6": 0.01,
  "33_400_0.15": 0.948,
  "33_500_0.15": 0.841,
  "33_600_0.15": 0.646,
  "33_700_0.15": 0.401,
  "33_800_0.15": 0.191,
  "33_1000_0.15": 0.017,
  "33_400_0.05": 0.989,
  "33_500_0.05": 0.957,
  "33_600_0.05": 0.873,
  "33_700_0.05": 0.716,
  "33_800_0.05": 0.5,
  "33_1000_0.05": 0.127,
  "36_400_0.6": 0.922,
  "36_500_0.6": 0.781,
  "36_600_0.6": 0.551,
  "36_700_0.6": 0.303,
  "36_800_0.6": 0.123,
  "36_1000_0.6": 0.01,
  "36_400_0.15": 0.977,
  "36_500_0.15": 0.918,
  "36_600_0.15": 0.785,
  "36_700_0.15": 0.572,
  "36_800_0.15": 0.336,
  "36_1000_0.15": 0.051,
  "36_400_0.05": 0.99,
  "36_500_0.05": 0.98,
  "36_600_0.05": 0.933,
  "36_700_0.05": 0.828,
  "36_800_0.05": 0.651,
  "36_1000_0.05": 0.235,
};
const EDU_LOC_CORR    = { 1.0:1.00, 0.6:1.27, 0.15:2.07, 0.05:1.73 };
const INCOME_JOB_CORR = { 0:1.0, 400:1.05, 500:1.10, 600:1.25, 700:1.30, 800:1.35, 1000:1.40 };
const AGE_SINGLE_CORR = { 25:0.984, 27:0.974, 30:0.937, 33:0.885, 36:0.822 };
const AGE_LOC_CORR    = 2.0;
const JOB_LOC_CORR    = 1.2;
const HEIGHT_INCOME_CORR = {
  "0.7_400":1.05,"0.7_500":1.08,"0.7_600":1.10,"0.7_700":1.12,"0.7_800":1.12,"0.7_1000":1.12,
  "0.45_400":1.07,"0.45_500":1.10,"0.45_600":1.12,"0.45_700":1.15,"0.45_800":1.15,"0.45_1000":1.15,
  "0.15_400":1.10,"0.15_500":1.13,"0.15_600":1.15,"0.15_700":1.18,"0.15_800":1.18,"0.15_1000":1.18,
};

function calcRate(incomeOpt, eduOpt, heightOpt, toggleState, myAgeVal) {
  // 学歴→年収の因果関係を正しく反映
  // 同年代ON → 年齢別PROB（その年代の実態）
  // 同年代OFF → 全年代加重平均PROB（年齢を問わない場合）
  let rate = incomeOpt.value * eduOpt.value * heightOpt.value;
  if (incomeOpt.min > 0 && eduOpt.value < 1.0) {
    const useAge = toggleState["age"] && myAgeVal;
    let prob;
    if (useAge) {
      prob = INCOME_EDU_AGE_PROB[`${myAgeVal}_${incomeOpt.min}_${eduOpt.value}`];
    } else {
      prob = INCOME_EDU_PROB_ALL[`${incomeOpt.min}_${eduOpt.value}`];
    }
    if (prob !== undefined) rate = eduOpt.value * prob * heightOpt.value;
  }
  if (heightOpt.value < 1.0 && incomeOpt.min > 0) {
    const hCorr = HEIGHT_INCOME_CORR[`${heightOpt.value}_${incomeOpt.min}`];
    if (hCorr) rate *= hCorr;
  }
  const bothAgeAndLoc = toggleState["age"] && toggleState["loc"];
  TOGGLES.forEach(t => {
    if (!toggleState[t.id]) return;
    if (t.id === "age") {
      rate *= t.value;
    } else if (t.id === "loc") {
      rate *= t.value * (EDU_LOC_CORR[eduOpt.value] ?? 1.0);
      if (bothAgeAndLoc) rate *= AGE_LOC_CORR;
    } else if (t.id === "job") {
      rate *= t.value * (INCOME_JOB_CORR[incomeOpt.min] ?? 1.0);
      if (toggleState["loc"]) rate *= JOB_LOC_CORR;
    } else if (t.id === "smoke" && incomeOpt.min >= 600) {
      rate *= t.value * 1.05;
    } else if (t.id === "single") {
      rate *= myAgeVal ? (AGE_SINGLE_CORR[myAgeVal] ?? 0.90) : 0.90;
    } else {
      rate *= t.value;
    }
  });
  return Math.max(Math.min(rate, 1.0), 0.0005);
}

function getPopulation(toggleState, myAgeVal) {
  if (toggleState["age"] && myAgeVal && AGE_POPULATION[myAgeVal]) return AGE_POPULATION[myAgeVal];
  return TOTAL_POPULATION;
}

// 分母から始めて各条件で絞り込むさまを表示
function buildBreakdown(incomeOpt, eduOpt, heightOpt, ts, myAgeVal, pop) {
  const steps = [];
  let running = 1.0;
  // 分母（全員）を最初のステップとして追加
  const popLabel = ts["age"] && myAgeVal && AGE_POPULATION[myAgeVal]
    ? `対象：${AGE_POPULATION[myAgeVal]}万人（同年代未婚男性）`
    : `対象：${pop}万人（22〜35歳未婚男性）`;
  steps.push({ label: popLabel, rate: 1.0, coeff: 1.0, isBase: true });

  // 学歴（先に確定）→ 年収（学歴内の割合で確定）
  if (eduOpt.value < 1.0) {
    // STEP1: 学歴で絞り込む
    running *= eduOpt.value;
    steps.push({ label:`学歴 ${eduOpt.label}`, rate: running, coeff: eduOpt.value, isBase: false });

    // STEP2: その学歴内で年収条件を適用
    // 同年代ON → 年齢別PROB、同年代OFF → 全年代加重平均PROB
    if (incomeOpt.min > 0) {
      const prev = running;
      const useAge = ts["age"] && myAgeVal;
      const prob = useAge
        ? INCOME_EDU_AGE_PROB[`${myAgeVal}_${incomeOpt.min}_${eduOpt.value}`]
        : INCOME_EDU_PROB_ALL[`${incomeOpt.min}_${eduOpt.value}`];
      if (prob !== undefined) {
        running = eduOpt.value * prob;
        steps.push({ label:`年収 ${incomeOpt.label}（${eduOpt.label}内での割合）`, rate: running, coeff: running / (prev || 1), isBase: false });
      } else {
        running *= incomeOpt.value;
        steps.push({ label:`年収 ${incomeOpt.label}`, rate: running, coeff: incomeOpt.value, isBase: false });
      }
    }
  } else {
    // 学歴こだわりなし → 年収のみで絞り込む
    if (incomeOpt.min > 0) {
      running *= incomeOpt.value;
      steps.push({ label:`年収 ${incomeOpt.label}`, rate: running, coeff: incomeOpt.value, isBase: false });
    }
  }

  // 身長
  if (heightOpt.value < 1.0) {
    const prev = running;
    running *= heightOpt.value;
    if (incomeOpt.min > 0) running *= HEIGHT_INCOME_CORR[`${heightOpt.value}_${incomeOpt.min}`] ?? 1.0;
    steps.push({ label:`身長 ${heightOpt.label}`, rate: running, coeff: running / (prev || 1), isBase: false });
  }

  // トグル
  const bothAgeAndLoc = ts["age"] && ts["loc"];
  TOGGLES.forEach(t => {
    if (!ts[t.id]) return;
    const prev = running;
    if (t.id === "age") {
      running *= t.value;
    } else if (t.id === "loc") {
      running *= t.value * (EDU_LOC_CORR[eduOpt.value] ?? 1.0);
      if (bothAgeAndLoc) running *= AGE_LOC_CORR;
    } else if (t.id === "job") {
      running *= t.value * (INCOME_JOB_CORR[incomeOpt.min] ?? 1.0);
      if (ts["loc"]) running *= JOB_LOC_CORR;
    } else if (t.id === "smoke" && incomeOpt.min >= 600) {
      running *= t.value * 1.05;
    } else if (t.id === "single") {
      running *= myAgeVal ? (AGE_SINGLE_CORR[myAgeVal] ?? 0.90) : 0.90;
    } else {
      running *= t.value;
    }
    steps.push({ label: t.label, rate: running, coeff: running / (prev || 1), isBase: false });
  });

  return steps;
}

function OptionBtn({ label, selected, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: selected ? "#1E3A5F" : "#F0F4F8",
      border: `1.5px solid ${selected ? "#1E3A5F" : "#D8E4F0"}`,
      color: selected ? "#fff" : "#1E3A5F",
      borderRadius: 20, padding: "8px 14px", fontSize: 13,
      cursor: "pointer", fontWeight: selected ? 700 : 400,
      fontFamily: "inherit", transition: "all 0.2s",
    }}>{label}</button>
  );
}
function Toggle({ label, sub, checked, onChange }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"11px 0" }}>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:14, color:"#1E3A5F" }}>{label}</div>
        <div style={{ fontSize:11, color:"#8AA0B8", marginTop:2 }}>{sub}</div>
      </div>
      <div onClick={onChange} style={{
        width:44, height:24, borderRadius:12, flexShrink:0, marginLeft:12,
        background: checked ? "#1E3A5F" : "#D8E4F0",
        position:"relative", cursor:"pointer", transition:"background 0.3s",
      }}>
        <div style={{ position:"absolute", width:18, height:18, borderRadius:"50%", background:"#fff", top:3, left: checked ? 23 : 3, transition:"left 0.3s" }} />
      </div>

    </div>
  );
}
const SL = ({ text }) => (
  <div style={{ fontSize:12, fontWeight:700, color:"#fff", background:"#1E3A5F", padding:"6px 14px", borderRadius:"6px 6px 0 0", display:"inline-block" }}>{text}</div>
);
const card  = { background:"#fff", borderRadius:"0 12px 12px 12px", padding:20, marginBottom:20, border:"1px solid #D8E4F0", boxShadow:"0 2px 8px rgba(30,58,95,0.06)" };
const subSt = { fontSize:13, fontWeight:700, marginBottom:10, paddingBottom:6, borderBottom:"1px solid #EEF2F7", color:"#1E3A5F" };
const grp   = { display:"flex", flexWrap:"wrap", gap:8 };
const VC    = { lv0:{bg:"#F0F7FF",bd:"#1E3A5F"}, lv1:{bg:"#FFFBF0",bd:"#C9A84C"}, lv2:{bg:"#FFF7F0",bd:"#E07830"}, lv3:{bg:"#FFF3F3",bd:"#E05050"} };

export default function App() {
  const [myAge,    setMyAge]    = useState(null);
  const [myIncome, setMyIncome] = useState(null);
  const [myEdu,    setMyEdu]    = useState(null);
  const [income,   setIncome]   = useState(null);
  const [edu,      setEdu]      = useState(null);
  const [height,   setHeight]   = useState(null);
  const [ts,       setTs]       = useState({});
  const [result,   setResult]   = useState(null);
  const [error,    setError]    = useState("");

  const toggle = (id) => setTs(p => ({ ...p, [id]: !p[id] }));

  const calculate = () => {
    if (!myAge || !myIncome || !myEdu || !income || !edu || !height) {
      setError("STEP1・STEP2のすべての項目を選択してください");
      return;
    }
    setError("");

    const rate = calcRate(income, edu, height, ts, myAge.value);
    // 全男性ベース（既婚・未婚混在）：学歴→年収の相関込み
    let rateAll = edu.value * height.value;
    if (income.min > 0 && edu.value < 1.0) {
      const probAll = INCOME_EDU_PROB_ALL_MALE[`${income.min}_${edu.value}`];
      if (probAll !== undefined) rateAll = edu.value * probAll * height.value;
      else rateAll = income.value * edu.value * height.value;
    } else if (income.min > 0) {
      rateAll *= income.value;
    }
    rateAll = Math.max(Math.min(rateAll, 1.0), 0.0005);
    const pctAll  = (rateAll * 100).toFixed(2);
    const pop  = getPopulation(ts, myAge.value);
    const pct  = (rate * 100).toFixed(2);
    const per1000   = Math.max(Math.round(rate * 1000), 1);
    const actualMan = Math.max(Math.round(pop * rate), 1);

    const ageLabels = { 25:"25歳以下", 27:"26〜28歳", 30:"29〜31歳", 33:"32〜34歳", 36:"35歳" };
    const popLabel = ts["age"] && myAge
      ? `${ageLabels[myAge.value]}前後の未婚男性 約${pop}万人のうち`
      : "22〜35歳の未婚男性 約610万人のうち";

    // 上昇婚の判定
    // ・学歴が男性の方が上 → 上昇婚
    // ・学歴は同じで、男性の年収が女性より300万円以上高い → 上昇婚
    const eduUp       = IDEAL_EDU_RANK[edu.value] > MY_EDU_RANK[myEdu.value];
    const incomeDiff  = income.min - myIncome.value; // 理想の年収下限 - 自分の年収中央値
    const incomeUpBig = !eduUp && incomeDiff >= 300;
    let marriageType, marriageWarn;
    if (eduUp && incomeDiff >= 300) {
      marriageType = "自分より高い条件を希望（学歴・年収）"; marriageWarn = true;
    } else if (eduUp) {
      marriageType = "自分より高い条件を希望（学歴）"; marriageWarn = true;
    } else if (incomeUpBig) {
      marriageType = "自分より高い条件を希望（年収差300万以上）"; marriageWarn = true;
    } else if (income.min === 0) {
      marriageType = "こだわりなし"; marriageWarn = false;
    } else {
      marriageType = "同水準の条件"; marriageWarn = false;
    }

    // 内訳（分母から始めて各条件で絞り込む）
    const breakdown = buildBreakdown(income, edu, height, ts, myAge.value, pop);

    let level, title, body;
    const isRisingMarriage = marriageWarn;
    if (rate >= 0.05) {
      level="lv0";
      title="✅ 現実的な理想の範囲です";
      body="該当する男性はアプリにも、アプリ外にも一定数います。積極的に行動することで理想の相手に出会える可能性は十分あります。";
    } else if (rate >= 0.01) {
      level="lv1";
      title="⚠️ やや高めの理想です";
      body="該当する男性は存在しますが、アプリだけでは出会いにくい層です。行動範囲を広げ、アプリ外にも積極的に出向くことをおすすめします。";
    } else if (rate >= 0.005) {
      level="lv2";
      title="⚠️ かなり高い理想です";
      body= isRisingMarriage
        ? "婚活市場では、自分より条件の高い相手ほどすでに結婚している割合が高い傾向にあります。どの条件を優先するか整理しながら、アプリ外での行動も検討しましょう。"
        : "あなた自身のスペックが高いため、同等の条件の未婚男性が少ない状態です。譲歩できる条件を整理しつつ、アプリ外での出会いも並行して検討しましょう。";
    } else {
      level="lv3";
      title="🔴 理想が高すぎる可能性があります";
      body="該当する男性は非常に少なく、存在しても競争率が高い状況です。この画面の数字を見ながら、どの条件を優先するか見直してみてください。";
    }

    setResult({
      pct, per1000, actualMan, pop, popLabel, rate, level, title, body,
      marriageType, marriageWarn,
      myIncomeLabel: myIncome.label, myEduLabel: myEdu.label, myAgeLabel: ageLabels[myAge.value],
      idealIncomeLabel: income.label, idealEduLabel: edu.label,
      breakdown, rateAll, pctAll,
    });
  };

  return (
    <div style={{ background:"#F5F7FA", minHeight:"100vh", padding:"24px 16px 60px", fontFamily:"'Hiragino Sans','Noto Sans JP',sans-serif", color:"#1E3A5F" }}>
      <div style={{ maxWidth:480, margin:"0 auto" }}>

        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{ background:"#1E3A5F", borderRadius:16, padding:"20px 24px", marginBottom:16 }}>
            <h1 style={{ fontSize:24, fontWeight:700, lineHeight:1.4, margin:0, color:"#FFFFFF", letterSpacing:"0.02em" }}>理想高すぎ？チェッカー</h1>
          </div>
          <p style={{ fontSize:13, color:"#4A6A8A", lineHeight:1.7, marginBottom:12 }}>条件を入力すると理想の男性の存在率が分かります</p>
          <div style={{ background:"#F0F4F8", borderRadius:10, padding:"10px 16px", display:"inline-flex", alignItems:"center", gap:10, textAlign:"left" }}>
            {/* ドット絵アイコン */}
            <img src="data:image/png;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAUDBAQEAwUEBAQFBQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/2wBDAQUFBQcGBw4ICA4eFBEUHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCAPoA+gDASIAAhEBAxEB/8QAHQABAAEEAwEAAAAAAAAAAAAAAAECBQYHAwQICf/EAGYQAAIAAwMEBhEMDgkDBAIDAQABAgMRBAUGByExQQgSUXGRsRMUFSIyMzRSU2Fyc4GSssHRFiM1NjdVdHWTobPSCRckJSdCVGJjZIKUwuEYJkNFVmWDovBGhKNEldPiKMM4hfFX/8QAGwEBAAIDAQEAAAAAAAAAAAAAAAEEAgMFBgf/xAA4EQEAAgECAwcDBAEEAgICAwAAAQIDBBEFMVESExQhMjNxFUFSBiI0YYEWI5GhJEJTYgdD0eHw/9oADAMBAAIRAxEAPwD2WAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAdHEXtfvH4JN8hneOjiL2v3j8Fm+QwPk016/O1+uxcZUJqpaZ6/SxcZBhKzXkkUAISUJotwgDcSABuAIqSAAFSQAqCAotwADc2ABUABUVAZgQAJBFe2KgTQAAQwkHpJITsUIoS98IndEwp3D3PsBPcit27zWn8UB4aPcWwDjrkrvGX1t6Tn80JlHNrycno4AGTSAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACzYlxTh7DcEEd+XvZLApnQcmmqFxbyZjceWLJrBpxbd3gmJnmf7ITNjixthyzNpyuUootq1VV20Z5gUEHY5fiIiZ2Z1pu+mUWWrJinR4ssHjHJDllyaRaMW3f8AKHzK5HBXpcvxUSpcHY5a/YRHaZd1/b6aPLJk0X/Vl3+OdS/Mr2TmfcdvlysVXfFHHZpkMK2+dtwtI+a+0lr8SX4iJUEvbwvaS61WiEjtJjF5q+VbSps31uKJONtRLQ0SrLaOwxl/cVc6b0EeFlac8ujGlrssPK1o7BGRytaOwRl/8LGfdZHfyeFqsPK1o7BGOVrT2CIv2fdYz7o7+Twteqwuz2jsMZHK1peiTGX977IVd1jv56Hha9Vh5WtPYYyeVrR2CIv2fdHhY7+TwtVg5WtHYIyeVrR2CIv1e2xV7rHfyeFr1WHla0dhiHK1p7BFwl9z7or22O/k8LVYuVbT2CLhHK1p7BFwl8q91jPujv5PC1WPla09gfCOVrT2CLhL6q7rJ8LHfyeFr1WHla09gi4RytaewRcKL8t9k+Ed/PRPha9WP8rWrsEXCOVrT2CIyDwhLtsd/KPC16sf5WtPYIvmHKtp7BF8xkHhY8I7+eh4WvVYOVrT2CLhHK1p7BFwl/8ACx4WO/lPha9WP8rWjsMRPK1p7BFwl/8ACx4R38nha9Vh5VtPYIuEjlW09gi4UX6r3WFvsd/PRHha9Vj5XtGhSIuE9Z7CzG+F8KYDvWx4hvez3faOXopigmxUbhipRrd0Hmd13WURQwxRVjghi7qFMmM89GNtJWfLd9D48teTKB0eKbJXtJvzFUGWjJpFoxTZPnPnaoJXYpfiInaS+xy/ERl4iejX4GOr6JxZZcmsLW2xXYVXdiKocseTWLRiy7/lD5rX1Ll8lk0lwKqf4q7R0tpAs3I5fiI3VvvG6tfB2bbbvpw8sGTdKvqtu6nfUcbyzZNF/wBWWDxz5mbSDscvxETtYOxy/ERl2mHdvpbFltyYKNQPFliq+2zNbhvi7L9uyVeV02yVa7JNVYJsuKqZ8nVDBXoJb/YR9AthM28hdhr+UR03qQkxO7G1Oy3eACWAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADxN9kEif2xcPQ1zK7m/8AdGeZ1vnpX7IG19s3D6rn5maP25h5soYTzb8fJAQJWkNiBXOt9BjWt9GJHOGQ0JQBSnm60cksgAxSAAkAAABGcgCoEVoEwFCSKoICGKEsgATUgAVApqTUCSSPANYEvQQS9BABMmpAAMJ0BFQJBFdwVAkhonVUjXQIR2iCSKZwLbfK9ckbz8x0jvXwvXZObU/MdGhcxelzs3rlPhIaBLqZtUoPoJsKklkJu6mudHxQnz8oz6BbChp5Crvo60nx8UJlVqycm7QAZNIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMUyt4smYIwDeWJZVngtEyyQVglx12sTeZVoeUY9mFjpusOFsPQp6Ns5zfzRG/8AZdx7TINfr7cpf70fO2Fvaw9yuIxmdmylYnm9If0wcef4Yw5wzvrELZg4914Yw74HO+seb3nCI7Us+7hsrK5lGvHKxedhvi+7vsdin2WTyCCGybajVW6883umEczrM9cwm6+ooe6Z2ype9u1zdPFhp2I8nT5nWbU4ynmbZ66YzvAw7durPuqdHS5m2fdjCu6z6ttXtndBPeW6p7qnQABgzAAEgAAAACGde8Z8dnszmQQwuLbJZ987J0b56hfdrjMqRvaGvJMxWZh1eaVp62T845pWnrZPAzqohot9ivRz5zX6u5Dedq2yThk6aaGXb0GOr8XfRkX8jRmrEbbLWmvNt9ypDANK06t42iZZoIIpahicUT0nTd5Wp/iS/nOa+V6zL7p+Yt2os46RNfNRz5LVvtEu1zRtXWyxzStXWyzqg2d3Xo099fqud22ydabRFLmQy0lDXNUuCzFnubq6PvfpLxqRVzREW8l7T2m1d5GwAa2/YAAQHSvS1TLM5PIlDz9a7Y7pa79zuz778xtxRE22lpzzMUmYcbvO0tvnZXAwrxtPWyvnOnShJZ7Feij3t+ruc0rSqvays77Zd3qrSvaMcegyFat405qxG2yzpr2tvvKppFJNRU0LTgtNml2hwuPbKlVmZw8zbP10zw0O4DKL2j7tc46zO8w6fM6z9dGQ7us/XRndA7y3VHdU6OnzOkZuejzG3MmuyFxFkywvKwpdFx3TbJEuJzVNtLmbbPRU52JLUaui0FqvR/dz7hG3FeZlo1GOsU5PRL2YeO/8MYb4Z31iqHZhY814Xw5wzvrnmvwBFmZlR7uHs/Ibsk8T47yi2DC964fuiyybVDFFyWzRTNtDSnXRNaz1AfOnYjP8Plw9xM44T6LGUNV42kABLEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABb8S3rJuLD14X1aYIo5Nhs0y0TIYdLhghcTS4Dz9J2X2BIl67c96y/2HFxQg23ekQec3svcnifsfe3yEX1SqHZeZOWs9jvZP4PH9UjdO0so2ZMW0yAX48/TJC/8kJ89IHzsPcriPWGXjL5gfKNkovLDNy8vwXhaJkqKCCbZ44YaQxqJ880loR5Yhu+0pKm0dPzjC9ojyWMOO0xvEOsRXcOy7Bautg8YhWC1N9BB4xj269W3u79HcuvPYod9nbRwWGVHJssMqNJOrZzoqWneZdDHvFYhIAMWwAAABAAAQ9HapVgNdNZJ1FeNlart4+3zpHNGy9dHwGXYt0a+9p1dwip1OaNk66PgHNGy9fFwDsW6He06u3U6d89Q/trjJV42WvRRcBxWudLtsnkNnrFMrWjVEZUrMTEzDC+StqzESt2jMMxzcpWpf2S8ZB2S19h/wByLPbr1Ue7t0cGnardaMiXoLLBY7Ttoayms61l77RozTE7bLemrNd90JZhQmuYippWVvvjpMvu35i2sul8dIl92/MWwt4vQ5+o9aESEDY0O1dC+7o3+YXdaCy3dOlyLVFHMbULhpmO/wA0rGvx5j/ZZWy1mbeUL2nvWtPOXcHb1HT5pWPro/FZPNKx0T28a34Wa+7t0b+9p1dsEJppNOtSTFmFsvzTZ+035i5nRvWRNnuTyKFRbWta+A2YpiLebTniZpOy1oPcOdWO016TTeiDsdp7F/uLXbjq5/d26Os9/WZFRZiyOy2mFOJy3RKsWc7nNi76L12PxTVlib7dlZwTGPfteTv6wdDmxd+ubM8Vjmvd3ZZnis1d1fosd9j6u+RVHTk3lY5rahmR5t2Er5ds3XxcBjNLfeCMlOrtVFTrcu2br4uAjl2z9fFwDsT0O8p1dl51mLVeq+7W/wA1Hd5es1M8cVN469pkzLXO5PIW2luGibdDZijszvLVmmL12r5ugyU0dh2K1diXjIjlK1V6WvGRv7deqr3d+jaWxF9324u9zOOE+ix81dj/AH9YcEZVLsxLfu3l3fZoI4Z0cuFxuGrWeizvQet49lVkihbreV5Ojpmu6a/MZ0mJhXy0tWfOG8waMWyryQ0q7zvNf/1s36pXDsqcjzjULve8YW927pvoM2rZvAHQw9e9hv8AuOx31dk1zrFbJUM6RG1TbQvQ6HfCAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABiuWD3KsV/E9q+iiPlxLiblwc89B9R8sHuU4r+J7V9FEfLWS/Wod4xs2Y+bkdd18JGevRMAxb3duWrtkVW+gLqWq5l91x9wXRLOVc3qdDTehJOcA1N6M+6SAQgIZJDJSIkioegBUVCFAndJEfQRbzJKZnQRbxMc2M8mOQZ0TQiDoUVF/dyEcApvEgbil5tw7d0Olvh1c4+I6rO1dHshCvzXxGN/TLPH64XhPMAtAKLqnhYAABAhhEunfPU8vuy1sud8dTS+7ZbC3i9KhqPcEADa0DIpn0EgIPAUx9LebUVIiNetsTJ92QwPnIN4qKZa5yDeKznzzdeOQAAKdesPTrJoSCHHN6VMVfxWYZAltVoM0nr1mZ3DMMhWYv6P7ufrucJzbiFFuIlJBl5Qc939HMzajvHSu9euTN47pUyepvp6Qh+AkhmtkjwF3ut/cMG+y0vQXW7eoYN9mrN6VnTep2vCEQCqvbuK2Olkndwyxw9CXu29Rzu4ZZIehRaw8lHVeqE1i3SIm1VqmjWiSItD3jduqzD6Y7HGNzMhODI4tLumS/8AabANe7Gz3BcFfFEnyTYRsVQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA8B7JnH+M7qy6Ynuy7cS3hY7JInS1KlSokoYU5UDelbrYmdkxG87PfgPl28pWUCLTjC9n/qQ+gj7Y+P1nWL72+Uh9Bj2mfdy+jmV5bbJVitf5Pa/oYj5YyY4ORQrbLNpMym5QsdW6W7DbMWXnPs0/1ubKijVI4XmaebQ0dLkMlLNKhVO1pNWTLFVnBp5tvO7HlHB1yJUUPXIyDkcvrIeAcjl9jgz9o19/HRY8LPVbrlcLtcaUSrtC6pZymCGGGKsMEKbVKpFRpvbtTus4qdiuwgwgYtgACEBDWckEpRQEkASk9wmj3GdC94o4bJC4InC3GlmLXySb2aNm2mLtRur5M8UnbZke1i61kTIIuRxc61mMd283ssfCHMm9lj4TOME9WudVHRxy+hSKyEqEm/ZTHm0tIpcUKdHEuErlus2BPOnGtJfYpMrbNKVBwGF7xRuxYZyMfcUHXw8J2rnad4Q0afOviLryGV2ODgKoJcuB7aGCFRUpmNVs0TG2zdXTTW0TuqSzEpDWDQtpJ2sW4yIeiSMcimTdtF67H0T1mdKdtqy5e7ZG4YtxkOGLcZjyjm9lj4SdvM7LHwmzuJ6tXio6LjfGaywV68te3gf4yO3db29rihjbjW1zKLdLopUunSpfATF+7/ax7vvv3wx/bwdfDwjbwdfDwmQcil9jg4ByODscPAT38dDws9WP7eDrlwjbwdfDwl/5FB1kAUqX2OHgHfx0R4Weqwckl9fDwkuOBwPnlnW6X5Spdelw8BXDKlN7WKXC09Y76Oh4WequGCJS4HR0oKPrWY445zidZ0dK6Kkbeb2WPhMe4mfuyjVRHlsySj61k7WLrWY1t5vZo+Enkk3s0fCPDz1PFx0ZIoXuMnavcZjSjm9lj4Q5kzssfCPDz1PFx0ZFPgicmYqfiMwqGtM5copk3at8li4S2pUSLemx9jdV1GXvNvJUgwkC1uquzdybjm0TzJHd2sWtMtKbVdrE1XSTto+vi4TTfFNp3bK32jZdaPrWRR10PgLXto+yRcI20fZI+Ex7mU94ujTo6QvgLpduaxQJ6amLOKNNPkkfCZJcLbuuBxZ3t35jRqMc1qtaS+93eA1gpOi4bdTlOdVroGWKGOBJJxIyKJVha1NUZG0l16CHgNtMkVjZXy4ZvO+7H9vB1yDiTzJp5i/uCDrIeA4p0EO0ie0h0bhs76GmdNPV9FtjZmyC4K+KJPkmwjXuxsr9oXBdfemT5JsItOWAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHzb2VWfZEYv7VplfQSz6SHza2U7X9IjGC/WZX0Esi3Jnj9TWqRJFUSa1hXZuqpPdovrLFZ81qkP8APRfa6d8r5+cLul5SAA0rOwAAkAAACnbAADeGYANQIbW6B0b66lg7sta0l0vnPZoO7Ray3i9Ln6j1pZFMxBOftGxXAS85BIql9Nl90jIIuie+WCX02X3SL83zz3ytn5wu6TlISimpUtBoWzWAwiBVB0RjTXPRd0zJdZjjzxRd0yxp/uqavlCAtI0haSypO5dPVb7hl0Ra7n6ri7hl0RUzep0NN6EkNksho1N4A6rUxrBCUxXQQSnooSxljj0xb5JMS5575DL0OV9ygI4SakoCCXoCQJUxdDFvFvWguLXOvt7hblmN+L7tdk1JICNjDdJJFVpFSUJIJBCUGR4ef3qg7t8SMcMjw6vvTA/z35itq/Qt6L3HfAFGc11QjWTo0h5ghDKJ3S4t5nIyibDWXEqahHNEx5PonscVTITgz4pk+SbAMC2Oy2uQ3Bq3Lpk+SZ6dOHAnmAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA+bGypqtkTjCmnliV9DLPpOfNnZVL/8isX/AAiV9DLIlnj9TWace6iasDUYLDks8Tdqk169F+WvfLBZl91Se7XGX/W98r5+cLul5SkAGhaAAAAAAAADqXtaJlms8uKU4U4onpVTtot1+55EnumZ443s15ZmKTMOq7wtj/Gl+L/Mjl+2N9FK8U4GhrLXYr0c7vb9XNOtU+fKUuY4KVrmVDhz/MSDKIiOTGbTad5Rn675g600/MTQiLQt9EojmuXMyWs3JouAO7JfZouA776JgpzktvzdKMNNuTow3dAo4YlNie1dc6O69JIMLWm3NnWkV5IOC8J0ciyuZBta7ZLOq6zsI6l8dQPu1xk0je0IyTMVmYdTmhbF+NK8Uc0bXuyvFOqC32K9HO72/V2uaNq3ZXinVq873c4DJiIjki17W5iI1hEpksXbujquLuGXQtV1dVvuGXVFXN6nQ03tiZLFAam51bwnTJEqGOCi20VM6Ojy9anrlvfhO3fOezS+7fmLYizirE181PNe1bbRLscvWpaHLX7JDt9qSrWBpaedOAiLQzZ2Kx9mmMt5+658z5MS2zjjTefMQ7tkdfM4TuwLnId4qoVpyWiea7GKkxyW/mZJ7JM4Tq2+zy7MoORxRPbN6S8NFtvpZpO+/MZ472m3m15sVa0mYh0NRKIBa2UFUCUUcEEVdrFHDC6bj4j0d9o3ALjTcq91C4U2lbEv4TzjD0cvvkPGe3NUD/NXEcnimoyYYr2J2eg4HpMOptbva77NafaMyda5F9P/AL1fUJWQ/J2tFnvn99X1DZZCWc4/j9R+cvQfSNH+DQuWbJfhHC2Tyffl0Srwgtku2SpMPJrSo4XDEom821XWo0Wu0eqNkv7kFo+MbP5Mw8sI9LwrLfLg7V53l4/jODHg1M1xxtCQAdNyUcRc7ttlokWNSpbgUKbedVLadqydJ8JrzRE182zHaaz5LhzQtfXS/FJVvtXXS/FOoiSr2K9G/vb9VysFrnzrQ4JkULW1bzI72otN1dWRdwy6plfLERbyXsEzam8pD8HazAGpultPCWyAyj4Zw1YLgu203SrHYJEMmTyWxRRRbVLNV7dF1/pO5VtVquL/ANui+uaXaKTb31+qtOmxzO+zdT2T2VVf+puL/wBui+uItk/lUULatFxN0rTmfEv4zSjzlMS5yLeJ76/VjOmx9H0qyQYgtuKsmOHsR3lyLly8LFBPncih2sO2emiMrNebGtUyD4NX+VyjYZdckAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADGspeNLpwDhWfiO+oLTHZJMUMMSs8CjjrFEoVmbWtgZKDzxHsuMnMMVFduIfDY4frkPZc5OtV2Yi/c4frhO0vRB829lWktkVi6j0z5T3vWZZ6b/pc5PdV1Yh8Nkh+ueUcst9ScdZUr8xXdcmZJsV4TII5UM9bWOighhzrPTPCzC1oiPNsxUta3lDBaip3OZlr1OV4xDuy17srxv5GHbr1Wu6v0cFm6qk92uMv1c73y1ybvtMM+XHE5dIYk3SIulNJXzWiZ8lvT1msTuVJIoEalhIKJ02CTKcyOu1Wmh1HeVl/S+L/ADJiszyYzetfKZd2oR0eaVm3J3i/zKuadl3J3i/zJ7u3Rj31Orug6XNOy7k3xf5jmlZtyb4o7Fuh3tOruot9+dTyn+c/McnNKzbk3xTitcyG8JcMqzV28D2z26oqGdKzE7ywyXrasxErYSm+0dnmda9yV438iVd1q3JXjfyLHbr1Uu6v0dUVO1zOtW5K8b+Q5nWrcleN/IduvU7q/R1akRaPCjtu7rV1srxv5EO77W1olLX0X8h269SMV9+S8PSwdN3lZc1OS+L/ADHNKy7k3xf5lWaWX4y025u7mIOnzTsvWzvF/mOaVl3J3i/zHd26J72nV3cx1L46gfdw8ZTzSsu5O8X+ZwXhbJNoszly1GotsnnVNZlSlotDDJlpNZiJdKozEEFqXOVVIAIBEpZyESSO3dK+633DLotBabumy5NrcUytNo9B3lbrNuzOArZqzNvJe094inm7IqdZ22zbsfAOXbNuzOA19i3Ru7yvVx3y/uaXTr2WxHbvm22eKzy1C41z2tFt5bs+7FwFvFS3Z5KGe0dtzkRPnWcHLcjdj4CIrXI2rzxcBs7EtMWjdk8PQQ6dBJ04LwsyhSfJNHWk80bLX+18UozS3R04yU25u2y3X3ok03X5jmV4WTdmeKRNlR3qlDYkm5OeLb5tOjiMqRNZ3ljkmL1mtea06yd5Fx5hXn2OT4/8iOYV6djk+P8AyLHe06qfh8nR0IHz0vvkPGe3VTaQdwuI8Yu5bylxQRxwSlApkLbUXb3j2y7rtjhThik7XaqlYu1vHG4vaLRXZ6LgETivbteTp1JR2uZVt1OT438ieZVt3ZPj/wAjhvT97Tq1dsmM2R+f8YyPJmHlauk9hZe8L33feTSO7bvkyp092+VHtdvqSj7XbPOqyUY50cy4PHfoPUcJ1GPHg2tOzxXGtPlzaqbUrvDCE+0yTOVklx3quuX8o/QWa/MF4kua2KyXjYoJU2KDbpbd51wHVrqsMztFnHtpM1Y3tWWPrTQ7Vl6St85+Yd6p05XhrvnDF9xRuzWmFwzYHnSzi163jarCKWp52hy5ianDy1I3YuAcsyN2LgNfYsy7ULhdWe2Rdwy66iy3XbLPBa4oonHTaNZkXF3jY/0vi/zKualu1yXtPkrFPOXaQOpzRsn6bxRzRstdMzxTV2LdG/vadXabIZTKmQTZamy29q9FSSNk+QRM6B7zJImdA95hEvohsaXXILgxv3rlcRsQ11sZ/cEwZ8VyjYp0nBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA0fs3W1kDvSnZ7P8ATQG8DR2zff4A70W7Ps/00ATHN4Cjiibq3nFXukPSQalpLb2uZsvlk6llV63zliegvtj6lk9z5zTm5LWl5y5cw4ACuugAADUCQOneuawzH21xlnWhF5vbNd8e+uMsy0lrB6VDVes4Rwkg2qwSQAlPhO3c/VUzd2h02du5390zO4Rhk9MtmH1wuqJW8UrSVIpumkAARm7ZESVHTcZURF0L3mI5onkxyDoUSRBoRUX4ckAZCG6EkPSSACDAAAAkAAQKpXR1p+Kzk1FEvov2Wchjbm2V5IqG94VIZGyXUvXqeDui3JdouN6r7nh7styLmD0Kub1J8BTFSjKimLoXvG2eTUvC0LeHgC0LeBRnmtngRe8Iqs+1tbkHnLKy+4PXrlsfcec1ZvRKxpPdhf1Cksy+cbXfKiTmu3s69qgrIi3Kw8aPY8tJSpa/Rw8R48tCXK8W/Dxo9hy88uX3C4ihr/TC3pPWqSWcqSRSio5joLLjj2BWnqmDX2ojCIktyvhM3xz7AQr9Yg4mYW1nZtpyWMPpccUPOvTo3TWGV5bXF1nSzLlNU/2m0msz3jVeV5/1vlfBIeKEu6P3FLic/wCz/liFOerVmEYkz35acy6IzlaTBsR+zdp7o9DovXLyWu9uFv4CcxCJOo5O7nsPTnm/FZ3s+Y6Nh6c94724Vcvqb8fIAJeg1s10u/qGWdg693L7hlHYKd+cujT0wFMfQveZUHoMWUvodsaPcEwZ8VyjYprzY1qmQbBq/wArlGwzpOCAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABovZxOmQe3rdtEj6WA3oaJ2cnuFW34TI+lgCY5vAz0skhkmpaQ+hL3ZF9yyu585ZGszL5ZepZXc+c05uULWl9UuUhio1FddSKPdVd86t5P7jmadWgs2vootG6baY+1Cvlz93O2zIuDhRVXe4UY2u6i4SafnRcJl3H9tXi/6Xe+M93x6OiWvtlnQzJUq34Sam2lezGzRlyd5O5ULtEInUzNrQ3mFS6WKTKiscuJy4W2tztnPyCT2GXwGqcsR5LNdPMxvusnhO5cy+6I3WlYcx3+QSexQcB1b0ggglSnBCoatp0VCO3F/JPdTi/dLv6Na4RXtrhRYGluvhI2q3XwmPcf2y8V/TIk1urhFe2uExzardfCSlv8I7j+zxf9Mjzbq4SmJpwOjh0PWY+4e2+EhJLW+EnudvueK3+xB0JJCVNzN2iTfCmAAgA1wErSde8HtbK2m06rjMo852J5bubPQVLTtouviFYuvi4Tb3MtXewu9QWeKKNQ9FFwl6gXOw7xrvXss6T2lJJX4Bm3DDeGzsKZfR59FKVOVp9rhOlemayqmbnloZ0M6/Hj4TOuLt+bGcnY8l6eb/AP0iq/4yzc910fCQ69dFwmfcT1Y9/wD0ud4wOORCpacb21aQqtEdDkE6tOV577als3PsQbFYrbj285duski1Qw2OsMM6BRJOkWejPT/MW5KZrlutf9rCc7U8TjSX7uY3dDTcNvrK95Wdnz5cid2Ccv8ATZDkTto6SJzqs3rbPoM7mub3muv90hJVzXHSPbXDdDW0daWOGpprx6tp27LbfgWWsb9qHgqHoVvE1O1boYXb7U4YYYVyaOiSolnZw07SOj2t3P7OzjTRf8HtLl1vbPoOhgcVNO4ixtbiRvPYkwwxWnFO3lwTEpdnpt4a06M0am/YxWt0WdHSbZ6xDB+SQ9bN+Si9BKjhf4s35KL0Hq7lazJdTWf5NEKz2b8ms/yaOD4+s/8Aq9R4C/V5PnxQuXtVDMq4oUqy4t1do9iQU5HDp6Bau0WmdZLJHLe3sVkizqqcpGcuCW87lwaNw05s8Z48vLZhNLaa28+e7HKpf/4VKJbpkPIpXY4OAjkUrsUHilfu/wC2fi/6YNjhrmFDpf3RDoXaZhW2hb0vgZt6/ZMl2OBOVA4eSJ02u+WfkEj8ms/iIenyW9Pnm1d9mum4aaXwM1Pldi/rlLzR7VWWFV2jepdo9PKRIp1PI+TRb7ystjmWqsyw2OY4YaVjkps24NRGK3amEajHbU07EeTyLtoaVSmP/Ti9Bg+I/Zy1UTXP61Q91Q2SxQNOG77Cv9BHkTZCy5cnLBfkEqVBKgU1UhgVEvAd7heqjNkmIh5rjGjtgxxMywHWSNYO+8457D059yzuvfRa3Wqo2iKvrouE1Xx9qd2yt9o2XUnwotNXuxcIq9LifCYdzPVl3rLbt6glM5zp3G63RIe+dzWc2/laXWx+dIQTqBKro1GMSyl9BNjxet02XIhhCzz70sUqZBdktRQx2iBNb6qZ7zduT34u795g9J8o7XLgitMacNVDE1CtxHDyOWvxC/FvJx7YvN9Yubly+/F3/vMHpK5F7XVaJsMqRedimzInSGCCfDE34Ez5OKGHczb5sHY3JScumDopcUULivOCGLntKMt2E0mI3fS8AEsAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA0Ps5nTIXbPhMn6SE3waF2dDpkPtK3bVJ+khCY5vBWskhqjJNS0h6C+WZ/csrufOWN6GXyy57JK7nzmrNyha0vqlWSyCGysuuC8eo5vgLNubxeLw6im+As25vFrByUNV6oVBsioNysVABiCGphDNnJ2F4u/qGVvec7BwXf1DK3vOc5Svzl1KemBaTo3u/W5W+/Md06N7dDK32ZYvUwz+iVvABac8eoABACNZJIAAASiAE7JOveXUsW+uM50zr3j1LFvrjJpzRbkt60EohFSLqpCiLoWX2HoId5FiegvqfOreRW1H2WMH3SQ0TqBWWHVvPPZv2kW9FwvHqb9pFvLeD0qub1JDQTDN7U3jsNVXKBenwHzRHqVZ4UeXNhiq4+vfRmsK/iPUarRHjeNfyf8PYcC/j/wCQpj6GPvcRUyifVSJsS1SojmY/VDrZp/ZLwVbOrLT36PymcRyWp1tVof6WPymcZ7OvJ4ieYb02JC9exU/zbPxzDRdTe+xHXtrfas3HMK2v/j2XOHfyaN7tFNCp53UHknuNlMa5xmaLoVvGFzK8jZmmqFdo20c7Xc6gANig6F/dRwd8XnLQkXe/upIO+ItKRpvzdDSe2ho6Fu6qi3kXBlttvVcW8jBdxc3FEqZzyDsinXLFfnfEevnppoPIGyIf4Yr+76uI7nAven4cP9SexX5YABnFf+UPWPFgoNWnhHaekCGQVERaGBk9xexFn8PmO62dG4vYiR4TunGy+uXcxeiEpkopWnQVVNbNZbT1XN7pnEclqzWqb3bOMvQ5ducpTM92Or/Dngtf5rL85gJnmx393bBXxrLMoYX5PpoADNXAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADQmzq9xGf8Kk/SQm+zQezr9xGd8KlfSQhMc3gx6WSRrRJqWh6Gd+TeEqXIgluXMbhVHRHQKa59JE1i3NnW8084XJ3lK7FMHNKV2GMtoMe6qz8Rkd21W6XNs8cqGXHC4tB0ETnD3amdaxXk1XvN53kAGomWJnpVJMisXWw8JVqFAIrFuIjntxEskGzu2W2wSrNBLilxNwrPQ5HeUrsMzhLdwg1zjrMt0Z7xG0Lg7xlv+yjOvbLTBPUChga2tdJ1yNZMUiEWzWtG0pABk1gDFQg1BbgFCdzcAAETIlBA4noRwctQdbEzktPSYs50TbSsTHmwtaYdrluHrIjjtU5TZEUKhadU/nOF+EiJ84942RjrDGbS4lmJZBK0G1qQXOK2yFRUidFuFuKt2hhakX5s63mvJ3+XpO5HwDl6TuRcB0PCR4TDuKsu+s7dqtMubJ2kKirWuc6tBTtog2VrFY8mFrdrmlkAMyYt9bCiTFPx/fKhiSpYlp/aPVnM6aklySFnlvYNw1x7fjX5FB/GetloPI8YiJ1D0vCMtq4doWzmfN6+E47Td8xWS0RckWaTEXcotdOULT3iLiObjrHbh0c2e/Yl85J8xcsz00367H5TONzYetiFo6qtDz9Oj8pnHunsYiNnlZs5OSQ9bEb52Ij28WLKVptbNxzDQVXTSb+2IeaDFsXas3HMKnEI/8AHsucNmfFUb4IZNSDyT3amZ0DM13N4wqb0BmvW7xsxudrudQAGxQda87PMtMiGXLcKairnOirrtK/Hl8LLzmIImsS2UzXpG0LM7rtXXy+FllvWzTJF4RQTHC3tVo3jM9RjGI/ZWLuVxGF6xELekz3tk2lbNpnT7Z5my44MnXjlRvi1w3lJl8kmKLaxVzLgPTaetZjSGVdUyh3i0tMMLzeEt8PyWxXmao4nhpnrWtmn1gCctN7SOB+grhwA/xr3lreh/kZsTunY8bm6uN9N0/RqrFtyK4rZIkK1K0qbL29aUoWZvQtwy7Ko/vvYqaeVl5jENJ2dNeb44tLz+qpXHlmteUJqRFrFCUb1dfbptsuTdsmXFBE2tw7LvGT2OPgLRY+poDmbOffFWbSv1z3iIhceaMnscZKvKT2OPgLZXfCzmPdVT393JOiUydHMSoooqooANmzTM7hnux393TBXxrL85gW4Z7sdvd1wV8ay/OTDG/J9MwAZq4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA6jvS7FE4XeNkTTo1yaHM+ElXjd70W+yvenQ+kDtGhdnSq5D7S9y1SfpITeSt1hborZZ3/qr0mitnJabNHkQtMuG0Soo4rTJ2qUabdJkLzCUxzeDc7ZJTVanmKvCalo1op/GZNVulL0kkpBFQEJqQ9ACzogQVIBEmwyAwBJDJQYBMEJk1INwCoJ2NwAAAwBIhaSRQOm7mEEAI20PXIbaHrkNkuO09JiOmdy0tOTEk0dLUb8UeTVfmkpiXORElMxpQNG1g4yVoKVFD2+AnbQ7r4B2oYTWVRVulFYd11K6pqqJidzY1DSNQ7RO4IMaq8Qrm0RcBG4gMeCLgIzv8WLgG8J2l6E2DTpjy/Vu2KDjjPWyWZHknYNKuPr8dGqWGHT+2et10KzHk+L/AMiXoOF+0ihRaVWx2rvMXEVsptWaxWrvMRzsfqhezeiXzetGa1Whfp4/KZSVT+q7T3+PymUo9hHJ5ueZQ37sRKqXi3/tuOYaCZ6C2IEuZMl4v5FLija5WqlvzCpxD+PZb4fMRqaTPVvEho5VItVKcqzOAcr2n8mm8B5KKy933lOrgmLnGZrDoh3jDZ0i0KBpWabVvrTMoVSCGumhspDn620W22lIYBmoqiCSGEKnoMWxJ7KRdwuJGUJ1MaxFKmxXlFFBKjih2qzpVMb+cLWjmIy+a1vX4DSOVTPlBvGu5D5zeXIJ1auRNX7Jo/KwnDlDvFNNZoczW+btJH7pWdXatttpYtQPQySHoOgpNeZUXW+LIv1ZGJ9syvKlSG+7LX8mhRie2h1tVPRaT2YeS13v2VaiK5mRtoeuQTh3UWFTZcLL1PBvHNqOGyUdngz6jmKtuazHIAIboYpVMgJ1BAIz3Y7+7rgr41l+cwJIz7Y7L8OmC/jWX5yYY25PpmADNXAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOK21djnJNp8jio1vHKUWjPZ5i/MfEB8r8WX3fKxbfUKve84dreVphW1tcaWabElmqdCG/7+h6G/r3h3rdM9JVjHNjO/V/mlq+liLYYbt9YjZdFiTEcLThxFfSfat830lNuvm+bzsvIryve8bbLgjrDBaLXHMhT3aRMtr0HJL6nj7vzCWURG6NNPRoHgGsEJRrJAGwUAATsBABAKggJBQJEkICGSQ0AoKMlAkRQkAJAAAAABER9CySI9D3iYYus6EAG5iiKm1ZxM5Y+hOMzqwlCMzyI2Oy23KTYbPbLNKtMlyZzilzYFFC2oG1mZhpnWQP3UbBTsE/6OI06qZjDaY6LGjiLaikT1b/5g3BV/1fulf9pB6CIsP4fa9r91fukHoLlEUnjIzZPyl9MjS4dvRC2RXBh+GGZ/V+6nSXE68qQbm8eS7bClbbSoUoVyaOiWpVZ7FmP1qb3mLiPHlt6utHfo+Nne4Lktbtdqd3kv1NhpjmnYjZwAqoQ0d95R3rhULt8xRQwxJQN02peHBD2ODxUWe4M1vj72y9vQUNRM9t0NPWJo43Cuxy/ERDhh6yDxEV6xQ07y3dmOjdewxhSx/iJpLNd8DpTtxnqVaEeW9hpVZQMR097YP4z1HC+dW8cPic/7v+F/QemflUcdrf3Hae8xFdSi1KtktC/QxcRSx+qFrL6JfN+1KlrtHf4/KZSjktapbbT3+PymcR7CvJ5ueaXoPS2wgrXGbTazWXjmHmhnpXYQPnsZ9zZeOYVtZ7Fm3T+7V6TdU+iYq91igPMPQ7Jq9Fa77DzsAgQ0KEgJCCp0IAjXn0FVW1pZBNQSpibppdTzLlqibyo3qoq5oYfOem3nR5ky2qmVW91+bBxssafnKKeV2G6QSsw1lxv+6jD133femNZ8m8bDJtcEF3qKGGYtDoZW8J4YarzBsa/ZXoMcwY2seWp/5bDxMzxaKGvPlvWYiJ+y9oNNiyY5tasTO6yrCOFtdw2Tg/kdmy4TwtyRQ8wLFSjrWFPVvFyOWzv11eHiNMZ8v5SuW0Wn2n9kf8PMl6S5cq97dKlQKXLgnxKGFKiR1jt32vv7ePwmPjOqj00emHzrJH7526hS9OYqIZlDBIDBEiVoM+2Ovu6YM+NZfnMBWgz3Y6e7rgz41l+cmGNuT6ZgAzVwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACi0dTzO4fEVnHaeppvcPiA+UeMfblfvxpavpoi2Fyxh7cr9+NLV9LEWxGCxXkk5JfU0fd+g43oK5T+5o+79BE8mUc0EkayRIE1IAAnMQQQJZFSdJFCQqSRQkQAAAAASkAdSkIVAjUSgkABAAAmAIiWZ7xJEfS4qaaExzQ6vgYOspkdE9sxySPr2WOxLT24diOu1faOJ7/zizvklplS422onRlydgsqia2kWndMbXinlLKtZv5wtpn2x+hX20rFWnU09r5OIxRWKyr+zfCXXDF8zsI3xBft2yZcVolwRQKGZnVIk4XxmnPeMuOaV5ys6aO6y1vblEvUMcSr0SKdtDqiRol5a8UxOvKV3pdz/IiLLZilqnKN3+L/ACPPfSNQ9j/qTSf23u0opc+lG+Qx5vAeO7W/u609qdH5TNl/brxUoY4VZLAlHC4Xzmp+A1jMbmTZk2Poo4nE6brdTr8M0eTTdrt/d57jnEcOtmvd/ZFSGxqJodaHBd24PZCNfo2Xqu+WG643JtMUcOlwULirVHuIpaiszfdewXitNpdyvaFe0dTlmLcHLMe4aexLZ3sN9bDWnq8xG83sbL4axnp9RQ0WdaDwXk4ygX9gK9bZeVxKzOdbJUMqYp0NUkm2qZu2zO1slMf0z2W6W93afyOfq9BfNftVlv0+sriiYmHrmq65cImuFyJ6bhzyotZ5G/pKY/azWS6V+x/IhbJPKAlEo7NdUUMSo1yP+RopwzJExO7bfiFLVmIhpy3UVutXf4/KZw9sqmxxTpsydGkopkbjipoq2UndrycuZQz0nsH3WZjJfm2XjmHmxnpXYOqseMnr2tlXzzCtrPYs26f3a/L0miWgSeXeilA1Bh6AAAAAAAQKkMGypvMeZsuHurXt3EHGz0x+KzzLluf4V73W5BBxss6fnKI8skMOQoQhFVIt7N7nwbRY5tdX/d8GrtMztU3TTV+YtvDCWK+T3dKkTYp1jlwxKYqqlGUPLLidPNZLD4i9BtvoMuba9eWyNNxrTaWs48m++7dObdOWRteSw51oeavaNJrLRihf+ksHya9BXBlrxTBFtlY7veameUvQYRwrUN8/qPR7TzYdfUS5t3g3SrtMfGdY61svCfarZPtUyGBRzpjmRJLNVnG7VNpoR6CMVuzEPFXy1taZd1kHS5am7kJHLU2n4o7qWHeQuCzihTKe2lQxa2ia5zXPk2JM92Or/Drgtf5rL85gRnux1zZdsFv/ADSX5xDG3J9MwAZq4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABx2rqab3D4jkOO19Sze4fEB8osX+3G/fjO1fTRFtLli72436/8ztX00RbTBYryNRyS19zTO7XmOM5JfU0zu/QRPJlHNTrJGsBIANQQBohV3GTwgEAvCSBAA8AADwMeBgAM+4M+4AAz7hGcAyUR4A94J3SCOElEIAT/wA0Dw/MSkoRGvWot4Vzkxv1qPToJjmTyWeHQt4kiX0CqVULqps5LHmtkl/nF9el75YrI/uyR3XmL6+ie+U9R6lrByQde39SxeDjOy9BwW/qWPwGqnNutyWzfqQypaCNZdU5Utb5BUyHTdMmMqWEASOex9Ne8dxM6djfrmvQduv/AChWy826nJNQiPD8xPhRqZIfaI8CJDMhFN4AcIE5iFpJ4QBDWk9K7B1UeM96y8cw81npTYOuszGS7VlfzzCrrPZs24PLJX5ek9ZJFCTy70aBTMSyK9oACRQCASQBSCXpKWwlL0M8zZb/AHWr47iDjZ6YrRbizLSeact6/Cve7/Mg19tlnTfdht/uQwsPWTFrKXo8Bcb2uMpzfqjl59FmgMYrVmTZTfbLB8Gg85jB6LS+1V5LWe/ZOfdAW+CwqgAAMjNQkAXGz9Il7xXTOUWfpMveOQpW5rUcgzzY7+7tgr41gMDZnux0z5dcFfGsvziGNuT6ZgAzVwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADitnUk7vcXEcpxWzqSd3uLiA+UWLfbfffxnafpYi3FxxYqYvvyvvnafpYi3GCxXkHLB1NM7v0HE9ByQdSzO7XmIlnXmjWA84CA6s2bMhmOFPMjtazoT+nRb5spG8sbTtCrk8zrhyeZ1xxg29iGHalycnmdcSp0zrjiA7EI7UuXk0zdHJpm6cQqR2YT2pcnJ5m6OTzOuOME9mDtS5OTzN0cnmbpxgdmDtS5OTzN0cnmdo4yB2YO1Ll5PM3RyeZunGB2YO1Ktz5u6OWJ26igDswdqVbtE5/jIlT53XI4iR2YRvLk5PO65cAdom0abTqqHEHoJ7MEzKhKiS3ASyDY1qpMTgtEqNKrUXmLo7bM7HCWqX02DVnO3n3TRkiJnzbsdpiPJ2OXZnYoTjnWmKbLcuKBQpnGyGYRSGc3lTQJZyQbN2txzM0NUZ3LyXXrHKgj5q2KHbwqJJp5qqu6YLMXOeFHotOF2eRmXSYNXaRQ12pvhiOw6nC9Hj1M27z7NYPJXeunmvYady/SQsll6V9mLDwP0mznCtwhQwp9Cjn/UM3V2Po2m/tg2HcjGIL1tc+VZr1u+FyYFFE4q0o69vtF6+0Biqma+7q/54TZ2S6JO8rygeqzy65u3EZxtYadCirl4pnrbZYxcC01o383nj7QWLE/Zm6/8AnhJ+0HirXfV1fP6T0LtYetIcK61Gv6rn/pt+gab+3np5BMUrRfN1Ph9JS8guK/fe6/n9J6F2sPWobRU0IfVs/wDSfoGl/t57WQXFTzc17q+f0j7QeLF/e91cP8z0IoYdwq2q3FwD6tn/AKP9P6b+3nn7QmLffa6uH+ZV9oPFOu+rpXD6T0JtV1q4BtYetXAPq2f+j/T+m/t57eQPFK0XzdL4fSbl2L2Ar1wROxJzUtNmnu2QyORuS6rndvXX2y/bSHWjI8D0U62JZqwwat8xtxLLliaW5S06jg2DBTvKb7wycAFVXAAEmsNkACSlkkMAlVmm8p+Xq6cCYztWGbXh622ybZ4JcbmypsKhaihUWvfNyQ9Et9Hh/ZWR7bLrfLfYZC/8UJ0eH4KZrzF4UNdmvjiOzLacWypuXVg23PftEBrDKBlau/E2MLVfkm4rRZ4LRLhg5HFMTaab9Jqht5xqoq+E7dNDhryhzPGZYtvuzj1d2bXdc35RBY7stPYqbTu0YPvkrtGXg8XRn4/P1XLFd4QX5e6tsqS5EKlQy9q3XRrLXys6dHDwHNC8xUb6z2I7MKl57y02nm6/Kz6+HgEVnagcW3hdFU7BTG6S4ktwyjJbdj2IdJZ0nuoBdDCu0De0hOogmmZEi4SOkwbxyMos/SYN4rKVua1HJDM92Ofu64L+NZfnMDM+2Oi/Dpgv41l+cQxvyfTIAGauAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcdr6lm9xFxHIcVr6knd7i4gPlJi+nqwvynvnafpYi2pFxxb7b78+M7T9LEW5GCzHKCLQVy+po+78yKGiuX1NH3foInkyrzQgAIJNZ0J3TYt87+s6E7psW+bcXNrvyUggG9rSM5luR7A07KNjqVheTecF2xTJEybyeOW40tpC4tCa3Dc39E60ttLKHZ67nMuP65Wy6nHina07M6Y739MbvNnhB6U/om2r/AP6FZ/8A22P65K2J1p15QZHgu2P65r8dg/KGfh8v4y81A3llR2PUeCMB2/E/qwgvBWSKXC5KscUvbbaJQ6XE900SoomlodSxiyVyxvWWq1ZpO1ocgOPbRDbRdo29mWPacgOPbRdojbRbo7J2nKDjUUQcTHZN3IDjq90bZjsm6sZyjbMbZk7G6tBlFXunLZJTtFss9n2zhc2ZDBtqVpV0qRPlG8kefk4yGz0BadjjKlWiOBYyhonmXKMTa8O2OJ7HSW/+sof3GL6xQnimnidps6VeEau0bxRoWCu3hfbO2bVx1kR9TGErbiCDE6tnKahbk8pxQbasSh0uLtmq0bceopnjtUnyVsumyYLdnJG0oIZV4SEqxaUbGuVIOTkT3URyJ9ch2oOzLim05H4UehpMSdms7/Qw8R58mSYnA0olwG0JWUG5oLPKgditjiggULz7i3jna/HbJEdmHY4Tnpgm3bnbdmtSKmG/bFubXYLZ438g8oty/kNs8b+RzvC5ejtfUNP+TcGStJ3nez/QS+OIzlGg8F5YMN3FaLbNtN03hOVolwwraTKUpX83tmRPZAYSWi4b1+WX1Cpl0Ge1t4qs4eLaWsbTZtshpmpVsgcJ+8N6r/WX1CpZf8I67jvb5X/6GH07Ufi2fWNJ+Ta7RBql5fsIe8l7L/U/+oWXzCHvPenj/wD1H0/UfifWdJ+TaxKNVLL1g1/3Tey/a/8AqTDl5wdE6czr0TbSSb/+pH0/UR/6svrOk/JtQHcisEeaKGctpFCooawOtGqkcoRV6oh8T+ZTmPsvVz0tETDqGQYJ6otfcwectXKEX5RD4j9Je8IWeKRabU4pijThh/Fpuk05q2tyVnDMQyIAPQbXDA2QAkIrnDIQFRSdK+rzk3XIlzJ0uZGpke1W0zluWKbBRVkWjxf5Dk20w5LxvWN1/WrfPDeyrf4cb6r2KR9HCexfVbdyfSLRm/NfoNBZX8lUzHeP7diazX7KsMm0Qy4VKmWdxRc7AlurcOjw7UY8V5m87KWu0GoyxEVq8zLQVI3ZDse7VTnsW2db1ji+sVrY9zG8+MJS/wCzi+sdj6lpvycz6Rq/waQJh0G73seo6e3GX+5xfWKYdj1M/wAYS/3OL6w+pab8k/SNX+DSiKjdsOx6i14wl/ucX1ipbHt/4xg/c4vrEfUdP+SY4Tq/waRImdKjfaN3/wBHuL/GMH7nF9Y6N/ZC5l2XDeN4+qmCfypZ3N5GrK4dtRrXtu2K8Q08zERZFuFaqtZtNfJpCDoVvEkQdCt4k60cnHCpPQUk6wLjI6VBvFdM5xSOkwbxyFS3Na+yfSZ9sdX+HXBfxrL85gCM+2Onu64L+NZfnIjmxtyfTMAGauAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcVs6knd7i4jlOK29Rzu9xcQHyixZnxdfb/zO1fTRFvRcMVv+tt9/Gdq+miLejBYryGVy+p4+78yKGVwdTx935iJZ1Q9BLI1E1IEHQndOjXbLgdCf06PfN2LmwvycTD0EtEM3tTcew1i2uXaxa62K0r/AMUR7Tpxs8TbD+Jw5drv+CWn6KI9tHmeMe7Hw7XCvTZKDVVQVByXWax2Uq/AVfqzL1yz/SwnhLVCme7tlM6ZDL975I+khPCNa0PUcG9l5ziXvDJRBFTrOemoAJAAAAicwIAABBQ7N0r77WJ/rEHlI66Z2bq9lrF8Ig8pGGT0y2YvXD3bam3Pj3ziz7py2nqiZvnEfPb+qX1fF6IYhlvf4IMQ11wS/D65AeSIehW8etcuXuQ4g7iX9JAeSoOhW8em4P7H+Xif1B/K/wAFCZfRgmX0Z1pcNy6RQEmtkjeGoCuYIKlL3ySHQklCzUoPCCGyUJzktspqSmNhNe0CASJVQ87hT0OOHwEDPWFfnwkW5Ec3v5xNwSVmzSYPJQ0kU5yT3mDyUEzw2T1S+h6f2q/CpF0w51TaEs3Ow+ctZc8N9U2juYfORTmw1XtSva36hkVBuckAAEMIMLSSMex1VWGzU7OvOYq6tvPrMsxyq3dZ+/LzmJrWabc3e4fP+x/lS61KWuE5Gil6TFdRTUiUqBEgRwEohipOyJST4CCUwFC1YxhUWDb8golWwRr50XUtuLfahfb/AFGPjRsw+5X5aNX7F/iXiCWvW0SJfQQ7xLznv68nyueaCdZBJKHfkdKg3jkOOz9Jg3jkKlua1HI0Ge7HXNl1wX8ay/OYEZ5seH+HTBXxtL85EMbcn01AQM1cAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4bd1FP73FxHMcdrVbLOX5kXEB8ocVe2y+t13navpYi3ouWLltcYX4l752r6aItpgsV5J1kxTIJVlbjbSczUu0QjhvB0ssC3ZnmJrG87MpnbzS7VI66LgHLUjrouA6LIobu5q095LvRWuQoW9vFwGwbhyIZR8R4fsmIrouWXaLDbYXHJamvbNJtaKbqZq6PPA09w+gWQOJvIphJNunKUev9NGU9bmnS07VVjTYp1F+xvs8qx7HzKyv+l43vRt+Y43kAysrM8KzX+0/Qe5Wk93hDW/wnK+s5OjofSY/J5b2PeS3G+BsqFjxJii5o7BdkmzzoJk6JtqFxQNLVus9IRYjuWrcNtiabzPafzIxUvvDaNOmDX2zDIcySOfq9ZbPaLTDt8L4VTsTM2Zm8SXLrtj8Uh4muRKrt1FutfzMObf/ABFLKnef06n0yn5S48vkyHFeSS9bkuBu22+fMkuXKhWdpTE38x5SkZGcokaX3ka7pteY9YUz1oSs+7wl/T8TyYK9msKOf9P4Mtu1NpeVociWURr2Hl/KP0FSyH5RW81zQPemv0HqjNTXwlExc4874Sx9bzdIaf8ATODb1S8T4rw9euF74jue+rOpFrlpROFRV0+AtaRsbZINvKxeVXWkMFPFRrk9Lp8k5McWn7vHajHGLLakfYYXhJBu2aUOnbD+btgRV2rzgXGxXBfFtssFpstkimSo21DFu0OdYUxB73xGaYKVcLWHtRR+YvWfdZycmuvW0w9Bg4ViyY4tM82svUriBf3dGc934Zv2TeFkmzbvjhlwz4G3+0jY2eul8JDfrknO882Bf7ka5195iYbo4RirMTvL0jaK8midH4TjOa1v7omU3TjPJ25y9pTypEMLy5v8EOIO4lfSwHkyFc6t49aZc1XJHf8A3uX9LAeTIFzq3j0/CP4/+XiuP/yv8FDv4dua9L+veTdVz2WO1W2conLlp56Qqr+ZHSpuGwtjk9rlguqmb1m0fRRHRy37NJt0cbFTt3ivV1vtT5R08+FrR4K+gj7VWUSvtWtXz+g9ZxOsUWd6XrKaOul8J576xk/GHq4/T+L8peT5eSXKPMmKCDCtqcTdFmfoMjlbHPK9Mghi9TcpKJV56c0/JPSEpxQxw0iadd09CWLqOR3uHiOlw/V21MW7UcnE4xoK6Ka9id93zvi2N2V7/D9mz7lof1SuHY1ZXYlV3FZFv2l/VPokDpbOL25fKLHeGb7wRiGK4cS2KKx2+GWpu0TqnC20mtG4yxcsSt18BvTZ7V+3utzmTI8qYaAobq0iYO3LtcsSt18A5Ylbr4Dq6x4TLuoO8llGB8NXzjW/Ybkw3Yo7bb4oIo1LWZKGFVbM/g2PGV2Or9SzXdTGv4S4bBL/APkBYvgNo+jZ9DjTaNpO3L5x/wBHbK7/AIYXyr+qP6O+VuBQxvC9VDHC2lG26LtbXOfRwPQzGY3ItO7SMyxW6CKCXHZJyihlwqJODQ0kinlO2Vf3LO8Uyic3FPjbet8ZSjxeSkTaXuMWqvWkQxnlO2fks7xS4XDItEmfPc2VHAnDDSq3y7okxisQZNTfJXszCAGDJXAAAiCQCAsOOKczZHf15zEUZZjr2Os3f15zFNZrtHm7nD/Z/wAppRVMRxVlGwhhm+Zl031bbXItUqCGKJQWdRJqJJrPtlumXvoTy9soaPKzacyf3JI+ihL3DtLTUZOzdV4xrcmkxRbHzbehyy5OHpvi3/ui+sT9uXJt78W/90X1jyfRbiJotxHd+iYHmf8AUWr/AKerossmTdf3xb/3RfWKftzZN/fa8H/2a+seU83WoikPWofRMCP9Rap6sWWjJvod63j+5r6xP26MmyfsveHhsa+seU6LcQotxD6JgP8AUWr/AKerocs+Tf33t6/7RfWOriLK7k7tuGr0sNmvi2RWi0WWKXLUVlSTiza9seWqLrUHp0IyrwbDWYmGOTj2qvWazt5ol9Lhep6CoawdTbZxkUzkulM7oCabmkTPkjZuLCWx+ymYiwpd1/3TddimWO3SVNk7e0uGJwPQ2tqXCLY05XlouOxeC1P6p7M2NHuCYM+K5XEbEK2ye3L50TNjjlegrXDkmLuZ7f8ACZXkTyHZTbiys4Yvi9cPcr2GxW+CdPmOJvawrS9B7sA2JvMgAJYgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHHaeppvcPiOQ47V1NN7h8QHyjxh7cr93Oadq+liLai5Yv9uV/L/NLT9LEW1eAwWK8knXvDqaDu3xHOcN4JcrQd2+IypzLcnSAWgFpXQ+hi3j6A5A/cUwj8Cj+mjPn/ABdC94+gGQTNkWwiv1CP6eYcjjPsw6PDPeZuBQUPLvRrZihVuK078HGYXqW8Zrif2BtP7PGYXqW8jC/2dfhnot8oZSyogxdGUUJACAomJ7R0KyI+hZEp2eV9kh7rN49zB5KNdGxtkf7rN4dxBxI1yj3mi9ivw+W67+Rf5lAALaqCLoWBq3+EDZ2CPapY+6j8xeHqLZgiTNeErDFDZ58SbjdVA2no1l2ilTs33NaPk2eazTHeS9po43wV+HGR/bWfv0HGVuCd+TWj5NkQSrRFabPSyWl+vQ/2b3TX2o2WezL0lal90zN841pOeettNiail0f58PpOPaNa4PHh9Jw7VnefJ26Xr2Y82F5c82SS/wCvY5f0sB5MlrnVvHrPLmn9qS/ktq3tJdEok6+uQnkyX0EOnQek4R7H+Xi+PTvqv8KjP9jqvwwXV3mf9HEYAtJsHY5w1yw3Uks/ILR9HEXtR7VvhytP5Za/L1Q1ne+yNBMbpFFWqzvUyNtC9L+Znin0eNtlUpVmQ76PQli6jkd7h4jz5Kih5JDn1rUz0HYuo5Pe4eI9BwTlf/Dyf6mnecf+XKADuvKvnxs9X+Hmn+UyPLmGgTfuzzX4e38UyPLmGgixj5IkekZgDNDfOwRX4frI9yw2jyGfQw+euwQS+33Zt3lGf5DPoUVr82QRFoZIegxGt5nTIn23xlJVO6a123xkHjL+qXsKT+2BEkEmLIIdSSHpAAJE0AigRLIQGP45z2Czd/XnMV1mV436gs/f15zFVrNdubucP9n/ACl9CeXNk608rNq+CyPo4T1G+hPLmydX4WbV8FkfRwnX4J78/DlfqT+PHy1gtAAPWvCAAz7rolmzCUgO5Kuq85sEMyC7bZFBEqwuGRE01urMcsFw31H0F02+L/t4vQY9qErdUhl1iw5f0KrFc9vX+hF6CiZcV9wQOKK6bfClpiciKi+YduBb3pFMxCdVXNp1FRDJCJQHpInkPp7saPcFwb8VyuI2Ia72NPuDYN+K5XEbENDEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOO09TzO4fEchx2nqeZ3D4gPk1jqKJY2v1KJqt52rR32Is23jX40XCXfHXt3v34ztX0sRZtJurEbMt1XJI+vi4SIo4olSKJtdsigMtoRvKAAZIRF0L3mfQLIPmyMYR3eUI/poz5+xdDFvM+gmQrPkcwj8XxfTRnH4z7MOlwz3mapgA8u9EtuJ/YG078PGYTubxm2J/YK078PGYTuGN/s6/DfRPyPQQS9BBg6IAAJREWgIkhLyrskH+Fq8e5h8lGuTY2yQX4Wry7mDiRrk95o/Yr8Pluu/kX+QAFpUBF0LAi6FkSQ9jZC582DI9h+GCNpUm6+5Mw5PP7K+EwjIa28kWH+1yX+EzI8LrbT39vl9L4XSPCUnb7OXlif2WIiZaJ7s82FzomnLizV7Rx+EiZ0qZ3uLiZorad4XbVr2Z8nn2WpkyHkkc2a23p25Wk+yzvHFmz2eB62qlR1ocvZacYKJYVvDn5zThhrWKq6NGtKGzMY+1e3v82Hyka1W6dTR+h5ri/vR8IaNn7FhJ5cbmzVTkWjT3qI1kbN2Lb2uXG5F+itC/wDFEbs/t2+HMx+qHtaKXLcTrKg07hQ5UqnSZfAcsS56LfZS9B5F6iLTtzcTly01SVBp3DZ9n6nl9wuI1lFu9s2ZZup5fcLiO5wf/wBnF4vMzNXIADtOK+e+zzf4en8VSPKmGgzfezx93uL4qkeXMNBljHyRKRQglGaG+9ghny9WZ/qM/wAhn0JPnrsEXTL3ZVXTYZ/kM+hRWvzZAegBmI1vO6dH3TKUVTunR90yg8Zf1S9hSP2wqFSFUkxZJIYABEkVZNQIZC0ksp1ghYsbP7hs/fl5zFamVY3X3DZ+/LzmKPSarc3d4f7Kp9CeXdlDmysWj4LI+jhPUP4p5e2UGfKxaPgsj6OE6/BPf/w5X6k/jx8tXoBaCKnrnhCpXIzz4FuxLjRQclnzWiX3S4yJ5JfVPI5CocleGU1nV2yfJRlpimR2LbZLMNRbt2yfJRlZVA6l9JO57an+TzPJZ2zqXz7D234PM8lgfIqetraZ0O5MiXzkFVoz2mc92ZFxlGo3xyZJJWrfIGpCeQ+n2xq9wfB3xZK4jYZrrY0OuQXBr/yuVxGxTQxAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACi09TzO4fEVlFo6nmdw+ID5L46zY5v5f5lavpoizIvWOs+N79f+Z2r6aIsq0m+nJKVmIYpmCRmhBIZACZ0EW8z6BZB3XI3hL4BF9NGfP2PoYu5Z9A8hKpkawl27DF9NGcbjPsw6XDPeZqADzD0S24n9grRvw8ZhVMyM6vuXDOumfLibSdOMxaG7pCh6ZMZjd1OH3itJ36rcUvSXN3fI7JMI5nSa9MmGDod7VbRRlx5nSK9MmB3dJ7LMIO9qt1A9BceZ8nssfAUR3fK2jpNj4CTvavJWySzZW7x7mDyUa3NnbJ6VyHK7boa1rLg07yNYnu9H7Ffh8x1s76i8/2nMMxALSqB6AS3RPeIlMPX+Qr3H7gruzv4TMTD8h7/BDh5dqb/CZgtB4PWe/f5fS+F/xKIEb9am97i4mQ9JTPj2lktEeaqkxvPrzM00je0Qu5J2pMtBWRrlaXn1HI6GEWfG1rhkQpXdZ4qZq7drzFbxvbPeyz/KP0HfjS5Hm/qmn6r5jJ/wBVrf3MPlI1tCnTQZvcN5z8ZYgsGFJ8mVYpV5zlKjnQc84NeZeA3VN2K1yS5scv1b3lzkTh6jg1ftFqmSunrtknZxtbkjVZd8UbvMNHuGzdivC48udyLck2h/8AiiNow7Fm5P8AG95/uUH1jJ8mOQi68C41smJ7Lii226bZoJkEMqZZYYYXt4XC86ie6Y5dbhmkxFlammy9qP2tvxPnot9kUFM7b1upJ5t6DbyURrnTZVm6nl9wuI1vEqwsyaRiiXBJggissyqVMx1uGZ8eLtdudt3L4lgvl7PYjdkwMc9VUr8kmhYpkt9SzTreNwfk5Xgs/wCLwzs8/d6ip71SPKmGg0me48teRG6cp2OZuKbZiS8LvjjkwSYZMFmhiUMMLienbfnGFw7E+4NeNr0/coPrGdeI4IjbtHgs34vKNHuEo9XPYoYe/wAbXp+5QfWC2KGH1/1ven7jB9Yy+pYOp4LN0YLsF3tdkJd63bDafo2fQ88w5Esh1z5MsoEjFtmxFb7zjlSZknkMyzQwLn4aVqonum/HiiVXNZZrRrtrsEzv2jwWf8WRB6DHHimX+STfmIixTBtXSyzK9sx8dg/IjRZ/xY1P6fH3TKUTFE444o2qOJ1oFoPL3ne0zD1FY2rESEggxSkgIMISgyklAKkE7pCAsWNeoLP39ecxTWZXjZ/e+R39ecxXWarc3d4f7I1mPLeybb+2za+1ZpH0cJ6keZN7hiOLsg105Q73ixRa8TW2xTbRBDByGVZoYoUoEodLiW4dPhWamHLNry5v6hxWyYIivV48Ioz1ctihh/Xja9P3GD6xEWxPuCubHN5rfsMH1j0f1PT/AJPFeDzfi8pFcmvJIXuNcZ6pexOuH/HV5fuMH1iYdifcMMSiix1eLadacpwKv+4ieJaf8k+Dzfi9T5E3tskmFonruyT5KMwMGwXbbJhnCN1YfgU+0q77LBZ1NcKW32qpXSXhYps35NP4F6TV43B+UHg8/wCLITqX17D234PM8llo9VVn/JZ/AvSdW+cU2V3NbttInQpWaZpS619smNZgmdosidJmiN5q+VU3PPm98ZC0EJ7ZxRU6KJslHQjk0xBCVayEStKFuSX072M/uC4N+K5XEbFNd7Gr3B8HfFkriNiGhgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHHaep5vcPiOQotHU8zuHxAfJfHWbHF+p++dq+liLNrLzjv28X98Z2r6aIsxvpySkayESZoQwSyEBEfQxdyz6CZDXXI1hCn5BF9NGfPuPoIu5Z9Bch0LhyNYP8AgEX00Zx+M+y6PDPehmYYIZ5d6J1b19jp3g4zH9SMgvT2On+DjMfWhGGR0dF6Z+RDWBnNa4EMkgCGUTOgZWyiZ0uKu4SPJeyoVMsFtzunIYOI1WbX2VsLhyu2htdFZ4GaoPeaP2K/D5vq/et8gA1FpXBukhkSmHsHInVZIsO9uGa/JMu1mJ5Ffchw33E3+Ey48Hq/ft8vpfCp/wDEooaOK2V5StFHT1mPyWc9DjtS+47R3mPyWacfrhazz/tW+HiWR0lb7K2jjk9L/aZyPQe1jk+aTzZRkfVcq+GU8/3avJZ9ALQ3yzO75FxngHI2vwsYZ+G/ws9+2jqmd3yLjONxXnV0eGx+6ynbMgBHHddNCCopZEAACQIoiQAAJoBBK0EUJQN1S0EUJQIQihFNzMVAG6Eg0KjSSkI0lQoEKVoBUiGgIBJDAkpRNQgLDjbqCz9/XnMVMqxt1BZ+/LzmLGq/N3eHeyh9C94zLCKph+QqfjReUzDtTMzwpnuGRvxeUzKjXxP24+V0bbIqTm7QfaMohx9xMjdWolIEiGgVFIENLcOjiD2AvLtWWPiO+y34hrzAvP4JHxGeL1w15vbt8PmvKXOeFlRTK6Dwsq0s9xXk8mmhK1EFUKzoSPp3savcHwd8VyuI2Ga82NipkIwcv8rlcRsM0sAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAotHU8zuHxFZx2nqab3D4gPkxjv27398Z2r6aIsyLvjj27X98Z2r6WIs5vpySqGsipJmgAAETKbSLeZ9AciNok/abwkop9nhcNhiUSinwJp8lj0ps+f9M2ip2pd43jKlQSZd4W2CXAqQwQzokoV2lUp63S+Jp2d2/T55w37UQ+kvLNmr1VZP3mD0jlqy16rsf7xB6T5tO87yf94275eL0jmleWq8rav9aL0nL+iR+TofVr/i+j15TpMdgnQy58mZE10ME2GJta8yZYkoqZoIqU61nljYlW632jLZd0m0W60z5TstobgmTXEulvUz2VXO99nJ1+k8PeK7u1wzXzkpPkxykXWx8DFItUMXAzJKivaKPZdPxc9GN0i6yLgYpF1kXAzJPAUtjsni56Mdo9yLxWREudeaLR1rMjzjXoHZJ1c9Hj3ZTYfv635T3arDc9ttMh2aFKOVJiiT0mqYcLYorT1O3p+7Reg+jfJ50KShnTIUtSiI5YtGq0TF+0zuYeMTipFOzyecy8KnJeb783zohwlituiw5ejb/VovQWy3WS12G2zLFb7PMs1plOkcqOGjT7Z9LYLTanHC3ap2lfjs8I7JOJx5dMVNttq1vSdLQ8QnVWmNtnO1einTxG8tdh7vaJRES0nVmfJRexsjEuNZIMMtSo4k5cx1Sr1plfI5mqVM8VnFsdYm8i2GqL+zjXkmwa1PCausd/b5e64drbU01a7MD2k2vSpnisRS5kVntC5FM6RHphzdCzPDgvFVu2194meSzVjrHbhvz66bY7Rt9nzpk9KXdM5K5jik9LfdM5D2ccnhpZVkd91XDNPy3+Fnv6f0+b3yLjPAmRn3WMMr9d/hZ77n9UTe+RcZxeK86ulw31WU0BJDOQ65UaQiQbqWKEskI3UgkUCRoE0zAIAkESDYqRUkARUMlhAQkSACQAAAA9AEPSQySGCEEpkAJWLGu2dgs6hgjifJk+dhrTSYwoI3n5HH4j9BsWoqYzWJW8Gtthp2YhrvaRpP1uZo6xmYYY5y5JCj5yKsWaJ0ekufgMGxbHM5vzlDOmwQwwQ0hhjaWhExEVjdtnLbWzGPl92cqKHVHA/CiU09cPazmsFMmJKk6f8ozsXbMnO+bBDyxPo5yTXJHRqqG5fh01rM9rk2R2tfbFBHmja3CQ5qlkEsglMB0cQL7wXl8EmcR3jo3/AJ7gvJfqsfEZ4vXDDN7c/D5qyug8LKkUyul+FlSPcV5PJpKlpRSipdEhI+nmxt9wnB3xXK4jYRr3Y3e4Tg74rlcRsI0sAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA47T1NN7h8RyHHaeppvcPiA+S2Ofbtf3xnafpYizl4xum8b3/ROnNS0/SxFoo9xm+vJKCpCj3GDLc2AAEAAJEUJoAEtubEP3cbs+CWn6NntGud77PFmxFr9vG66fklp+iiPadHnzPTuHleN+9Hw9Bwf0SkEJPcZO1e4zjQ7CSllTTpoZSSmDOCVoBAhoiiJbIegkIM0UO+jwnsjXXLniv4bEj3ZB0S3zwlsinXLjiv4dEdzgnrs43F+VWAonU32gRFoe8elnk4D3TscfcVw53Ez+E2EkYBsd1tciuGu9Rv5oTYC1HhtZ79nrdF7FQ4bw9jbX8HmeSznojhvD2NtnweZ5LNeL1x8tub25fOWQ6y6/nM5Tis3SVvs5T2EPKstyMZ8rOGPhv8DPfk7qib3yLjPAeRf3WsM/Df4Ij31O6om98i4zi8V9VXT4bzsMhgk5Dq7ooTQlaABFO2CQBAJFAbhFCQDdFCUGAbgAAIAAAAAAAEMCgpn0MAQyaJEUzhKKAqIYN0AAAYJi5ff+0dzB5KM7MDxf7YLR3MHkoi3Je4d73+FppU7F15r5sD/TQ8aOBHPdnsvYO/w8aMY5uvm9FvhsyLo2TUiPo2FpM3mSLOU0zlQApOpfi+8d5fBY+I7b0nTv90uC83uWSPiNmL1w15vbn4fNOV0HhZUtBTK6ArZ7evJ5QRVD0SKUVLSiJH082N3uE4O+K5XEbCNe7G73CcHfFcriNhGpgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAETIVHBFA9ESaJAHm+99iJgq8r3t14zL9vSCO2WiOfHDDDDROKJxOmftnVWw3wNX2fvZ+Bek9NAneR5new4wL7+3twL0mu9kLsbMMZPsmF4Yquq97wtFpskctKXNhW1iUUcMLrwntw0vs1Xtdjzf2enPyPpoBEyPnHq7TRJSlzqRUWISAAbmwNYJVAhsPY4TZ0nKtYptnnRSZkNktDUUKTa9be6emFfl+Z270m111lw5zzLsdaPKnZF+qWj6Nnot6zzHGPej4e0/TuOttPaZj7rg78vv31m/JwlMV+X237KzV+xCdBChynf7qnRlGC7yva14jkyLVeEc6S5cbcDgSrSF00GcmvsBZsTye9TPJZsBaEYXc3U1iMsxCUVaikVMGkIbFSGNzZMvo4e6PCOyIp9vHFdPy6I92w9Mh7bPB+yEf4bsV/DojucEn99nF4v6asGWkPT2gRE9OrMelnk4D2RkUtttk5JcNQSLTFBDyKPMoU+t3TYOG7XbZ957SfaNvA4G6NI11kY9ybDVa9Kj/hNg4a9k0/zGeE1c/wDkW+X0HSY6RoKzt57MoOK3r722z4PM8lnKii2extsb/J5nksxwz/uQoZ/bl84rL0lb7Oc4LK/WVvs581D2MPKsqyNumVfDPw3+Fnvycvuib3yLjPAWR57XKthh/ry8lnv+cvuid3yLjOLxbnV0uG+qyhINEkM5DrJWgEIkAAAAAAAAAAAQAAJAADYADCAs+LrVabJcznWSdyKZyWFKJJN08JdyxY59gv8AXg4w2YI3y1ierHIb8viue8Ivk4fQVc3L4f8AeEXycPoLYkypI17y9B3GL8YXi7r3vaZeNllzLc3LmTVDFC5cOdcBm+s11dXsrYqZvXl5zYiM6zvDk6+laXjsxskhigZkomYgAAYJi72fn9xB5KM7pmMFxfTm/O7iDyUYzyXuHe9/haFpOe6/Zmwd/h40cBz3Uvv1YO/LjRhHN2Mvot8Nmvo2CG+eZKNs83mEMBghI0W/EPtevP4JHxFwbOhiJ0w7enwSPiNmL1w15vbs+acroPCzkegol9AVHtqcnlEoqWkphKlpQlOz6ebGx1yE4O+LJXEbCNdbGh1yDYOf+WSuI2KamsAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADTOzSlRzdj1f0MCq1FIfBOgNzHUve7bBe93zbvvOyy7VZZqpHKmKsMQHyFUUNK7aHhFYevh4T6kTcjeTCZHto8G3c3+36TijyJ5K41SLBd3Pwx/WNkZE7vl4nDXo4eEqTT0NM+nUeQfJHH0WB7vf7cz6x4D2RFyXZhvLViW5LmskFku+zT4FJkQNuGCsuBulavS2ZVvvOxuwEaAQzYhsHY8NQ5UrG3m+5Z6/8bPRz2tc7R5Aw7fd6YdveXetz2nle1y4XDDHRPNEqPSZM8rGUBurv6JN/oZf1Ti8Q4fk1GSLVl6HhPFsejxzS8b7y9M87uoc71y4TzQsq+Pvf6J/6MH1SpZWcfLRfj+Rg+qUo4Pm6w6n+pMH4y9aYEp6ppNGulRr/AGsz/XrPCVlyxZRrLOU+z4hilTEmlEpMvX+ydxZdsqv+K5nyEv6ong2Wfuo5+OY737UVe4geHHl0yqP/AKqm/Iy/qkPLplThTbxTMaSr0mX9Ux+i5erVHGKdHuOKi0lLaNX4ExHf97YHuS9LZek2K02my7ebFtYeee3iW52kXxXnetM94TPFh9Bx8lexaaz9nosOlyZaReOUs0ha5JBvnhDZBprLdir4bEeu4LzvVRwt2+Y8+jar0HkDLrMinZYMSTI23E7XFVnY4HP+5Li8d098VKzZhREWiJ9ommYiKu1i3j08vLvYmRajyS4b71H/AAmwcN+ysK/Rs1/kUS+1Hhzvcf8ACbBwyq3su9viPCar37fL6HpZ/wDAr8MoRxXg/vXbd3laZ5LOVIotMKjkTYIs8EUuKGJbqaMMc9m0S5+SJtWYfOOyw+sqtMzZzU3j1NJyTZO+RQvmA46qtYpsVeMqWSjJ1/hxfLR/WPQRxXB/bnfQtVMb7Q8/5IYG8quGE833cvJZ7+n5rTO75FxmlcKZMcB2HFN3W6xXLMkWmRM28tqbE0mk91m6I6uOKJ6W234Tn67VUz7TT7NmDQ5dLeYyfcIZIKC0LSSQiQAAAAAAAAkAAJAGRnqBIIRIQBgAQWHHTpcUPf4OMv7LBjv2Bh7/AAcZE8m3T+9X5YfpCRCZKZrh6SXaupffex9+XEzYaTNVXnarRYrDMtllj2k6Tz8EVK5y2rG2J6U5op/sL0G3HXeHL12G+S8TDc9SGzTHq2xR74Q+IvQR6tsU/l8t/sL0GzsKfhMjdGYiqNaYQxNft4220yrbbYYoZcCihUMK9BkvNG36VaU/Aa7TFZ2TGkySydPMYHjB/wBYJy/MgzfsouvNO8VonrgOxZLosd7SVbrfLijnxtpxJ00ZjHeLeUNuGs6W/bvyYadm6c18WGvZlxoy1YWubsUzxjlkYcuqTPlzpcqNRy4lFC9sIrss34jjtWYiJ813b5574qHnddJBk48QmoIJqE7IOhiT2uXn8Fj4jvnQxH7XrzX6pHxGzF64as3t2+HzWlrnEVFMroPCVntqz5PKQIq1ohE60JTL6c7Gf3BcG/FcriNimutjP7guDfiuVxGxTU1gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHzL2VufZD4upqtEv6GWfTQ+ZeyvotkTi+j0z5f0MsypzGsAgDeBFCQSAIqSAJqQKgCmY/W4t4mpTM6XE+0RPJMPZWS9UyaYbX6l/HEZIjH8mcNMm+G/gP8cRkCPA6j3bfL6nop209PiFUPRQ90jyPlx917EfwtnrhOkUL/ADjyNlxf4XcRv9biOtwP3ZcH9S+eKrDVoIi6GLeJ1ERaIu5PUTyeLex8i6pkiw33qPihNgYZ9lf2Ga/yNOuSTDSXYYuKE2DhlffNv8xnhNV79vl9C0v8CvwydZymd0qPuWVrRoKJvS4u5ZoifNTYHLzSod4BZpcKIMIejjk71wP792Pun5LM61mCXF7N2PP+O1/tZnehmyvJxuI+7HwMkhkmagCoJzAAAECAAABAG4AADCBDYEkNgICUAGBCLDjr2BXwiDjL9QsOOvYBfCIOMfZt0/u1+WGFSZFM70jOaYell1L/AH95bT3BiCeZGW3+6XLadfOmJ0RZxclXNzKkEsg3NDJMnvsjbH+iMzSMNyer7vtm7yJGZ8JTy+psolaC/wCH/YyDuouMsFDILgX3rl91FxsxpzVdbP7Id8AG1zQAawADRFd8CTo4hzYfvN/qkfEd4t+JXTDl6U/JI+I2YvXDVm9uz5ryVznhZyMokdL8LK0e1jk8rECKoaVRBOhoSl9OdjT7guDPiuVxGxDXexo9wXBnxXK4jYhragAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA6l9WibZLmttrkKFzZNnmTIFFocUMLar4Uds6GI/a9eXwSb5DA8QXhst8p8m32mTBY8Owwyp8ctKKyxt87E11/aOD+l3lS/JMOfukf/AMhoS+8193iv1yf9JEdVEtkV8noT+l3lUr1Hhv8AdI//AJCiPZfZVINNjw26/qkf/wAh59bOK0aUZRG8omsQ9Df0wMqdOosOfukf/wAg/pf5VPyLDf7pH/8AIedswM+xDHZ6MlbMDKeo4XNu/D0UKfPJWaNNrtc+aQygYnt2M8aXnii8oJUu1XhMUcyCUqQqkKhVOAsVSCYpEISADMAABD0kgACNZJAApmdLi3ipFMzpcW8RPJMc3tDJv7nWG1+o/wAcRfjH8m2fJzht/qP8cRkB4DUe7b5fU9FH/j0+ITrh3zyPlw913Ei/W4j1x+NDvnkfLkvwv4k+FM63A5/3ZcH9Te1VhuoiLRFvErQQ9D3j1E8ninsPIo28kmHK9ij/AITPbotcmx2vk07bbTatc6qmCZFvclw33mP+Ey3UeF1Xv2+X0jh9Ivo6RPRk0OIrtpon/JsiPEV3RQuFcnTaaXrbMYZD0Ffdu8DjVaElTeAelgxhd2dy4V9/bF3b8lmdvojBsP8As7Y+7fkszl9Eba8nE4j7sfAECDJRhOslAASKgUCAAAAAAAAAhkkLSCChIAAMEMCNBb8Q2CK87u5Whmwympii2zhroO+9JTH0JLKszWYmGJrC0/Xb5fyb9JV6lZnvhL+SfpMmeZkNsw2hb8Xm/Jht9YSmzLqnwO8ZdGuxP0mOLBUyma9IPkn6TZl5Z7BMXaLIRN5r5QsYb3yRvaWGvBM3VekHyL9I9RM730g+RfpMyFSO+s27LDhzD0d0WmfOitkE9TYFCoVLap85fNq6aSoGubTM7ymPJSoWX+4k1dsFeufGyxaql+uR1u6B9t8bM6c1XWTvWHdABtc8IrTtklK0MlEtZZX8st3ZNr/sl02/D9qvLlmzKdDMk2qGXSuqjhZhT2VmG0/aRevbpeEH1DCtm57odzLcu2DiRoPXrPS6fQYb44mavO5dVli8xFnrJbK3DVPaRe//ALhB9Q6t7bKbDdsuy12OHBV6QRT5MUuGKK3QNQt63zh5Y4RwliOH4IneKtU6jLMbTZRKhihhz6XnocgBcaoCaaN8gqTzoiUPptsZXXIHg34rlcRsY1xsYvcCwb8WS+I2Oa2oAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGD5b8fw5NMCTMTxXc7w2lolyFJ5JtKuOuetHuGh4NmIn0WBolvW6v8BEzEc2VaWtyh6wB5Qi2YcP4uBonv26n8BEOzCienArS+H//AEI7UdWXdX6PWBb8TOmG7ze5Y5r/ANjPMcGzBlt89giNLtW2v8BF47LS77fdVtsU7Cc+TyxZpkuGJWjbc9FC0vxd1jt16ndX6PHV8xVvm8H+uTn/AL2dVM7toslpn2mfaHBBByabHMpttG2ibp85SrBaPzPGJi9W2MdujqvPU4rRphLhyhaN2XwnVvCzzJG0cbh57RQ2UvWZY3paI3dZDSQgbmgoSiEKZyRIBDYEoEIlgQ2KgUYAUJFQIRTN6CLeKimZ0uLeInkmOb2bk0f4N8OfAv44jIEY9ky9zjDlfyL+OIyE+f6j3bfL6pov49PiFS6KHfPJOXRUywYkX60z1qnz0O+eTMuyplhxJ8KZ1+B+7Lg/qb2q/LCUItD3iUQ89XqSPUS8W9i5F1+CTDfeY+KEywxTIko4skWHWlolxryTLnLmdazwmrie/t8vpHC5/wDEp8ONkNVRVFDH1rIo9DVCvtLobwlrOxQqihcMTTWdPODFO7s3Fmv6xd3F5LM7ekwa4kubljibSSidX+yzOHHCn0cHCbacnF4h7sfCakFLmS+yQ8JMMUMTpDEmzNQ2mFSJIS1kgSCCc4QAAAAAAAAMhEvQQmEwkhsVJWdpUzhjPkggo5LKaqpkD8IU2U/7SDhJ2lOyvwlEfQ+Enkkvr4OEomRy9r0yDhG0so5qG85C0kbaFvooX4Q4kvxoeEjsyzcF5dRTN4sjRe7c4YrLHCo4W2t0s+1ibzQGq9Z3XdNO1ZUAr5HM7GxtYtcBj2Z6LO8KGgmVJNtpKtNNNQUMWnaxLwEbSxm0Qpesv1xexcHdPjLIoYm+hfAX251tbuhTzOr075spHmq6qYmsbO2CWiDYohSVBLSB5F2bj/CNdK3Lrg4jQjN+7NpfhHup/wCVwcRoNo9lpJ/2qvK5Y/fKlFSISJVFpaLO7WkUI5JLr0cK8IccvskPCY7m6USUqOXXpkHCTt5dOmQV3KkTI+m2xgz5AsG/FkviNkGuNjHC4cgeDYYk01dkuqe8bHMGoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGi9nH7hU2nvnZuOI8KwLMs57p2cvuFTfjOzccR4XSzIr5ucL2k5SlE/8ANISJoad1xBJBK0DdCGl/xlL3ipoE7ikteIc0FnpusuzoWrEHQyN9m3B64ac/ola4SSISdB0XMAK1BIhkEsIAg2SQwC0kspKkAIoSAKSI+gi3ispmLnIt4ieSY5vZmTT3OcOfAv44jIDHsmr/AAcYc+A/xxGQI8BqPdt8vqmi/j0+DWt88m5dHXLBiT4Uz1m9FO2eS8ufuxYmX62zrcC923w4P6n9qjDCN3PqKin0HqZeKbqybxRxYGu6syNJONJKJrcMh56nTZnjsx3JlnwLYe1MmLiMjoeV1ER3tn0PQTtpqfCh7bsszxmV2ZRO32VclmU5NDXn2KIqs6+7bL36HjNMxGy1vs3baYVyeOi/GZxOE7FqX3TN7o4mcqeazXlDjaVVpqtDG1VdfCyoZyEqHDD2/nO/huCFX7Znnq4Yq53uM6R38Peztm3ouIyjm1ajburfDMqkhLOSzc87E+QyEwAlIIRIBkUJFQhCJFUAAoABB17xaVgtLeZKVE3nOw0da9s922rvEXEZV5wfeHl2W9tA245je2i/He6+2TR9fM8d+kiWqQeGLjZUy69tWtdo8lLr2SZ479IcNdMUz5R+kkEMuzHRFH18xf6j9Io+yTPlH6SQDs16I2qf483x2FAk+jmeO/SSiWxsxmteiHA9Uyb47KHBnzxzfHZyVA2giK9Gx9j1D98L+bccShhlU20VaVURt+vb+Y1JsfoUrZiB7sEriiNuFbL5S8tr4jxNkduvzFVdHEQDUp7KiGKkACdRA3d4EvJGzaz5RrpS97IOJGhGb62bebKRdT/yuDiNCnsNJ7VXlcvrn5KEROkMTq9BJEfQtdosS1vofkFyY4AvTI3hO8bfhW7rRa592So5s2KB1jiazt5zOftTZOP8H3Z4j9J1Njd7g+C/iiT5JsEwamEvJLk3enB92eI/ScUWR7JlF0WDLrf7D9JnYA692WGyXZd8iwWCzwWeyyIFBKlQKkMEK1I7AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAANPbKnKJiPJxg2w3rhuKyK0T7VyKPliTyRUrDoVVuiZ2TEbzs3CDwj/Skyr1zWi4qfF7+uVrZSZVaZ5tx/uD+sa+9q3eHydG9tnKq5CZ3avOzccR4Yh0I2jlKy44zyg4Uiw5f8u7lZorRLnbaRI2rTgr2+2awhVEactotPktafHakTugImmcI1rKCVvhk6mBx7eHVFD285G3h6+HhMZjhhc2OsKfPvjKXBB1qLkaXfz3Up1UxPJlG2h07aHhLZf7TUhpp53oZatpDm50bVZmlQzx6fsW33a8mo7UbbKlrGkBFlWM6ZJFQmEjIzlTIqECJYIYBElJVCDfyNyuYiqrSqqZZkjue77/AMod13VesiKfY50UXJJadK0VT0XFkpyebeKFYdaSiebky3e5Ofq+IY9NaK2h0tDwvLrazOP7PI+2W6iJrh5HFnz0PW32psnb/wCno/l19URZJMnLga9T85duG0JfwlT65g6Sv/6c1UdF1yZtPJvhymf7h/jiMgRw2K7rHc1klXRd8uKXZLHCpcmGKKrUOnTvtnOjzGW0XvMx93ttLSaYa1n7QlanqTznkvLr7seJaNZ7Uz1o1oMNxFkxwZf182q97zsNsmWy1RuObFBaVCm97al7hmqpprza7mca0OTWY61x/Z5KVKaQ6UefQeo/tNZP/e63/va+qRHkcyfKH2Ntz/7tP+E7f1nA85H6d1f9MGyXQ1wHZIq/2szN4UZG8xh+Vi2zsnd+WW4cMQwSbBHZ4Z20nrkkSiiWfPmMPeUnFHZLH8j/ADNHg7557yvKXQpxXDpKxgyR518m33mJs8S5fsunPOhNPfbIxO/x7H8j/M7N1ZQMQ2m97FInRWVwR2iBOkqj075FuG5YrMso47p7TtES9lWvqqb3TOJlut9vtMNtnJRQU27/ABTru8LV10HAebms7y9PSszWF3YZb7utk+fa1KmuFra1zIuBExsT5Shnew4q37Zu5i4mdFnPd02ZIt8udLpVJrOq6iYlqzVm2O0QztAx7mtbKZ3L8Uh3tbNTl+KbO3Di+EyMg0hGOu97bDDX1rxTIZVXLhielpMmJiWvJitj9SsVIqCWpLIJIYDUSiESAADAVR1b19i7V3mLiOwzht8CmWG0SnE1DFKiVdwyrzPvDy9CqQU7b42Q1vmYSsG2Ta15ftKq26LfK/UbYn/6+0m/vqPZxlpswvwCj3DNFgqwvTb7USsE2D8vtQ7+ie+qwqj3BqM29RVg/L7UQ8E3fTq+1jv6I76jCh4DNPUTYPfC2cJHqIsPvhaie/od7RhngBmfqIsPvhaiVgiw++FqHfUO+qu+x+dbdfy3YJXFEbcTetGAZJ8PSLotd6TJFqmzXMglqLbrRRMz9LNpK+S0WneHmNdMTqLTCQPCDFUAAAG7vAanvEonk8j7Nt1yjXT8WQcRoVG+tmwq5SLq+K4OI0NTOz1+k9mry+b1z8oGZvwE6yN0sS1Pp7scGnkIwY1o5kyfJNgGvdjZ7guC/iiT5JsIwagAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADzvs8oFFkssMdOht8HzxQnog89bPCKFZJrLC9MVvl08eExv6ZZ4/VDxOVLQUpOucqKTrpRJGemipPhJAEb2cZwJJS4iEVLzCBikfTZndvjKWTG/XI3+ki4yDrV5Q49uZqJRSStBkxHQlkIkCEHmFRqAVFCCpaAI0CoekAQVQ6SklAZ9sfVtsrdzdrkj/wBrPV0zPOja0beLjPKex3aWVu6O5neQz1c+ii7p8Z5TjnvV+HtP0x7V/lTCiYlzjKkhF0EW8cOXp90W3Pbp3dLiRxo5LX1dP7pcSKCU4/TAUskgndkMiJZqDWGTuh5x2U0NMeWF/qUHEjUms29sqoXDji73u2GDiRqJb57jh/8AHq+Y8T/l3+Sh3cPquILuX6xBxnS3i4YcVcRXd8Jg4yzl9EqmHzyR8vaN4P7tnd2zrnPeDrbZ+jo2dfOeBmfOX1ukfth27o6vh3mXgs90V5fhqqZmXpaMxrtza8nNGo5LNmnIooVSHSdCYsPs7zIegV7YZG7QomdAzMJPSoO5Rh8x86zL5PSZfco3Y3P132V0FATnM1AIZNSACJIAEhkVDYNkPScdo6mmr9Gysicqypmf+zZJs1hLXOrw8ZUkRL6DwvjK0jTL1MchIqoQSn2iADBFQAJXgFCUbICJ0EIJhkeBH6/eC/Ng4mZQYtgXqm39zBxMylGccnA1nvWACGyZVkghMMkSyHr3iSNT3gieTyTs2PdFun4sh4kaG1s3zs1nXKPdK/yyDiRoc9fpPZr8PL5vXb5U6yUs++CFmabLMtWz6c7Gv3BcF/FMnyTYZrzY2e4Ngz4pk+SbDMGoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABhOWzHUWTrAVrxRDYIbc7PFBDyFx7Wu2iUOmj3TQMnZgz2vXcEU7m0t+Y2Ls2Y9rkMt8HXz5K/wDLAeE6c8+0901ZLzXks6fDGTfd6si2X0f4uC4vDaH6DAcveXSXlOwfIuJYeisMyXaYZzmOa2kk082bPoNJLeJ/5pNU5bTC1GlpE7qUs7JSVSqhFDUsOC1z3Z5PJFAo3WlGzqc0plOpoPHOe9c1j/aRa6ljHSLR5qua9q28pdzmlN/JoPGKJt7zYI6crQP9r+R1qnBaemKj1G6uKkzyaLZr7c3e5szvyWX438gr5nL/ANNLX7X8i20BtjBTo19/k6odXFFFSm2bbXhIKg1mNrVzUkpgUJQCooQBKJICAlgACGs4ZJAEEkFS1AZ7se3TK3c3+ov9jPWMeaZH3cXGeUNjyq5XbmXbmeSz1hNfrszu4uNnleO+7X4ey/THt3+UERukETrqIqRNfrUfcs4j068RYdvC1PlqRMkbSak0oomnopuEepe9uyWXx36DK7rpzMs3cI7OYz2hxvG548olhfqWvXr7L479AeF741RWR/6j9BmiBPZg8fn6sJeF75/VPlH6CVhe+NH3Iv8AUfoM1RNRtB4/N1eZ9kHkmxRijE9htN2z7ugUqyQwRclnOF1SW5CzWyyAY8r1Tc37xF9U9a4uad7Qd7LO3n/mX8fFM2KsUryhpjg2DVR3t585eZFkBxz+V3Mv+4i+qdmw5D8YXRaZd82u03TNs9hi5NNgl2iJxRQrc53SekvAdW/X/V280tDssdUba8Wz3mKz92OTgGnxUm9ZnePNqSZlvwtPmRzuZ96QqN1zSl9Yp+3XhTXYb1+SX1jzzZekQU3N05vCdWOFaefPZxfr2sjy7T0vgnKvh6/MU2O6bFYbfDOtLiSimQpJUhb3e0bOduhr0mNM8lZEXTKxcbelxzPo4j1S87bprOLxLS48F4ikPRcG1uXV47WyzvMO4rbB2KMmC8JcEai5FMzHRIObtDsrrzXl9gmh3vLp0iaWrOM+6NoRFIXKbe0vatcgmcBsKz57PKi3YVxGqZvS2za1mdbLJ7hcRsrG0OZxGsR2dnIgQKkuYAAAAAmApJQQECNNy41DSrhaQCqlQDCIcM3xtVRWXS/7V+grWGb43LJ4Zr9BmtSGR2YXPH5mGepi+P1P5V+gepi+NTsfyj9BmiHgHZg+oZ+sML9TF87tj+UfoJ9TF7002P5R+gzRU3Cc1B2YR4/P1hglruG87JZZlpnOzcjlqr2sbb4i2VzGeYndMP2zuDA6aDG0bcnR0We+aszYYD0gxXGQ4Dz2q39xBxMykxbAfVNv7iDiZlJnHJwdZ79kFzsFx2222WG0SopcMMVaKJ5y2RaDOsMew0nw8Z0OH6eme8xdyNfqL4KRNFhWGLw1zJPjfyDwzeFM0cnxv5GYg6/0zT9HJ+p5+rDfU1ePXSPGfoHqYvB5nHJS7p+gzIEfS9P0R9Sz9Xg/Z3XTMu7Htxzook+S2By/DDSvGedWs56r+yIy6YhwrM1xSbQuDkZ5VbOhjrFK7QrdqbecqXpIekqqQ1nMx9ONjV7guDPimT5JsM13safcFwX8UyfJNiGLSAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcFrttjsiTtdrkWdPRyWYoa8IHODoc27l997v/eYPSObdze+93/vMHpA0rs4pm1yORQdfapa/wB0LPD7Wd757X2bFosduyP7eyWyzT+R2qW2pc2GJvnktTPFCzN7tStm5uhpPTIiQgaVsARK0hLp3v1DX89FqLve9OZ7beiNFmcUK1ot4Y/ao6j1qjgtXTFvHNtoeuRw2hpxpprQWKR5q1uTjAIqbmpL0FJJAFSAQYChFCdQAhImhDolVuiO3Ddl6RSoJsN2WyKXGqwRqTE1Eu00gbxHN1QdpXXevvXbv3eL0E8yr196rd+7xegeaO1Xq6gO/Bcl9zFWXc14xKtKqzRegriw9iGHO7hvP92i9BCd4WwhFxdxX97x3n+7R+gpdx37TPcl5L/to/QN0bwzDY9xbXK5cze5M8hnq+N+uR91Fxs8sZC7rvWx5U7on2q67fJlJxpxx2eNJNwtLUepottySKkua1tol0t7r7R5fjdbWyxMR9nsv0zekY77zt5hTN6TH3LJTi7HN+TfoImKJy4kpU1twv8As2cWKW6PT95j/KGxLs9jLP3tHOjrXW63dIWdNS0mmtB2DN563OVVSakEVDFVUN5mU1Fa+HMDZimL/ZiB/oi0VzF2xhmvSU20vWvQWdRQ06JGu3N3dJ7NVSOrfr+8N5fBY+I7G3h65HUvyKF3DeS2y6ljMsPuQz1Ex3Vvh4hs3SYd45DjkOHkUK2yqloOSsPXI93Exs+YzE7swyKumVa4u7mfRxHqhvO988r5Etq8q9x56rbzM/8ApxHqiKu2ipDFpepnnOMzvkr8PYfpvaMNvkBKUT/Ei4CGnpo6bxxnot4BqYoTTSQlRO6VEbVs3UsruFxGq5y9benObTszpZpXcLiNkcnL4l/6uQgMiqqZebmQqqEyE0MwEkMVW6AgAASAASAARAlCpDAE1JTKQgbLdih/1ftncGCmc4qaWHrY3o2hgrcK/GXCYXdfhsfslLZDKdtDurhG2h3UYukyPAr+6revzIOJmVMxPAL5La7wcCiiShgVUu0zLFDFToYuBmyInZwNZMRnspirRmdYW9hZPh4zBooYqdDFwMzrC8LhuWSok08+nfOtwmJjLPw4PFpicdflcwAegcAAAHjT7Im/v3hJforT/wDrPKGs9WfZE89/4UW5JtH/AOs8qPSIbK8lOsl6u0EGSzfTbY0+4Jgv4pk+SbENd7Gn3BMF/FMnyTYhDQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeRPshc+0yp+F4JU+ZLlx7dRKGNquk9dnkH7IfTk+Fc+esf8REprzeVOWrTWvJ5qfajYdpnvTPnfKM4VoFc5gs7Q7kq12qbyOyzbXaJkiu2UuOY3Cnu0O1XtlvsvVUvwnf1s0Zea3gj9qUSEDVLeEohkolLoX86XY+7RYWX6/vY198hLCkX9L6HN1XrKJjwCoZZVRkEvSKEoAAgJDAAhEgARM6XE+0e0sDW2fBkwwlLlTYoYeZzidN3ksZ4tmdLi3j2Lk/biyaYTb97ovpozo8MrFs+0uVxa01w+S/q22vVaIyqG322qXLMdNec62saz03dU6Q813l+sthZO7baY8OzY450cUStUUKbejNCZG7banm5PHwmJZOPa5aVuW18UJktM5xMmOveW8vu6eK9uxHm5narT2aLhHLNop01s4gY93Xo2du3VyO0T3RuY3QjksxvPFXfRQBOKk84TGS8cplWpse6uAnksdVTavfRxhGNsOPb0wyjNl38rT/y4ZsVZ015+i0eAhCPp03uvMgj5ZqPet8y+o6f2a/AADU27BBL0EBLitFlstojUU+zSpsSVE4oUzj5n3f8AkNn+TR2kQxuRM9XX5Qu78hs3yaOG3XbdsdgtMDsFmpFLafrazo7xx2nqWcvzHxE7n3aasuE8Kqzy2sNXQ6wqtbJBXiOX1LYV/wAMXK/+0g9BcrP1PK7k5FpJjPk/KXdnR6f8IYNlKuu6LhwTeF83Nc93XdeFkUEUi02azwwRwNxwwujXabNLerjGcarFia3pvPmmNec3rllhrkxvrvcv6SE80Q6PAdzh8Rkxb383luMf7Gfs4vKNvsyF43xnSnqpvFf6sXpMtyN4kxFe2UOx2K878t1qs8UmdE5cc1uFtQNrWaxrnM4yDv8AChYPg9o+iiLObFSMdtoUNLnyTmrE2nm9DViq+eendIbjp0T4SF5wzyz36G4mmtszs8v3hmSvC1JLRSYzrpBIndFqxbnDscvXh742v5Vkq22/3wtfyrOsSN5R3dejsO2273xtfyrCtt4e+Ns+VZ1wmNzsV6Od2y3t+yNsa78zK8ns+fMl29TrRNnOGKCjmROKlamHmWZOuhvHfl/xE1nzU9dWsYZ2joy5kAEuKAABQnQEGA0ihBLYEAACmdLlzpUUqdLhmQRdFDEqpnW5mXdrsFl+SR2wCN45OrzMu1/3fZfkkTzNu33vsvySOyBuneerIsCWOxSpVq5DY5Eptw1cECVdJknK8jsMHilhwR0u1d1D5zIz1OhiJ09Xl9dafEW83FytZ+wy/FOSGFQqkKSW4iQW4iI5KkzMgAJQAADxh9kRz4jwqv0Fo/8A1nlWI9UfZDnXFGGF+rz/AOA8sNZyYbaclKDJAZPppsaHXIJgv4pk+SbFNc7Gb3BMGfFUnyTYxDQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAePPsh7++WFIdW1mP52ewzx79kOX3zwo/zJi+dkSyrzh5S1IhE6kEjWsuaydVQeE7+tlvsvVUHhLjTOzTl5reD0hPDTdFDgvGfFZbJFOghUTUSVH22a6xNp2httMVjeXPwCq3UWV3xaHokS+EjmxaewSuE3eGyNHiqO9fue7no6NFhqdu2XjNtVmciOXBDDtk01pOmXMFJpXaVLPki9t4KEEsG9oSAAIYQYQEkPRUku+DLJZrdiq7rHa5fJJE2coY4a0qia1m1oiGN7RSs2n7LOmtVHUnNu/OejJmT7Bijjh5jZoY4l0+Pd3zheTzBj03NF+8R+k7H0PUbb+TjfXtP0l53m9A6HsrActwZMMI7vM6L6aM13Hk5wVyOKPmRMqloVpj9Jue5bssMvDN0WSTLjgk2azOCXBt3mW2b42WNLw/LpcsWuqaziGLV4+zTm6DTCWfOmXnmZZetj8dk8y7I821j8dnX7yHK7Er9k5VMO2nXW2vihMl1lkwZZ4LNdFolS01Dyy4s7rqRe9Zx8nuW+XSxeiEgUFDFsEGhoAAlEIlZ2Y25Jjm68x+vze68yITKZrXLE3uvMRt1unyfP7tvmX1XT7dzX4hXUmuYo28O6ht4euNTb5KhUp20O6Nst0k8lVQQnUkJDjtPUs7uHxHIcdqzWWd3DII5w1jI6RL7lFZRZ3DyCW3ElzqOSsPXIwelYnli9zC/O9y/pITzOuhW8elctMcMGS6/G2qcjl/SQnmKC1Wbar1+DQei4V7P+XjePTHif8OwZrkMdMqF394n/AEcRgitVm7PAZvkImy48ql3qGZC1yCevDyOIu5/at8OXpJjv6fMPRcOgkhZqrtknkn0aQAioQPQESAAAAldoy3J1/ea3Ipf8RiOgyzJy3S8+6l/xGVVLXezP+GXghV3GTn3GS4e4CaPcFO0yTeECoo9xjPuMG8JZAo9weBkG4B4GM+4wbgFHuMZ9ULZJvABn3GKPcY2TuyjA/S7Vvw+cyMxvA9eR2rN+ND5zJD1Oh/j1eX138iwAC2qAAAAADxb9kN9tWGH+rz/4Dy0z1R9kQhfqkwrFqcm0KviHld03VwhtpyQRFxZyqnbXCUzMyztLNnzhl9n002M6pkEwZ8VSfJNimutjO65BMGfFMnyTYoaAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADx99kP6vwpvR+c9gnjz7Ih7J4U7mZxsiWVebynCudRJCzIk1rLlsvVMvwlxLfZeqIPCXBGnL6lvB6Q6V/5rrj7uHjO8jo4g9i4+7h4yMXrhlm9ErAOElEM6zkDQQQYQawwiWBFRpIJQAIMICS94CdMZ3U/1mDjLIXvAntxur4TBxm3B7kNWf2rfD0xP6dN75FxlCKpnTZnfIuNkJH0KvKHzmebjtL2tmmxJ51BFxG58O3HZ7Rhu7J7nzIYo7Om0l22abnJOzzO4i4jfWFqepS6Pg3nZy+J3tXsbS6PDqxa1t3W9T9nX/qZnB/McwJOb7pj4P5l5YOZ3l+rp93Xo6l2WGCwWeOTBNimKKPbVaO2AY+c82URtySgCGQkYARKALfDJQkGoHn5FLdd1FNIOwy+AkFWdHgmd5pH/CxGrzxG0XlK2lOlS+A5ZUMuKJ1lS+A4Tms/RMxvo9Pt6IZ11eff1z/y5eRyewy+Ahy5NX6zBwFTGei3yt4TB+MN/is35S6FrhhgnxKFJLcRxHNbuqot5HCfPtXERnvEdX0HRTNsFZnoIOkScLSiheZpogqKyzs6Dum68y5nWfxEFdN1/kFnX7CO+BuntW6rTeGHbht1imWO23NYrVZ5tFHKmS04YknXRTdRZ/tZZOf8DXFT4LB6DLWDZTNkpG1Z2acmKmSd7xuxOHJnk6X/AELcX7rB6Dq33gnBlz3XOvC68L3TYLXKpyOdJkQwxQ1dNKRm0Oks2NPa1aF+dB5SMu/yzExNjFpsVclZiv3hgepbxDJoQ0V4eqQCaEkm4AAgAGoCdRzWS1WuxuZypaY5O3pttrrpoOAIndFqxaNph31fF7r+853C/SRzYvf3zn8L9J0iBvLX3OP8Yd/mze+q87R8/pHNi+GvZS0Lwv0nRrmCG8nc4/xh3ea98e+lo8Z+kc1r313paPGfpOkBudzj/GHcd63t76Wjxn6SOa17e+lp8Z+k6jIG53OP8Yd1Xvey/vO0+M/STzYvj3ztHjM6JKHaO5x9Idt3vfDTretpp3T9JufJUpdvwdIm2qFT5imRQuONVbzI0ab0yPe0mR3yLiR1OE/uyzv0cD9R0rTTVmsbebKHYLE9NllP9lDmfYfyST4qOyD0PYr0eK7durjkSJMhNSZUEtPSoVQ5ADKI2YzO4AAAAAAADEcoeTfCOPlZfVPdcFsdlryJvM4a0rq7SMNj2NeSKJtvDcKruRL0G4ABp6Xsa8kUDqsOJ78afmOVbHLJInX1Mynvteg24APDWUrLPjrJdji8cCYRtdistyXRM5BY5M6yqY4JabSW2qtwx7+lPld0q87pp8Xr0li2WkCgy+Yh7cyF/PEaqIba1iYbxeymyvPRel0r/wDr16RFspcrqhq71uvNn6gS85pApj6B7xJ2YfUvI1f9vxTksw5iG9HA7db7DBPnuCHaw7Z6aLUZaa72NHuCYL+KpXEbEDUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB4++yIQ/duFIu1GuM9gnj/7Ig/uvCi7vzkSmvN5QheZElMOhFRrWnLZH90QeHiLii1y5suRFyaZXaw7iK+bNjbzQTuBek13pa07xCxiyUrG0yuSzHSxB7FTH+fDxnHzYsdOhncCOteV5We1WKKTLU3bNrokqaRjxXi0TsnJmxzWYiVsQoQSjpuYVJIYQQayWNYYEMgEpAAhQASXzAOfGd1L9Zh4yxl8wD7crq+EwcZsw+5X5as/tW+HpabmnzV+ki4wRN6dN77FxsI+hV5Q+dTzJnSZncs3zhX2q3Q/1b+JmhZvSJncs3zhP2pXP8G/iZyuK8qfLo8N9VlyYoAct1UayaEayQgZBLZDJIkJSIJQShkohhMEjAAQeg5bO+eiOIrkNKKJswvHlLKvN2BpKdut1DbJ5qleay3xMOpbuqYt5HAdm2wTIrQ3LlRRQ0WdHA5c/sEz5j55rNNmnPeYrPPo+haLU4YwUibRy6qRmKlJtD0SJnzBybR2CZ8xV8Ln/AAn/AIW/FYPzj/lCaJqhyG0L+wmfMFJtL/sJnzDwuf8ACf8Ag8Vg/OP+VIZMcubLh20yW4V2yk1Xpak7WjZnS9ckb0nchqWfGftftC/Ol+Ui8It2JLJPt1zTrNZoVFMicLSeujIhtxzteJlr1POHQurw3fv5LK8Yepu/fyOX45jES706jF+ULSN4uvqav5vqOX45aYatOqo02uAmYTXJS/pndUCGCGaQAACCOpeV5WW73LhtG39cq1te0IiZnyRMxEby7ecFo9Ud2blo8Vekh4juzctHir0mXYt0Y97TqvCJSLTY7+u+02yTZZfJlHNjUELihVM5uJZJ7VTPesNe5N+LR5svnWFTU8S02mmIyW23a0pupg2Y8lFrf96QeIQsk9r99YF+wbfpup/FW+u6H8/+pazpUh03TZjyT2z32g8QLJNa6573g+TQ+m6n8T67ofz/AOpaySdSTZjyS2rVe0PyaKHkmt6XO3rKe/B/IfTdT+JHHdD+f/Utb6FU3pke9pUnvsXEjD3knvXVeVn8MP8AI2Pgq5YrguGVd0c1TY4YnFFElmbdPQdDhuky4ck2vG0bONx3iWm1WCKYrbzuvQAO08oAAAAAAAAAAAAAAAA+b2y5z5fL/puwccRqjUkbU2WVXl9xHXVMh4KxGqqPNo4SG6vJUhF0LJUL3FwkRwtQRVWrdJS+mWxoz5BMGfFUriNimu9jPmyB4L+KpXEbEDQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB4++yH9W4U/b857BPH32Q/2QwovzZnnIllXm8ow9CiSF0JJgsuK19SzM+rzluXgLjbOpI/BxluLGLk0ZOZwE6tJBJua0eEIlhAAADcAZFQIJRBKAl6CkqZAEovmAfbldXwiHjLGXvAXtyur4TDxmzD64adR7Vvh6WmdOnd8i42EJvTpvfIuMg+h15Q+dfcm9ImdyzfGE3/VK5/g38TNDzekx9y+I3xhP2pXR8H/iZyeK8qfLo8N9VlzIYFTluqBMIMkGGwACJZAAZiaEIkhMooKEjOShBOjMRrJIlMFe0wyGgIhJXtsPPrYA7MI3Sm1+MxV9cyANoCr65isXXMEDaBFpTdnzuuc62s7FpfrHhOsfPv1H5az/AA99+nP4n+U1JVGUlUJwod3Yoq5yaLUCSd0bJkJOZCnump4VRxZ/x4uNm2JbpNRqeD8bu4uNieTocO8rWVAnSQRDqgAIkStBjuNF67YXRdDH5jIamO40i9dsK/Nj8xsxepqz+iVhdSlt9sqiKHoLig7dyU5t2GJ16fDxnt48Q3Hnvmx9/h4z28dbhvps8xx/3KfAADpPPgAAAAAAAAAAAAAAAAAAAAAAAAAA1fjbINk3xjiOfiC/bpmT7dPpySKGYknTtU7ZZ/6MOSCteYEz5Reg3QANMf0Y8kH+H4/lF6Cr+jNkh2u1WHol21Gq8RuUAW/DdzXfh64bFcl1SeQ2GxSlJkS+thWhFwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB49+yH+yWFO5mcbPYR4++yH9X4V7mPjZEsq83lFLMSFoBrWXFbOpY95cZblpLnOh5JLcurhrrocHKKf9s+A347xWPNrvSZnydQHc5RXZnwFE+yqVJij5JWlNRsjJWWE45dYELQSbGsBD0CECSESQgFCUQ2EBJGZEspAqL5gH25XV8Ih4yxai/YA9uV1/CIeM2YPcr8tOo9q3w9KzunTe+RcZSiubnnTe7i4yhH0SvKHzr7kxpSY+5fEb4wn7ULnemtnflM0PMTcuOFfjQtG0bhx5huw4eu6w2idaeTSJO1jUECaTq3unL4pjteKdmN/Ne0GStLT2p2ZyDEfti4XeiZbPkl6Sfth4X1zbX8mvSczucv4y6fiMX5Qy1BmJ/bFwtqm2v5NekfbEwv2a1fJr0jusn4yjxGP8mV1JMT+2HhenTrW/wDTXpI+2PhZNc/bPkl6Se5y/jJ4jH1Za98UMeuTGtxXzekm7bDFaXPmqKKHby0lzqq9faMizZzC0WrO1o2bK3raN4kIqS9BBDPmKpIQTIlBrGsCoSEEuhAhAASiQIoSCEoAYJQ47V0inbOudqdBySXtNttc+kodkhr1T/sR4rjnDdTqNV28dd42ex4HxLT6fTdjJbad3Au2SjmVlh/KX4qKorPCpe3hnOKm6qHHvwfWY6za1PKHZpxjSXtFa285cQIQOa6SqHo0ang0Rd3Fxs2vLzzId81TD+N3yLjZM8nQ4f6rJqCaEEQ6gAQ9BAkxzGb9esXcx+YyJGOY0Xr9i7mPzGzF6mrP6JWNsoZJDZcUIdu5XS97G/00HGe3jxBdNealk79Bxo9vnW4b6bPMcf8Acp8AAOk8+AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHjz7Ih7I4U7mPjZ7DPHn2Q9rmphSF9ZMfzsiWVebynqQ1jSkSa1lC6JHIiiHO0VhMBw27NZJm+uM5jgvDqSZ4OMyrzhNuS2tkE6gXVIqExQAKgaRQCSEhoCAl6CKZgyQGovmAHTGV1fCYeMsZfMAe3O6l+sw8Zswe5X5adR7Vvh6Xm9Om98i4yCZnTpvfIuNkH0OOT51PMRKbWsgIyiUSrTe6TV7rKUxUlCur3YhtnuspAgVVe7ERVvWyKioIZFk1ifq8uxfmTvo2bjTzPfNN5NPb7dvcTvo2bjWupwOJfyP8Ozw/2p+UhEElGHQMwTIJJDNUZgAAAABAA3SNZFBoIEh6AGEQgIAbJiBkTc0iPwElM7pEfg4ynxH+Lf4W+H/wAqny4NRGsLQD5a+nq5WeZDvmqPxo++RcbNryemwmp4eimd3FxsmeTocO9dleogAxdUDAApMdxpXk9h7mPzGRGPYz6fYq9bH5jZi9TXn9uVhZD0FTKWW3Pdy5FW97Gv00HGe3DxFcbpfFkf6aDjPbp1+G+mzzHH/cp8AAOk8+AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHjr7If7M4Tf6OZxs9injf7IhF9/cJQbsqY/nZEsq83lhaESQgma1lMOlFZRDpRWGUB17w6kj8HGdg4Lw6kj8HGZV5wW5Sti0EkAuqSahkEoAiakMJASRnJATsjWSAEBfsnicWNrpSTbdphzLfLCZTkjTeUu4Etdsg4zPFO14lqzRvjmHoqbDHDNnJypqfJYv7N7r7RSq9ZM+Ti9BsmdMmK02hV0T5iXjMpU2LdXAe5rqZmseTwU6bznza5b3YZnycXoI2z7HO+Ri9BsaOONwOlK03DN7mghdz2SKKXLbigbbcKetmrNr5xbeXNsx6Ptztu0GovzJvyUXoDjh62b8lF6D0K5Mp6ZMjwy0OQyEukWf5NGn6rb8W76dH5PPXJIdyb8jF6BySDcm/JReg9C8ikv+ws/wAmiOQSewWf5JE/VbfifTo/J565JBuTfko/QVqJU6Cd8jF6D0HyGT2Gz/JIlS5ehSpCXalofVbfgj6d/bTuTOjx7dz2scKUE2rigcKXOPW0bijjghii9cl6evRj+UeknB1smS4IZcxRQKGOWtrEqxLWjUPJJ6o3a7U2v0rNcYba605N9tvJl3saOOxtu37ySX2SX46HJIOyS/HRoPbzvyq0/LMbeb+VWr5aIz+mW/JH1GPxb920HXy/HRO3g7JL8dGgdvO/K7X8tETyWfTqu1fLREfTLfkn6jH4t+qOX2SX46CigirtY4HTTSJM0Dt59eqrW9316Iy3AEUx2S2KKfOi9cVNtG3Q15OH2pXtdpnj1vbnbZtGq3Vwiq66HhMUcUXXx+MyVE6dFHR/nM0eHnqsd9/TK96hNC33BV3e6tukbzt1LgaJjadm6s7xuBhhEJ2AwBJ90UBLIJSETc8iLwcYJWZ7ho1OHvsVse/Nt0+Xuctcm3J1H4eAitN3gO+pkTWrgI20W4n4Dycfpa35vV/6or+DpyonyWHM+A1SomnGopc2vJIv7OLdfaNxqZEqNNJ7wUepS5XiIf6Wvtt21jT/AKvrhmZ7vn/bTu2fYpz/ANKL0FS2z/sZ3hlxeg3A5jWhQ+KcNumxcpz+hopb/FMMn6ZtSs27fJcx/rXt3ivdc/7akTTSa0Mk47Lns8FdzTunI9J5X77PeRO8RIY3jPptirXoY9W8ZJQtOIlV2ZujooqfMdHhOinXauuCJ23cvjevjh+hvqJjfb7MVe9FwMobXb4GXtN6/nI8EHAe6/0RaP8A9v8A0+dx/wDkCk//AKf+1tul/faxqFNtzoKZu2j3CePLlX34sjpBmnQ/i9s9hlTUcHnhcxSbb7+bCeNxxf8AfFez2fIABXQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHjf7IhDW/8JRbkmZ5TPZB45+yH+zOE+9TONkSyrzeVUAtAMFlUuiRWUZk6t0RO3g7JBwkTCYVHBeHUcfg4zlUyDr4PGRw26KCKyRpRwt1WZPtmVIneC0+S3INBE6y6pqSQyAJWkkhDOEwkEaydYQAeGhFYeuRAlGV5IM2U24PhkHGYpVbqMryPU+2dcFYlTlyDjM6+qGGX0S9m2nqu1L9PM8plCRyWuitlqba6fH5TONHscfph4qecqnmhe8zOLnVbnsfe3xswZ9C95mdXN7D2OnY3xsq6z/1WNPzl2kSQxUpreyWQSQyQAAGNZUH/Uq1d8leWjUeaiXaNt5Umlgm1Z6euyvLRqFxQrM4ks26dnhkf7c/Lj6+f9yPhX4BUpUcPXLhDiXXQ8J0dlGVVSUzj28PXQ8JKa3VwjYcmoyzAS+5rZ3xGIqKHroeEy/J/wA9Z7ZRp8+tGcr6qNqLGn9bJtWcJZw0FU5zoL5h/NYY8347LhUt+H89ij7tlyZz7z+6VzHP7YRqIRLzDWYwy3B4AM4TBQihICEAMEgiSExUjYNYAJTuHDbaqwWl/omcxx22H7gtK18iZX1Ps2+Jb9L556fMNRWXqaXvHJU47PRWeXvHItGrhPk8z5y+8Vj9sDeYtOIP/T7z8xdYtGmhab/fPWda8/mPQ/pXz4pj/wAvN/rDy4Pl/wALbmDIJPtMvgG7tXTFS87K/wBLDxnsU8c3U/vlZs1aTYeNHsY8j+pI/wB2k/09RwCf9u/yAA829AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHjr7If7MYT73M42exTx39kPX33wm/0czjZEsq83lT8VBBEmCy4rX1NFUtySzZi42vqaItyLGHk05eaaLcDSqCKm1qSRUlBkiNIJI1gStAAAhkrdA1AX7J1YbJeWPrku+8JXJbJaLXDBNgrTbJ1zZj3BeGRHJSrZNghwjBSCNrqmYq8ER4nyVe6Xh74dB5z6NXj7I2nvsXGb9Njre87qGtyWpEdmWs3kPyUv/pJfvc36xzXZkZyaXdeNnvCw4Z5DabPMUyXHy3NdIk6r8Yz9Eovxp8fRz5z5J+62TcP3NMmRzIrFEoo4nE6To9LdXrKfU9cy0WOL5aP0l2Iob4mY+7R2I6LX6n7oaf3JF8tF6S5SJUuRZ4JElbWXAqQqtaIroKDznnKYrEIoCRQbskIlgBigEkMncdW9busV62KOxW+VyazxNOKHbNVadVnRaHgjCzee6v/ADR+kyFaQyYtaOUsZpW07zDHvUThdf3Svlo/SPUXhf3pXy0fpMhDRPbv+U/8se6p0Y96icLe9K+Wj9JHqIwt71v5eP0mRAdu/wCU/wDJ3VOkMe9RWFlD7FV/1o/SY3jCRZ8MT7JJuKB2OG0qKKam9vWlKaamxdRr3K1mvC6+4j4kWNJa1s0Rad4aNTStcczWNlgiv29tds/8cPoEN93q83Ln/jh9BbK5yUdruqdHK7durNMLXzebu+Otqr64/wASH0F0d7Xk31SvEXoMbwp7HzO+MvGs5+TFTtT5L2K1uzHm70N63ht4E7QmnHCnzi3TKjCIeig75Dxozjc3ijqKxWY2W8MzO+5qIJoGaG9BBIY3IQiaEIMlIwAADDQRCARKGOCKXGm4YoaNLcJFCJiJjaUxMxO8LDDg7DSlqFXfNS1fdMz0kwYQw3D/AHdMe/aZnpL48wqU/pul/CF/6trv/ln/AJWf1K4dSf3tjf8A3EfpNe5V7ssN2XpdUuwSIpMM2XMiiTjcVWtru75ttM1plr9lbk3eQTuOAucP0eDFqaTSsRKnxDiGqzae1cmSZj5YIAD1jyyuROjkTpc6U0pkESihbVVVGfR5YMXt1hdkhXc/yNeA0Z9Jh1ExOSu+zdh1WbBExjttu2F9uHGG7YvF/kFlixfrdi8X+Rr16Clmj6Vo/wD44bvqer/OWxXlixfqdiX7P8jPci+N75xVed5We9IpMSkS5cUClw0pXbV1do8+rQbY2NNfVHfHeJX8Rz+K8P02LS2vSkRMf/yv8M12oyamtb3mYlvoAHi3rwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADx59kPT5pYUa62YvnZ7DNaZbcjtx5VVYOa9426xR2FvkcVm2lXWunbJ7oTE7Tu+baqloJ06j2r/Q7wfSjxZiHgk/UI/oc4Q/xdiJeCT9Qw7Ld3sdHia2ZrNFm3OMty7R6u2QOxxw5k/yV3jiW7r/AL2tdossUukFoUvaxKKOGGnOwrdPKK3H4Dfi8o2YWt2p3SRQkG5hIAAgI1kkawJpuCufSgjKckeHrFizKTcuHLxmTYLJbbRyOY5dNslR6KhEztG8sWB6gnZBMCKZEobffqVadFK+qcayBYFem87+W9FK+qXfp+bbfZQ+p4OrRWSiFxZTcOqmm3QcTPo1eGa32nX67FVp9s85YVyKYLufEt13lYrdfcdos9phjgUyKXtW+3SE9GWp7a2Tot2ZE6eEzwYL4sn74VtTqaZ4iaOGjJJSzBlxVQAAxkJRFSdROyfsUIABAGAwjyRpJoQiakkoYDATAkAqhBABQADXuV1NW264t2GPiRsIseKsNWbEEVnc+12mzuz12vItrnrvp7ht0+SMeWLTyadRSb45rDUtSqHwme/a5sHvtePBB9Un7XVhWi9rx3+c+qdT6hi/tzfBZVnwnTlCZ3x6y76HultvqXKwhPk2CQrRbVaYYpjimOFOGlNym6dD1TPQ7BMX7aIrE5f315Sy7cY/225shbSig75Dm8KM4hrRPNoNTPE6rC+Z03NEn0az0L4spMFF947RmzZpsPpK2o02W0xtDfh1OOu+8s/rvcJD8HCYF9sqX7xWn5WD0h5S5eq4rR8rB6Sv4TN+Lf4rD1Z7QgxDD2OFfF+We7OY86z8mUVJjmQulE3qfaMv0mm9LY7dm0bS248lckb1CGSDFs3hFSakUzk0JENgUFAgFQAkAAQI1tlq9kbkf6GctHbgNkMx7GOFbNiWfZJs+3WmyuzQxQw8iUOfbU3U9w2YLxjy1vPKGrPSb45rDTmsh7zNjPJdYG89/wB5reUv6pT9qy7q58QXtwS/qnY+o4f7crwWVrqu7mBsmDJbdbrS/L1bo2qqXTR3JrbaqCOOGriUuNwpvS6G7BqseeZiv2acunvijexqKSQWmjZCNt7GiD7+3xFq5DKVfGNSmY5KsZSMHXlbbRabDOtUFolwwrkcSTW1ru75zuK4r5dLalI3lf4Zkpi1Nb3naHqAGoFl2ut/9O3gv9WD0kvLpdmrD14fKwHjPpWs/wDjl6/6npPzht4GucE5VrFia/pd0S7mtdkjmQuJRzJkDWam5vmxirn0+TBbs5I2lZw58eavaxzvAADS2gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA03sz0nsecQ/6H00B84EqH0g2Zi//AB6xF/ofTQHzfNlEwAUBtAAMkQ2EiRUINRsDY35suGFn+ueZmv8AUbB2Nyrlxwv8K8zEc2GT0S9YzemRb5C3xG6xvfJWg9nX0w8XPOXaux/fSx17MuI2FPdbRN7t8Zry7PZKyd9RsGd06Z3TKGq9yPhb0/pISCUsxBXWENk1IYJEgIBACcxAgAwGSC0EUCJCZRrDAQQZwiSBuJBCZNe0BFASQwJzjUQNREjXeV7NfN2PdkR/wmFtmZ5X399bp7ciZ/CYW2d7QexVw9X7sobIqTXtEaS5srA8BDFe0SMgydNrG13/ALfkRG3a1NQZPX/Xa7t6PyYjbyzLOcHiHv8A+Idjh/tqiGQ2Gylsu7JqCklDYTUEMliE7IYAZIAAIACAJAAFUt88+5i4meeJi9en9/jXznoeX0X7L4meeZ1VaLStatEfGdHhfu2+Ic3iPor8uNgkg7TlBCJFCJDQE66x2iNYSzTIs6ZRrvo9MLXzo9PHmDItmyjXdvRcaPT54r9Qfyo+Iex4D/Gn5AAcJ2gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAau2VNyXpiLIfft03NZJlrts5SuRyZcLcUVJsDdEu0meEpeRPKhFBX1H29b8D9B9PgTE7D5fx5Fsp0Lo8H3l4JUT8xYsY4CxfhGxyLZiK47Vd8ifG4Jcc2BpNqmbR2z6unlf7IvBtsE4Yi22aG3Tc27zsBlF53S8SAcYNxIACSBGxdjVA48uOGFCqvlnR4Ga6RszYuumXfC7/WvMRyYZI/bL1lFdd51f3utGnrWOZd6Uz3dP8VmdOZHE3WOLTulSii66LhPSRqcm0cnlfDxuwuw3db5dts0cdinQwwzE3E4XRGbTM82J6nEyFE9bb8INd7zed5bKY4pGyUyADFmMEVzkkEhFSakPdJTBUZwKkmyUQyUGEIQYoGEgWkAISCESQlFCQAgIekmooSIIZLCAwfKfdN53lbrsmXfYo7TDKlzIZjhfQ12tOIxF4axGn7DT/AbnVVr+cNvrnTfZaxa3Jir2axCpl0dMlu1MtM+prEPvNaP+eAeprEXvNP8A+eA3LV9dFwk5+ui4TZ9Ry9Ia/p+Pq0u8N4i95Z/D/Ih4cxElXmHaH/zeN0Z+ui4RV06KPhH1LN0gjh+PrLVGFbvvO5sR2S9b2u+ZYrFIUXJJ0x0hhqml87RsKDElwRQp82LHTvi9J08pC2+CrdDE21WDS6155GpVLgUKW0g8VE48U6yZyXnaWFsnhZ7FY3huaLEmH0/Zmx/KL0nLZL8ua12mCzWa9LLOnR12sEMabfzmleRwN9BB4qLzgOCWsa3Y1BCn64lRfmE5dBWlJtFuSaa682iNm4X28wD174OdDogAJTulIMhghAACQAAAAAVS3SKvafEaHn3Nf0VttbhuO8IoXaY3C1Iio03m1G9idtGtEUSfaZuwZ74LTav3aM+nrmiIn7NC8w7/AH/cN4/IReghXHf9fYG8fkIvQb728a/tIuEbeZ2SLhLP1PN0hV+nY+stDcwr/wDeG8fkIvQcFssNvsUMEVusNpssMbpC5stwpvwnoBxzOyRcJgWWlxRXLdbiicS5ada+A2YuIZb5K1mI82GXRUpSbRPJrQNBrOxoOu5rLsjUyXKyiXfFNmQwQ51WJ0Vc2Y9N8uWT8pk+OjxrStKOJNfjQxNNPfRUnH2e1fvMfpOJxHg86zL3kW28nY0HFo0mPsTXfzeyHbbGtNqk+OiOXrF+VyPHR43e3f8AbWn94j9JHP16daf3iP0lH/TU/wDyf9f/ANr3+oo/+P8A7ez5U2XNh20qOGOHdhdUVGrdjhtnhO1txxxfdLXPRxRUzvdZtI87qcPcZbY999nf0+bvsVcm224ADQ3AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB5b+yKe0TDnw6ZxQnqQ8sfZFvaRhn4dN8mAmOY8RgChYhMiDIiiUPRNLPulPJIOuSJQr1mydjI9rl2wt8LXEzWijgr0cJsbY0RL7euFXDEnS2KtN5kSwvP7Ze8oU/nK6EJZypaTuxyh58RIJqShBDJIEICpFJKEpAAyCQUA16SQYWcEBCSGBQkAKACUGRUaSNjZIeghioBaCRTMRoCeaXoIJZBImoZCJIECg1kjclAFAELBlF9pdv/Y8uE1NqNr5SGocE2+JtJLaVdfz4TU6jlU6ZDwnW4b6J+XL1vrhKLzgXPjW7F31/7GWbbQUzRw8Jd8Axy3jq7YVHC3tZtEn+Yy3qfat8KuL3Ibgel77JIqvnI2yPOxMO+qBG2W6KoyQkEVQI3EgAkAQxVVoNxIIqRtluoCoEVW6hXe4QJAIzgGzBss7+8N2fCvQZwYLlmq7juxJN/dWZrwG3T+9T5aNT7VvhrV6SCtwtvOmiNrvnpnn91JNBR5nSlSV2wICzMlkaydkN+7G72n2r4XHxs2kas2Nj/qha1TRa4uNm0z5zxP8Al5Pl9A4d/Fx/AACiugAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB5a+yKQt4Fw29y3TPJhPUpjmPMD4XxzYZFhxRdcF4SJEbmSoIo4odrFmz861uIQPlCk9BO1etH0kj2N2RuJtvB8ur3LVO+uUPY1ZGq1WEYV/wB3O+ubO2nd4t2LVmkWrLhckm1SYJ0rnm4JkNU861HtWdcdwTG64fuvS9Mg5rsyHZNcI25YhuC4eU7fZYG5cxT5kVPBFE1qO3TOdDQ0rk3m0OXrrWi0bStCw5h6tfU9dNe8fzOeyXHcdltMu1Wa5LBItEt1lzZcqkUL3UXGiBf7jH0UO8v1EqEoEmxiABhCGwgESlOYKgIQQq1pGO22/wC1SLxtFngssmKGXEkm9OhdsyEwu81997Z3xcSNuGlb22loz3mseS4eqO167HI/54QsRWvMuVJGn/mss9CUs6Lfh8fRWnNfqyy5LdMt9kmTp0qCCKGY4ed8B3tRZ8Kql2ze/PiRd1oKF6xW0xC7jmZrEykVAIZlRQCuYAkShUECWQkAxuAZFQSbJpmIaoTUaQIRIDIAB6CBsmUkZxUJhDjtdns9ss0dntcmCfJj6KXHoZbnhrD3vLZOB+kuxDJ845SiaxPNa4cPYfX9y2TgfpLdiW77vui5Z953Xd9nstslUUubCnWGro9e4ZKtJY8ev+qVs/Z8omu82iJn7teSsRWZiGBeqzEVFS8no60peLMS6r0a/ZLP+Kt5FJ3/AA2H8YcbvsnVefVbiX30i8Un1WYl99YvFLKB4bD+MHfZOq8vFWJXT76xr9k7+HsSYgtF/wB3WW0XlFNkzrQoJkLWlGMIuWFvbVdHwuHzmvPp8UY7TFYZ4st5vHm3E9dN0B698HC+ztoZjWIL+t933rFZZEmzuUoIYqxwtvP4TJXoMIxj7PzO8wcRu09K3yRWzRqLTWm8Ob1V3pTPIsfiv0kLFd5/k9j8V+kseYUOhGmxdFPv8nVffVZen5PY/FfpJWLLx12ax+K/SWGgoPC4uiPEZOrIPVZeFOpLJwP0lLxZeP5JY+B+ksDBPhMXQ7/J1X71WXj+SWPxX6THcfXvPvi7bLJtMiTLUqdWFy6p6u2cngLVibNY5HbmmeLTYq3iYhry5rzSYmVgcMOtVCgg1QglHSc9XJlSopNpiigrFBBWF11nEjtWfpNr70/MdRMR9yfslhgGQ2fkax3cWFLktdiveOfBMjn8kh5HJijTTruIzlZZsFv+2tv7pM9B54rm1reKX4eE42fgemz5JyWmd5//AN0dfBxnUYaRSsRtD0TFlnwTCm3Pt1FppY5noM7ua8bLe12SLxsUUUVnnwKOBxQuF0faZ46ib2kdG67V8R6myTNxZP7qbdfWkjg8X4Zh0dK2xzPn1dvhXEcurvat4jyZUADgu2AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADoYh9hbX3p8RglDO8Rewlr71FxGCajrcO9MuVxD1QkAHSc8JIJEgAEyBDJQAEAAkE9G+YZeua97Z3a8lGZrSt8w69l9+LYvz1xI36b1q+p9MOsidDW6FmJ85fUpZBhb2Nmqv9s+JF3W4YtddstFms8UuTFCoXHXOqna5qW3r5filDJitNpmF3HliKxC/gsPNS2dfB4o5qW3r4PFMe5uz76q/Zt0FhV6W3r4PFJ5p23r4PFHc2O+qv2YFh5qW7skHijmpbuyQeKO5ud9VfgWHmpbuvg8UK9Lb18HijuLo76q/eALeLDzTttejl+Ickm9bRDF66oI4dxKhE4bp76q9kbxa+bK/Jv8AcQ76aVeVX4/8jHur9E97WF1Jqcdnj5NZ5c6m128KdNwr1mDZHmmnbIoSGBAQoToJSMgl6CAgLHlA9p1ufbg8pF8Ra8VWG0Xph+03fZXAp03auHbOizOpMTtaJlhkjesw0+ugh3kQZMsC4j2qVLHmVOnILAuI/wBT+WR3fF4fycfw+X8WM6gZBb8G35YrDPtto5V5FIgcce1m1aSMfWeFNPSbceWmT0Tu1XpanqjYWkueF2lie6X+tQectqO5cc+VZr9u60WiYpcqVPhjjjehJDNG+O0GOdrw3REqRPfBYY8Y4Zcb++8lN9tekn1YYZ995HCvSeejHfpLuxkp1Xx6DCMY+2CZ3qDiZeosY4ZUNXe8im+vSWq8ZEd/Wx3nc7l2qyRwwwQzFFmqtJtwRNMkTbyac1ovXavmsYLo7hvf8lg8f+QWH73/ACaDx/5HQ77H1U+7t0WsF0eH72p1PL8csMy8rBLjigjtcqGKGLaxJxaGZ0vW/plhaJrzduhDR1Fel2/l9n8dDmndv5fZ/HRs2lj2o6u2WjFXUdn776Duc07tp1dI8dFtxDa7LabNIgs9olzIlMbe1daGVIntQwvMTWVnJQJRbVHPZc8q1d6fmOqdyxL1q195fmOnqIj7k8oACGZIhJDDZBKVMzoI+5Z6lyQ+57dfezyzM6CJdpnqbJA65Pbrf6Pznmv1J7VPl6L9Pe5f4ZaADx71YAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOhiL2EtfeouIwRaEZ3iH2EtfenxGCLQjrcO9NnK4h64SBQHRc8CZLIJSnTrIQWknWEbgAMRGsEsgyBGH3r7L2p/nLiRmC0rfMPvXPe9q7tcSLGm9avqfS4KIAlaS8pOSzdC985jis3QvfOU1TzbI5AAJSEkAnYSt4mhA1kB4BWgekgCqoqikEiW9whvM94E0zeAiRkt3Ot3yO9riOY4Lt9j5HcI5zm/eV+nKEsgZ6AJSg9AQeYjcQ9AJQRIgatzcQAEDRnaJZDI2HQxNT1MXqnp5Vj0bzNNy1zkO8bjxT7Wb1S12WZxM07AvW4d46nDeVnM13ODQRvlRGs6ighpdbC/AKQ16GHxQCDZLhho6wqmvMbLycZsJSYUklyaYs2jSjWiZszJ1nwnK7/M40UOIeiPlb0UfvlkNAhnQozlOqKlXvPiNCWxfd1t51V5ZmcZvyHT4HxM0La+rrU/1iN/OdHhnuW+HO4j6auvtYdxcA2kO4uAqB2nKUqFU0LgJSSbaSTZIIE5iUUoqWkDs2Lpdr7y/MdTUduxdJtb/QvzHVpmIjnKfsghkkMyQgAAUx9BF3L4j1Jke9zy6+4fGeXI+gi3meo8j/ALnt2dw+M81+pPap8vRfp73L/DLgAePerAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA6V8W+C7rLyaOBx1aSSO6WDG/sZL74uNG3DWL5IrLXmtNKTaHDFimjzWR+FlPqpj/I14xjiJR2PBYejkeMzdV8vDEEVqsc2zcrKHbw0b2xY0iFoVWypG7HhpijarVky2yTvYIZLINkNcACJJQhaSSGEwJADYBkCoAmHPEl2zAr6vSySr8tsmOGdtoJiWaFU6Fdsz1aYd81RiJt4mvNU/tV5KLWjr2skxKprLbVhcObFjX4s5/sr0k82LG9EM+vcL0liT3CqHiOn3cKHblld2WiVaZEUyUo0lFTnkdpFrww62Gbo6a+JF0qVbRtaVik71MwAoGSCUKBASKENipAllJNSAHhKJ0+TJhhinTFLUToqlb0VpVlsxIk7JJzVpG/MZVjedmNp2jd3OXbH+VS+ERW6xJOtqlrfZjLIfa07pu7mGrvZbAsN/XLLscmCO8rPDFDAk02czxHcK/vazcLNbsoaKs6CJ8926NXaI22bK9UuH0/Zaz03y5y44JsmCbKjUcEcKiha0NM1FGkpMxUzOFs2nci+8t30/JoeJFbUYO528+axgzzkmYmHdWvfDZAK+yyABIkCWGQAIegkAdDEUmfPuG8JFnlxTZ0yzxwwQLTE2jV0OHcR7VJXHa8y603AKvdZuw6i+Hfs/dXzaeuWYmWoFhvEmu47UvARNw7f8qCKOZdFoghhVW2syRuBN5+efCcFu2zsVoW2fSmb44hl/ppnRUiN2koM6UTTVfmKimzqkmHT4WVHZid4cyeaG6Gw8nlsskjDMqXaLXJlR8mje1iio6NmvddToWyXKjtD20tPnITTn0/fxFd9meLNOGe1s3m7wsH5fZvHHNCwU6vs3jmhXZ5HYZfAQ7PI7DBwFX6X/8AZZ+oz+LffNC7lV8v2d5nmUfaNHWpwxWu0NOqc6J13c51OQSexQLwHJCqKiVEtFNBZ0uk7iZnffdW1Gp76IjbZIALqrIACQJRBKIkdqxZ5NrX6J+Y6zqdqwdKtj/RPzHUrVGMc5ZfYSIazkkMyYoZBUUkJRM6XFvM9SZIFTJ7dne3xnluLoIu5Z6kyQOuT67O9vjPOfqT2qfL0P6e9y/wy0AHj3qwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAALBjf2Old8XGi/lhxt7Gy++LjRv03u1+WnUe1ZigD0g9C4AStBFUGyBJDJQAgkMEiHpFM4YW6Ewkh6SUUWqfIssiO0WiYpcqBViia0EboVAtSxHcbVVeEt7nOxegmHEVyU9kIfFi9Bl2bdGHeV6rrBnjhXbNVYkVMUXn31eSjYMOIrk2yfL0GnrYvQa9vyZBaL+t1pkxbeXMmJwtdyi5oqzGSd4VNZaJrGzpQ6SqF5yGFpZ1PuoMgwx1DN76+JF2Wo6WC7vtVsuydOkxQKBT2ue3kX3mPbEnz0nhZz8mWkXmN13HS01jyW+goXDmRbdblcLDui27srhZh31OrPu7dFvILhzItu7K4WOZFtXYuFjvqdTu7dFvBcOZFt/Q8LHMi21/suFjvadTu7dFvBcOZFs/RcLHMi2fouFjvadTu7OgWvEuaxye79BkfMi2auRcLLbiS47ztFkkw2aQpsSjq9rFTc3TKmakWjeWN8duzyYmC6rDd/N57A/HXpKnhq/dVh/3L0lrxGL8oVu7v0WZlOY715XZeF3wQx22zOTDG9qm3U6Guptrat43iWExNeaJz9Zmdyzaty+wt3/BYOJGqJ7blRKmdwuiNi3Vf9yyrosUqdeUqXMlyIYYoWoszSXaKOvrMxXaFrSWiLTuvoSLU8SYfrTmtJ8WL0B4lw/77yPFi9Bz+zbov95XquwoW2x39c9stUFls14S5s6PoYVC8+vcLln0sjzjylNbRPIoRrADKSgoFpJ1kbCKAkhkoDhtnUc/vTOY47RDFHZ5sECrFFA0luj7otyaPk9JRUy7SsL4jhghhd0TnTTSKH0lSwviH3qm+ND6T0EajFEeqHE7q8zyWc6NqzWmLuYTJ/UtiLSrqmeND6TH77slpsN6x2W1ynKmwyoG4X212jPFmx3ttWWrJitWN5h0wKAstQBDz0UMKpVuiqX6LCd7QxRLklkqnrifoMLZK08pkrSbclhBe/Ute+qOyU7qL0BYWvjrrI/2n6CO/p1Z9zfosgL36lr43bJ40XoI9S18ddZPGfoI7+nU7m/RZQi9epa+N2yeNF6CfUve6/JPHi9A76nVHc36OhYOk2zvR1aZi9R3Nb7tsFrtNrcjkbl0W0bbLMTS0W3mEWrNY2lSGAZsENFJmWAsBXji6y2i0WS0WaTBIjUL5K3V1ruJ7hk6yJ33XPeV3034/QUMvFNLivNL284X8XDNTlpF618palmdLi3meo8j6aye3Yn1j4zWU7Ilf7hal3ldudUzxR/VNyYNumZceG7Hdc2OCOZIlqGKKDQ32jgcc12DU46xitvtLu8G0WfT3tOSNt4XcAHmnoQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAALDjX2Ml98h40X4sWNfYyDvkPGjfpvdr8tOo9qzE2AwehhwAAAStAZGokAACJEPSCWQSJRbsU+1+2dyuMuFS3YodcP2zuVxivqhjf0y1+nWCHuVxEZ91kQ9BDubVEndccedquc6c3NMi0HcOpO6ZETHNjZxjWSF0SRmxZ1k09r9qSb6qi4oTJtG6Yxk09g7Uv1p8UJlCOFm92zs4PbhFFuBJbhIZrbkOm4EluAIIKZ9Ap2iQBFES0twACNqqkpLcQAEbVE07bABMMWylVd22JVfTzCKUM3yk+x1i7+jCHnOrofacvVR+9S1XtbxS4Vnqkyspekuqylww1rtVwEbVbi4CpgIXPByXquu6iSdYtX5rNoulXQ1dg9f1uu7fi8lm0X0TOPrvd3/p09FH7ENAlkFVckRKIJqADQr2iKhAyCohgKvPnrXOQ290kgbAm6rO9Jp/KhWHHltz/ANjK4mbhRp/Kl7fbZ25EriZc4fH+/Hwpa/2mNV7ZGoInUd9xkfjQP89cZtO0U5PG911ZqyL8Tulxm0rR06LwFLVc4W9L93HRMmiC0AqLaGCSGiYQjwBU3AESjzW7FftbtTWbQYOZtiv2t2rfRhTRc03plS1PqUkEsgtNDeexr9hL079D/EbaNS7Gz2FvTv0H8Rto+ecV/mZPl73hn8WnwAA568AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOveNrl2Gxx2qaonBBSqWnO6FoeKbEqfc9oz9pek2UxXv51jdrvlpSdrTsv5Y8aexkPfFxopWKbE/7GevAvSW/EF8We8LLDIlS5qaiTbaRYwYMlclZmqvnz47Y5iLLKRpGlknccYoQSKAQSKAA2QmGAJZADAItuKPYC2dwuMuRaMZuJYVvCKGJqJS8zW+TWN7Qxv6ZYBA+chWuiK1vGOSLVa1IgrPirtVq7RyK12rs8XAeh7qXDjJDIHXt9o6c6OBRxbaJJ11stjtVscL2tpirR6kbQwfZLLacKXbOnWSzTZkcuJxRxyoW29s91FbUZfDxEzG+7dhr307Q1845euZB4yG3ltdHA1vm2Fdt3rTd1j+Qh9BVDYLvSzXbY/kIfQVvqE/isRop6rDk12ruG0uFpp2uJZt6EycokypMiBwSJEqTA3Xay4FCq+A5EUL27VptP3X8dexWINAYZBikpRgioJEoBAg3AASTIAABKWgglEDFspdFdNkibSStEKz6DBIpsuueOBa2qm4J8mTPg5HPkS50Fa0jhUSr4Tru7bu97bJ8jD6C3g1XdV7Oyrm0/eW33an5JL7JDwohRy+vh4UbY5nXf73WP5GH0E8zrv97rH8jD6Df4//AOrT4OerU23g6+HxkSooOyQ8Jtfmfd/vdY/kYfQSrBd/vdY/kYfQR9Q/+qPBT1a4wlEvVVdzhiT56LQ1n51m02m3XavgMdxjLlXfhm122w2azWa0ytryObLkwqKGsSWbNuNmBw4gv2me9Jr/AGUa+7tq7TevlszjJGmjsz5tu0i0KF1IadK0fAajeIb8ebmnN8VFzwffV8WjFFgs0+8Y5kmY49vA4VnpDmIvoslKzaZ5M66ytrRGzZSGsl9E99lJTXNxkEglAmGEGAAAEGoMqSfq6tVF/wCnlcTNwGOYgwXct93lMvG2ctcsRwQwPkc1pUh8Jv02aMOWLyr6nFOXH2Yado9xk0ddDNofa1w7qjt/y0XpJWTXD/X25782L0nU+pYekuf4DI1dTPDm/GXGbStMPr0SzrQQsm+Hsz21tqmnnnRekv8ANuSyRROLbTe1nK+fW48kxs3YdJenNjlGKPc+cyDmFZeum8IVxWTrpvCafEVb+6sx+j3BTeMi5hWTdm8JHMKybs3hHiKI7mzHWhwmQu4rJXopvCRzCsnXTeEnxFDubMOxSv6tWrwGDRLPpNnY6u2RZMH22dLimN1hVIvCayjVGdDRZIvSZhztXWa3jdS9JBLILsSqt6bG32FvTv0H8Rtk0hkHxLcVy3ReMq9Lyk2WZFNhahjrnWfcRshZQMGvRf8AZf8Ad6DwHE8OSdXkmKzz6PdcOy440tIm0curJwY3DjvCMWi/bK+H0GQ2edKtEiCfJjUcuZCooIloaehnOtjvT1Rs6Fb1t6Z3VgAwZAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAtWLEncU9P83ykYTRtvOZviv2Cn/s+UjCTr8O9E/LkcQ9cfB4WSswB0VCIFpJIJQSZyKkkPQBKBCJAhgloihAAAncC04wVcL3h3ouyLZi2GuGLw70TT1QxvP7ZaZlqkuDuVxFREvpcHcriKvAemefjyNRtzAbrgu6+9x+XEakSe4bcwHRYLuvuI/LiOZxP01+V7QeuV5JoAcp1ZSgiAtIQlkEsgQIBJGskSgAgAD1EMCQQsxIACpDCYTUjSGSgFN4h+AkMIR/zQUvwFQINlhx6v6m3hvQeXCaufh4TaeP82Dbw3oPLhNVnV4b6bfLma31wa9fCXfBTpi67adfH5JaC7YMdMXXb3cXklzUe1b4VsXuVbaifPRd0wIuji32DzsT5O4AAyBAAAASEoAJSAJioFCNiEVFc27uADZGwASSIqCQ0ESpZBLICGOZSX/Um3V66Hzmo4szNt5SvaTbe7h85qSZ0R2OGei3y5Ovj98IIYB01BFE6VhTpuhQwV6CHgACSZBDyOPnYVzr1do9aYHp6jrop+RSvIR5LjfOR9y+I9Z4E9pt0fA5XkI8z+pfRj/y9F+no/ff/C9AA8k9SAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAC14r9g5+/D5SML1szTFXsHP34fKRhetnX4f6JcniHrhDoAwdFQAAAQYGsAjp35bI7vua2W6XLhjjkSnFDDFofAdxadJa8Ye1W8+3JfGhEbzEMbztE7MYhx3ee1Tiuqw6Ouj9I9Xd5e9Vh8aP0mKwdBDm1EnX8Hh6OX4jL1ZO8d3nX2KsPjR+kery8/eexePF6TGGR4ET4PD0R4jL1ZSse3lXPdFiX7UXpOay4ktOILTBcNoscizyrbDFDFMlOJxQ0Tear7Rh5eMF+2+7X25nkM1ZtLipSbVjzhljzZLWiJleIcnV2w0h5q3g0syzQegqiyd3c/wC9LwXgg9BmjzxPfBQjUZvylf8ADYujCXk5sDVFfF4rt7WD0GV3Hd8F03PZrslzZk6GzppRxpVdW3q3ztkrdMb3vf1TuzpipSd6xsADUa2yQIhZyUSgABIPQRrJASDWAEBD0kigBoUAAAlEPSQICDQQSkCoJYoaAYCVkx8v6m3j3MHlwmqtSNrY99p149zB5cJqhHU4d6bfLma31whnZuu2x3deci8JcqGbHIbcMETzOqpqOvoKW0tR0ZiLRMSpRMxO8MyeUW3urVx2TPn6OL6xQ8ot4+8dj8eL6xh7ZFd0qeAwR9m/xeXqzWTlBt8yfJlO5rLAps2GW4lHFmq982BEqR7XefzGjpPVVk3eWZfGbzmr12Leh8lHP1uGmG9YpC5o8l8kT2pUrOSEqAqLqGgBQJCSKE1JBEvQQNZEoQwSyKEgAEBJDJI0gClrWVEMIYzlM9ott7uHzmpItJt3KWttga3d3D5zUcSznY4Z6LfLk8Q9cKATQHTc5AoCQKJrpLjdK86+I9V4DvCxeo26dva7PBErJLTTmw5udWbSeV2iqXMnQQbSC0T4YdxTGkjmcT4d42tY7W2zp8O4h4ObT2d93sJW6xPRbLO/9Veknl2xfldn+UR4/htFpWZWy1L/AFovSI7TalBE1bbXmz9Pi9Jx5/TcxG/ef9OvH6hiZ27H/b2Ommqp1TB07ibdyWFttt2aW23r51HcPMTG07PRRO8bgAISAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAALXir2Dnb8PlIwtrOzNMVewc/fh8pGGM6/D/AES5PEPXClgloUOhCggImmYIkRQNHQxBesi5rArZaJUyZC5ilpQdssLx5dyzO7rZ4y9BlTHe/nWN2u2WlfKZZci14uz4WvHccl+Ysix7dzfsfbE9T269B1b6xjYrwum1WKXY7TBHOg2qijeZfMZxgy9qP2y13z4+zPmxNPnYV2hUio7R24csekHPdtljt152ewS44YI58ThhiiVUszfmMj9Qlvh03nZ1/pv0mu+ox452tLZXFe/nWGK6y64Oe1xbd1d2Z5DLo8D273zsvyT9J27lwjbrDfdkt8y3WeOCQ4m4YZbTdYWt0r5tVitjmIltpgyRaJmGYa2SHpb11COVDqBKFASAYDMUIRNACTdDJIekkkkAAAEoNDchAJzkEINQ1E6iCUpWkh6QAiAEAJNZJCJAhoLSSyALLjv2oXgu1D5SNUeg3DiS75l63HabvkzIZUc5JKKJVSpEn5jDFgC86eyVk+TfpL+iz0x1mLyo6rFe9omsMQzkMzD7X95t0V5WTxH6ToX7hK33Tdcy8J1ts8yCW4VtYYHrdN0vRq8O+0SpTgyRHnDHACHvlqWhyWd/dtkX6xBxm9Z3TYt6HiRoeztcu2T4RBxm9pjrNi3oeJHG4l7lfh0+H+m3+ABAoL8oY1EkMJNQQCJORUMmgoEIJACUPSETrIWkISQiQBBBJD0BDHco/tGt/aih85qF9Ebdyl5sCXhvw+c1E3nOxwv0W+XJ4j64+ChDJQOm5yCaAkCkMmhATCkR9Kj3iSIugi3jC/KWdPVD2BcHsFYPg0vyUd06VwewVg+DS/JR3T5jf1S+j19MAAMWQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAteKvYOdvw+UjCwDr8O9EuTr/XHwBgHQhQRqJh0gEjGspPtZh+EwcZr2oB1NB7c/Lmar3EBPdALsqoiWAISuGFH/W+6e/vyIja8WeN77AORrvd/w6Wi9EqaIkAqrSCqgATIAAxkABEpgABAAAlEJ1EADdKUxUAkSADEQyADIAAE7AAIQAAkCGAAFAACpUx/KLT1H2zN+NB5SAMsfrr8w15fRLU22zLeI2wB6VwIVSHS2WSv5TBxm+Y+mRb0PkoA43Evcr8Onw/02QiagFF0ChHhAAneIQBECQASgAASZiN4ACQgAmUEABisOUCVDaMIW2TFE4VFFDnWnWa4Vx2fXaJz8CAOjobTWk7dXP1dYtaN08xLNqnz+BDmHZ3/AOonrwIAu95bqq93Xotd4WeCy22ZZ4IoooYEuei0s4AC3Sd6xKpeNrSEMAyYoDVU94Awt6Zbac4evrh9g7B8Gl+SjugHzG3ql9HrygABikAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH//Z" alt="Saku" style={{ width:40, height:40, borderRadius:8, objectFit:"cover", flexShrink:0 }} />
            <div>
              <a href="https://note.com/saku_konkatsu" target="_blank" rel="noopener noreferrer" style={{ fontSize:13, fontWeight:700, color:"#1E3A5F", textDecoration:"underline", textUnderlineOffset:2 }}>Saku</a>
              <div style={{ fontSize:11, color:"#4A6A8A", marginTop:3, lineHeight:1.6 }}>外資/マーケ職/アラサー/1児の母/迷える妹のためにデータで婚活市場を分析中</div>
            </div>
          </div>
        </div>

        <SL text="STEP 1｜あなた自身について" />
        <div style={card}>
          <div style={{ ...subSt, marginTop:0 }}>あなたの年齢は？</div>
          <div style={{ ...grp, marginBottom:16 }}>
            {MY_AGE_OPTIONS.map(o => <OptionBtn key={o.value} label={o.label} selected={myAge?.value===o.value} onClick={()=>setMyAge(o)} />)}
          </div>
          <div style={subSt}>あなたの年収は？</div>
          <div style={{ ...grp, marginBottom:16 }}>
            {MY_INCOME_OPTIONS.map(o => <OptionBtn key={o.value} label={o.label} selected={myIncome?.value===o.value} onClick={()=>setMyIncome(o)} />)}
          </div>
          <div style={subSt}>あなたの最終学歴は？</div>
          <div style={grp}>
            {MY_EDU_OPTIONS.map(o => <OptionBtn key={o.value} label={o.label} selected={myEdu?.value===o.value} onClick={()=>setMyEdu(o)} />)}
          </div>
        </div>

        <SL text="STEP 2｜理想の結婚相手の条件" />
        <div style={card}>
          <div style={{ ...subSt, marginTop:0 }}>年収の希望は？</div>
          <div style={{ ...grp, marginBottom:16 }}>
            {INCOME_OPTIONS.map(o => <OptionBtn key={o.value} label={o.label} selected={income?.value===o.value} onClick={()=>setIncome(o)} />)}
          </div>
          <div style={subSt}>学歴の希望は？</div>
          <div style={{ ...grp, marginBottom:16 }}>
            {EDU_OPTIONS.map(o => <OptionBtn key={o.value} label={o.label} selected={edu?.value===o.value} onClick={()=>setEdu(o)} />)}
          </div>
          <div style={subSt}>身長の希望は？</div>
          <div style={grp}>
            {HEIGHT_OPTIONS.map(o => <OptionBtn key={o.value} label={o.label} selected={height?.value===o.value} onClick={()=>setHeight(o)} />)}
          </div>
        </div>

        <SL text="STEP 3｜追加条件（※未婚男性は前提として）" />
        <div style={card}>
          {TOGGLES.map((t,i) => (
            <div key={t.id} style={{ borderBottom:i<TOGGLES.length-1?"1px solid #EEF2F7":"none" }}>
              <Toggle label={t.label} sub={t.sub} checked={!!ts[t.id]} onChange={()=>toggle(t.id)} />
            </div>
          ))}
        </div>

        {error && <div style={{ background:"#FFF3F3", border:"1px solid #E05050", borderRadius:8, padding:"12px 16px", marginBottom:16, fontSize:13, color:"#E05050" }}>{error}</div>}

        <button onClick={calculate} style={{ width:"100%", background:"#1E3A5F", color:"#fff", border:"none", borderRadius:12, padding:18, fontSize:16, fontWeight:700, cursor:"pointer", marginBottom:20, letterSpacing:"0.05em", fontFamily:"inherit" }}>
          診断する
        </button>

        {result && (
          <div>
            {/* ① 全男性ベース */}
            <div style={{ background:"#4A6A8A", borderRadius:16, padding:"20px 20px", textAlign:"center", marginBottom:8 }}>
              <div style={{ fontSize:12, color:"#C8DCF0", letterSpacing:"0.05em", marginBottom:8 }}>
                【参考】既婚者も含めた22〜35歳の男性全体で見ると
              </div>
              <div style={{ display:"flex", alignItems:"baseline", justifyContent:"center", gap:4, marginBottom:8 }}>
                <span style={{ fontSize:13, color:"#C8DCF0" }}>この条件に当てはまる男性は</span>
                <span style={{ fontSize:44, fontWeight:700, color:"#fff", lineHeight:1 }}>{result.pctAll}</span>
                <span style={{ fontSize:18, color:"#C9A84C" }}>%</span>
              </div>
              <div style={{ fontSize:11, color:"#A8C4E0", lineHeight:1.6 }}>
                既婚・未婚を含む全男性の参考値です。学歴→年収の相関補正込み。
              </div>
            </div>

            {/* 矢印 */}
            <div style={{ textAlign:"center", fontSize:13, color:"#4A6A8A", marginBottom:8, fontWeight:700 }}>
              ▼ 未婚男性のみの婚活市場に絞ると…
            </div>

            {/* ② 未婚男性ベース（メインヒーロー） */}
            <div style={{ background:"#1E3A5F", borderRadius:16, padding:"28px 20px", textAlign:"center", marginBottom:12 }}>
              <div style={{ fontSize:12, color:"#A8C4E0", letterSpacing:"0.05em", marginBottom:12 }}>{result.popLabel}</div>
              <div style={{ fontSize:13, color:"#A8C4E0", marginBottom:6 }}>条件に当てはまるのは</div>
              <div>
                <span style={{ fontSize:68, fontWeight:700, color:"#fff", lineHeight:1 }}>{result.pct}</span>
                <span style={{ fontSize:22, color:"#C9A84C", marginLeft:2 }}>%</span>
              </div>
              <div style={{ width:"100%", height:6, background:"rgba(255,255,255,0.15)", borderRadius:3, margin:"16px 0 20px", overflow:"hidden" }}>
                <div style={{ height:"100%", borderRadius:3, background:"#C9A84C", width:`${Math.min((result.rate/0.05)*100,100)}%` }} />
              </div>
              <div style={{ background:"rgba(255,255,255,0.1)", borderRadius:12, padding:"14px 16px", display:"inline-block", minWidth:220 }}>
                <div style={{ fontSize:12, color:"#A8C4E0", marginBottom:4 }}>つまり</div>
                <div style={{ fontSize:26, fontWeight:700, color:"#fff" }}>
                  1,000人いたら <span style={{ color:"#C9A84C" }}>{result.per1000}人</span>
                </div>
                <div style={{ fontSize:12, color:"#A8C4E0", marginTop:4 }}>全国に約{result.actualMan}万人</div>
              </div>
            </div>

            {/* ①ギャップ分析（1000人の直下） */}
            <div style={{ background:"#fff", border:"1px solid #D8E4F0", borderRadius:12, padding:20, marginBottom:12 }}>
              <div style={{ fontSize:13, fontWeight:700, color:"#4A6A8A", marginBottom:12, paddingBottom:8, borderBottom:"1px solid #EEF2F7" }}>あなたと理想の男性のバランス分析</div>
              {/* 列ヘッダー */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:4, marginBottom:8 }}>
                <div style={{ fontSize:11, color:"#8AA0B8", textAlign:"center" }}></div>
                <div style={{ fontSize:11, fontWeight:700, color:"#1E3A5F", textAlign:"center", background:"#F0F4F8", borderRadius:6, padding:"4px 0" }}>あなた</div>
                <div style={{ fontSize:11, fontWeight:700, color:"#1E3A5F", textAlign:"center", background:"#F0F4F8", borderRadius:6, padding:"4px 0" }}>理想の相手</div>
              </div>
              {/* 年齢行 */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:4, padding:"8px 0", borderBottom:"1px solid #EEF2F7", alignItems:"center" }}>
                <div style={{ fontSize:12, color:"#4A6A8A" }}>年齢</div>
                <div style={{ fontSize:12, fontWeight:700, color:"#1E3A5F", textAlign:"center" }}>{result.myAgeLabel}</div>
                <div style={{ fontSize:12, color:"#8AA0B8", textAlign:"center" }}>—</div>
              </div>
              {/* 年収行 */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:4, padding:"8px 0", borderBottom:"1px solid #EEF2F7", alignItems:"center" }}>
                <div style={{ fontSize:12, color:"#4A6A8A" }}>年収</div>
                <div style={{ fontSize:12, fontWeight:700, color:"#1E3A5F", textAlign:"center" }}>{result.myIncomeLabel}</div>
                <div style={{ fontSize:12, fontWeight:700, color:"#1E3A5F", textAlign:"center" }}>{result.idealIncomeLabel}</div>
              </div>
              {/* 学歴行 */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:4, padding:"8px 0", borderBottom:"1px solid #EEF2F7", alignItems:"center" }}>
                <div style={{ fontSize:12, color:"#4A6A8A" }}>学歴</div>
                <div style={{ fontSize:12, fontWeight:700, color:"#1E3A5F", textAlign:"center" }}>{result.myEduLabel}</div>
                <div style={{ fontSize:12, fontWeight:700, color:"#1E3A5F", textAlign:"center" }}>{result.idealEduLabel}</div>
              </div>
              {/* 婚姻スタイル行 */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:4, padding:"10px 0 0", alignItems:"center" }}>
                <div style={{ fontSize:12, color:"#4A6A8A" }}>婚姻スタイル</div>
                <div style={{ gridColumn:"2 / 4", fontSize:13, fontWeight:700, color: result.marriageWarn ? "#E05050" : "#1E3A5F", textAlign:"center" }}>{result.marriageType}</div>
              </div>
            </div>

            {/* 診断 */}
            <div style={{ background:VC[result.level].bg, borderLeft:`4px solid ${VC[result.level].bd}`, borderRadius:12, padding:20, marginBottom:12 }}>
              <div style={{ fontSize:15, fontWeight:700, marginBottom:8 }}>{result.title}</div>
              <div style={{ fontSize:13, color:"#3A5A7A", lineHeight:1.75 }}>{result.body}</div>
            </div>

            {/* ②各条件の絞り込みを分母から可視化 */}
            {result.breakdown.length > 0 && (
              <div style={{ background:"#fff", border:"1px solid #D8E4F0", borderRadius:12, padding:20, marginBottom:12 }}>
                <div style={{ fontSize:13, fontWeight:700, color:"#4A6A8A", marginBottom:12, paddingBottom:8, borderBottom:"1px solid #EEF2F7" }}>条件の絞り込みでどれだけ減っているか</div>
                {result.breakdown.map((s, i) => {
                  const barW = Math.max(Math.min(s.rate * 100, 100), 0.3);
                  const pct  = (s.rate * 100).toFixed(2);
                  const man  = Math.max(Math.round(result.pop * s.rate), 1);
                  const isBase  = s.isBase;
                  const isBonus = !isBase && s.coeff > 1.0;
                  const coeffPct = Math.round(s.coeff * 100);
                  const coeffTxt = isBase
                    ? ""
                    : s.coeff > 1.0
                      ? `補正 ×${coeffPct}%`
                      : `×${coeffPct}%`;
                  return (
                    <div key={i} style={{ marginBottom:14 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:4 }}>
                        <span style={{ fontSize:12, color: isBase ? "#1E3A5F" : "#4A6A8A", fontWeight: isBase ? 700 : 400 }}>{s.label}</span>
                        <span style={{ fontSize:11, color: isBonus ? "#2A7A4A" : isBase ? "#1E3A5F" : "#4A6A8A", fontWeight:700 }}>{coeffTxt}</span>
                      </div>
                      {/* バー：分母の幅を100%として率で表示 */}
                      <div style={{ width:"100%", height:12, background:"#EEF2F7", borderRadius:6, overflow:"hidden", position:"relative" }}>
                        <div style={{
                          height:"100%", borderRadius:6,
                          background: isBase ? "#A8C4E0" : isBonus ? "#2A7A4A" : "#1E3A5F",
                          width:`${barW}%`,
                          transition:"width 0.6s ease",
                        }} />
                      </div>
                      <div style={{ display:"flex", justifyContent:"space-between", marginTop:3 }}>
                        <span style={{ fontSize:11, color:"#8AA0B8" }}>
                          {isBase ? `全体` : `→ 約${man}万人`}
                        </span>
                        <span style={{ fontSize:11, color:"#1E3A5F", fontWeight:700 }}>
                          {isBase ? `100%` : `${pct}%`}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div style={{ marginTop:4, paddingTop:10, borderTop:"2px solid #1E3A5F", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontSize:13, color:"#1E3A5F", fontWeight:700 }}>最終結果</span>
                  <span style={{ fontSize:13, fontWeight:700, color:"#1E3A5F" }}>{result.pct}% ＝ 1,000人中{result.per1000}人</span>
                </div>
              </div>
            )}

            <div style={{ background:"#1E3A5F", borderRadius:12, padding:"20px 20px", marginBottom:12 }}>
              <div style={{ fontSize:12, color:"#A8C4E0", marginBottom:12, textAlign:"center", letterSpacing:"0.05em" }}>関連記事</div>
              {[
                { label:"「いい男」を作る、バリキャリ女子の婚活市場開拓戦略", sub:"潜在顧客開拓・先行投資・ブルーオーシャン戦略", url:"https://note.com/saku_konkatsu/n/ne211f5bf97f1", ready:true },
                { label:"妥協せずに適切な理想の見直し方", sub:"この診断結果をどう活かすか", url:null, ready:false },
                { label:"「はぐれハイスペ」の生息地に潜り込む、潜在層開拓戦略", sub:"アプリ外の男性の見つけ方", url:"https://note.com/saku_konkatsu/n/n14fd7aaa6de0", ready:true },
              ].map((a,i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 0", borderBottom:i<2?"1px solid rgba(255,255,255,0.1)":"none" }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, color:"#fff", fontWeight:700, marginBottom:2 }}>{a.label}</div>
                    <div style={{ fontSize:11, color:"#A8C4E0" }}>{a.sub}</div>
                  </div>
                  {a.ready
                    ? <a href={a.url} target="_blank" rel="noopener noreferrer" style={{ flexShrink:0, marginLeft:12, background:"#C9A84C", color:"#1E3A5F", fontSize:11, fontWeight:700, padding:"6px 12px", borderRadius:20, textDecoration:"none" }}>noteを読む</a>
                    : <span style={{ flexShrink:0, marginLeft:12, background:"rgba(255,255,255,0.1)", color:"#A8C4E0", fontSize:11, padding:"6px 12px", borderRadius:20 }}>更新予定</span>
                  }
                </div>
              ))}
            </div>

            <div style={{ background:"#EEF2F7", borderRadius:12, padding:"16px 20px" }}>
              <div style={{ fontSize:12, fontWeight:700, color:"#E05050", marginBottom:6 }}>▼ ご利用上の注意</div>
              <div style={{ fontSize:11, color:"#6A8AA8", lineHeight:1.9, marginBottom:16 }}>
                本チェッカーの数値はあくまで統計学上の理論値です。できるだけ実態に近い数字になるよう補正をかけていますが、実際にその条件の男性が存在することを担保するものではありません。地域・タイミング・個人の状況によって実態は異なります。ご自身の婚活を見直す一つの材料としてご活用ください。
              </div>
              <div style={{ fontSize:12, fontWeight:700, color:"#4A6A8A", marginBottom:6 }}>▼ 実際のソースと計算方法</div>
              <div style={{ fontSize:11, color:"#6A8AA8", lineHeight:1.9 }}>
                複数の統計を組み合わせて試算を行い、統計学上妥当な計算になるよう調整しています。割合×割合の単純な掛け合わせは項目間の相関を無視してしまい実態より低く見えやすいため、相関がある項目には補正値を適用しています。<br />
                （例）正社員比率×年収比率：正社員と年収には正の相関があるため、単純に掛け合わせると実際より低い値になる→補正値で調整<br />
                <br />
                ・分母：総務省「令和2年国勢調査」年齢別未婚率×人口より推計（22〜35歳未婚男性 約610万人）<br />
                ・年収割合：国税庁「民間給与実態統計調査」（令和4年）<br />
                ・学歴割合：文部科学省「学校基本調査」（令和4年）<br />
                ・身長割合：厚生労働省「国民健康・栄養調査」（令和元年）正規分布（平均171.2cm・標準偏差5.8cm）より推計。165cm以上86%・170cm以上58%・175cm以上26%<br />
                ・喫煙率・飲酒率：厚生労働省「国民健康・栄養調査」（令和元年）<br />
                ・【補正①】年収×学歴×年齢（3次元）：OpenWork「出身大学別年収」・厚労省「賃金構造基本統計調査」令和5年より正規分布で近似。学歴が年収に与える因果関係を反映（下限0.25）<br />
                ・【補正②】学歴×都内在住：GMARCHは全校東京立地のため首都圏在住率が高い傾向を反映（×1.27〜2.07）<br />
                ・【補正③】正社員×年収：高年収者ほど正社員率が高い相関を反映。国税庁「民間給与実態統計調査」令和6年より（×1.05〜1.40）<br />
                ・【補正④】バツイチ×年齢：離婚は年代が上がるほど多い傾向を反映。総務省「令和2年国勢調査」配偶関係別人口より（25歳×0.984〜35歳×0.822）<br />
                ・【補正⑤】同年代×都内在住：20〜30代は首都圏集中傾向が強い相関を反映（×2.0）<br />
                ・【補正⑥】正社員×都内在住：都内勤務者の正社員率が高い相関を反映（×1.2）<br />
                ・【補正⑦】身長×年収：田中賢久「身長と体重が賃金に及ぼす影響」（慶應PDR, 2009）より、身長が高いほど年収が高い相関を反映（×1.05〜1.18）<br />
                <br />
                ※概算値です。実際の分布は地域・年齢・タイミングにより異なります。<br />
                【学歴×年収について】GMARCH・関関同立卒の平均年収はOpenWorkデータより27歳約430万円・30歳約560万円・35歳約730万円。この結果に沿って計算を行っております。
              </div>
            </div>
          </div>
        )}
      </div>

      {/* フッター */}
      <div style={{ maxWidth:480, margin:"24px auto 0", padding:"16px 20px", borderTop:"1px solid #D8E4F0", textAlign:"center" }}>
        <div style={{ fontSize:10, color:"#8AA0B8", lineHeight:1.9 }}>
          © 2025 Saku All Rights Reserved.<br />
          本コンテンツの無断転載・複製を禁じます。<br />
          本コンテンツをAI学習目的で使用することを禁止します。
        </div>
      </div>

    </div>
  );
}
