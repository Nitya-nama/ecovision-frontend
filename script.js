(() => {

const API = "https://ecovision-backend-8kuf.onrender.com/";

/* ---------------- PARAMETERS ---------------- */

const PARAMETERS = [
"life_expectancy","hdi_index","co2_consump","gdp","services",
"trade_percent_gdp","pv_est","inflation","service_workers_percent",
"hdi_full","lex","gdp_per_capita","co2_pcap_cons"
];

const PARAM_LABELS = {
life_expectancy:"Life Expectancy",
hdi_index:"Human Development Index",
co2_consump:"CO2 Consumption",
gdp:"GDP",
services:"Services (% GDP)",
trade_percent_gdp:"Trade (% GDP)",
pv_est:"Photovoltaic Energy",
inflation:"Inflation Rate",
service_workers_percent:"Service Sector Workers (%)",
hdi_full:"Full HDI",
lex:"Life Expectancy at Birth",
gdp_per_capita:"GDP Per Capita",
co2_pcap_cons:"CO2 Per Capita"
};

const ALGORITHMS = [
{key:"decision_tree",name:"Decision Tree"},
{key:"svm",name:"SVM"},
{key:"polynomial_reg",name:"Polynomial Regression"},
{key:"random_forest",name:"Random Forest"}
];

const VIZ_OPTIONS_MAP = {
decision_tree:["Line Chart","Bar Graph","Scatter Plot"],
random_forest:["Line Chart","Bar Graph","Scatter Plot"],
polynomial_reg:["Line Chart","Scatter Plot"],
svm:["Scatter Plot","Line Chart"]
};

const VIZ_JS_TYPE = {
"Line Chart":"line",
"Bar Graph":"bar",
"Scatter Plot":"scatter"
};

/* ---------------- STATE ---------------- */

const state={
country:null,
selectedParams:[],
selectedAlgo:null,
selectedViz:null,
chart:null,
years:[]
};

/* ---------------- DOM ---------------- */

const datalist=document.getElementById("country-list");
const countryInput=document.getElementById("country-search");
const paramsContainer=document.getElementById("params-container");
const algoContainer=document.getElementById("algo-container");
const vizContainer=document.getElementById("viz-container");
const analyzeBtn=document.getElementById("analyze-btn");
const resultCanvas=document.getElementById("result-chart");
const metricsDisplay=document.getElementById("metrics-display");

const themeToggleBtn=document.getElementById("theme-toggle");
const refreshBtn=document.getElementById("refresh-btn");

/* ---------------- FETCH COUNTRIES ---------------- */

async function fetchCountries(){
const res=await fetch(`${API}/countries`);
const data=await res.json();
return data.countries||[];
}

/* ---------------- PARAM RENDER ---------------- */

function renderParams(){

paramsContainer.innerHTML="";

PARAMETERS.forEach(param=>{

const div=document.createElement("div");
div.className="param";

const cb=document.createElement("input");
cb.type="checkbox";
cb.value=param;

cb.onchange=()=>{
if(cb.checked){
if(!state.selectedParams.includes(param))
state.selectedParams.push(param);
}else{
state.selectedParams=state.selectedParams.filter(p=>p!==param);
}
};

const label=document.createElement("label");
label.innerText=PARAM_LABELS[param];

div.append(cb,label);
paramsContainer.appendChild(div);

});

}

/* ---------------- ALGO RENDER ---------------- */

function renderAlgorithms(){

algoContainer.innerHTML="";

ALGORITHMS.forEach(algo=>{

const card=document.createElement("div");
card.className="algo-card";
card.innerText=algo.name;

card.onclick=()=>{
document.querySelectorAll(".algo-card").forEach(c=>c.classList.remove("selected"));
card.classList.add("selected");
state.selectedAlgo=algo.key;
renderVisualizationOptions();
};

algoContainer.appendChild(card);

});

}

/* ---------------- VIZ RENDER ---------------- */

function renderVisualizationOptions(){

vizContainer.innerHTML="";
if(!state.selectedAlgo) return;

VIZ_OPTIONS_MAP[state.selectedAlgo].forEach(viz=>{

const div=document.createElement("div");
div.className="viz-option";
div.innerText=viz;

div.onclick=()=>{
document.querySelectorAll(".viz-option").forEach(v=>v.classList.remove("selected"));
div.classList.add("selected");
state.selectedViz=viz;
};

vizContainer.appendChild(div);

});

if(vizContainer.children.length)
vizContainer.children[0].click();

}

/* ---------------- METRICS ---------------- */

function renderMetrics(metrics){

metricsDisplay.innerHTML="<h3>Model Performance Metrics</h3>";

for(const param in metrics){

const m=metrics[param];

const div=document.createElement("div");
div.className="metric-card";

div.innerHTML=`
<b>${PARAM_LABELS[param]}</b><br>
R² Score: ${m.r2.toFixed(4)}<br>
MAE: ${m.mae.toFixed(4)}<br>
RMSE: ${m.rmse.toFixed(4)}<br><br>
`;

metricsDisplay.appendChild(div);

}

}

/* ---------------- CHART ---------------- */

function renderChart(years,predictions){

if(state.chart) state.chart.destroy();

const type=VIZ_JS_TYPE[state.selectedViz];

const datasets=Object.keys(predictions).map((param,i)=>({
label:PARAM_LABELS[param],
data:type==="scatter"
? years.map((y,idx)=>({x:y,y:predictions[param][idx]}))
: predictions[param],
borderColor:`hsl(${i*60},70%,50%)`,
backgroundColor:`hsl(${i*60},70%,60%)`,
fill:false
}));

state.chart=new Chart(resultCanvas,{
type:type,
data:{
labels:type==="scatter"?undefined:years,
datasets
},
options:{responsive:true}
});

}

/* ---------------- CLAUDE API FALLBACK SUMMARY ---------------- */

async function generateClaudeSummary(country, parameters, years, predictions, chartType) {
  const preview = years.slice(0, 6).join(", ");
  const lines = parameters.map(p => {
    const vals = (predictions[p] || []).slice(0, 6).map(v => Math.round(v * 100) / 100).join(", ");
    return `${PARAM_LABELS[p] || p}: ${vals}`;
  });

  const prompt = `You are an economic data analyst. Based on the following ML-predicted data for ${country}, provide exactly 3 short insights and 3 actionable suggestions. Be concise and data-driven.

Country: ${country}
Chart Type: ${chartType}
Years (first 6): ${preview}
Predicted Data:
${lines.join("\n")}

Format your response with clear sections:
**Insights:**
1. ...
2. ...
3. ...

**Suggestions:**
1. ...
2. ...
3. ...`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [
        { role: "user", content: prompt }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.content?.find(b => b.type === "text")?.text;
  if (!text) throw new Error("No text in Claude response");
  return text;
}

/* ---------------- SUMMARY (with Claude fallback) ---------------- */

async function addSummary(country, parameters, years, predictions, chartType) {

  let box = document.getElementById("chart-summary");

  if (!box) {
    box = document.createElement("div");
    box.id = "chart-summary";
    document.getElementById("results-area").appendChild(box);
  }

  box.innerHTML = "⏳ Generating AI insights...";

  // 1. Try the backend (Gemini)
  try {
    const res = await fetch(`${API}/summary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ country, parameters, years, predictions, chart: chartType })
    });

    const data = await res.json();
    const text = data.summary || data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (text && text !== "AI summary unavailable") {
      box.innerHTML = formatSummary(text);
      return;
    }
    // If backend returned "AI summary unavailable", fall through to Claude
    throw new Error("Backend summary unavailable");

  } catch (backendErr) {
    console.warn("Backend summary failed, trying Claude fallback:", backendErr.message);
    box.innerHTML = "⏳ Switching to Claude for insights...";
  }

  // 2. Fallback: Claude API
  try {
    const text = await generateClaudeSummary(country, parameters, years, predictions, chartType);
    box.innerHTML = formatSummary(text);
  } catch (claudeErr) {
    console.error("Claude fallback also failed:", claudeErr.message);
    box.innerHTML = generateLocalSummary(country, parameters, years, predictions);
  }
}

/* ---------------- FORMAT SUMMARY (markdown-lite) ---------------- */

function formatSummary(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br>");
}

/* ---------------- LOCAL FALLBACK SUMMARY (no API) ---------------- */

function generateLocalSummary(country, parameters, years, predictions) {
  const firstYear = years[0];
  const lastYear = years[years.length - 1];
  const insights = [];
  const suggestions = [];

  parameters.forEach(param => {
    const vals = predictions[param] || [];
    if (vals.length < 2) return;
    const first = vals[0];
    const last = vals[vals.length - 1];
    const changePct = (((last - first) / Math.abs(first)) * 100).toFixed(1);
    const label = PARAM_LABELS[param] || param;
    const trend = changePct > 0 ? "increased" : "decreased";
    insights.push(`${label} <strong>${trend} by ${Math.abs(changePct)}%</strong> from ${firstYear} to ${lastYear}.`);
  });

  if (parameters.includes("gdp") || parameters.includes("gdp_per_capita")) {
    suggestions.push("Consider diversifying economic sectors to sustain GDP growth.");
  }
  if (parameters.includes("co2_consump") || parameters.includes("co2_pcap_cons")) {
    suggestions.push("Invest in renewable energy to reduce CO₂ emissions.");
  }
  if (parameters.includes("hdi_index") || parameters.includes("hdi_full")) {
    suggestions.push("Strengthen education and healthcare to improve the Human Development Index.");
  }
  if (suggestions.length === 0) {
    suggestions.push("Leverage data-driven policies to optimize the analyzed parameters.");
    suggestions.push("Monitor year-over-year changes to respond to economic shifts proactively.");
    suggestions.push("Engage international partnerships to benchmark against global standards.");
  }

  return `
    <strong>📊 AI Insights for ${country}</strong><br><br>
    <strong>Insights:</strong><br>
    ${insights.slice(0, 3).map((i, n) => `${n + 1}. ${i}`).join("<br>")}<br><br>
    <strong>Suggestions:</strong><br>
    ${suggestions.slice(0, 3).map((s, n) => `${n + 1}. ${s}`).join("<br>")}
  `;
}

/* ---------------- EXPORT CSV ---------------- */

function exportCSV(){

if(!state.country||!state.selectedParams.length){
alert("Select country and parameters first");
return;
}

const qs=state.selectedParams.map(p=>`parameters=${encodeURIComponent(p)}`).join("&");

window.open(`${API}/export/csv?country=${encodeURIComponent(state.country)}&${qs}`);

}

/* ---------------- EXPORT PDF ---------------- */

function exportPDF(){

if(!state.country||!state.selectedParams.length){
alert("Select country and parameters first");
return;
}

const qs=state.selectedParams.map(p=>`parameters=${encodeURIComponent(p)}`).join("&");

window.open(`${API}/export/pdf?country=${encodeURIComponent(state.country)}&${qs}`);

}

/* ---------------- EXPORT PNG ---------------- */

function exportPNG(){

if(!state.country||!state.selectedParams.length){
alert("Select country and parameter first");
return;
}

window.open(`${API}/export/png?country=${encodeURIComponent(state.country)}&parameter=${encodeURIComponent(state.selectedParams[0])}`);

}

/* ---------------- THEME TOGGLE ---------------- */

if(themeToggleBtn){

const savedTheme=localStorage.getItem("theme");

if(savedTheme==="light"){
document.documentElement.classList.add("light");
themeToggleBtn.innerHTML="🌙 Dark";
}

themeToggleBtn.addEventListener("click",()=>{

const html=document.documentElement;
const isLight=html.classList.toggle("light");

if(isLight){
themeToggleBtn.innerHTML="🌙 Dark";
localStorage.setItem("theme","light");
}else{
themeToggleBtn.innerHTML="🌞 Light";
localStorage.setItem("theme","dark");
}

});

}

/* ---------------- REFRESH BUTTON ---------------- */

if(refreshBtn){
refreshBtn.addEventListener("click",()=>{
if(confirm("Reset dashboard?")){
localStorage.removeItem("theme");
location.reload();
}
});
}

/* ---------------- ANALYSIS ---------------- */

async function runAnalysis(){

if(!state.country||!state.selectedAlgo||!state.selectedParams.length||!state.selectedViz){
alert("Please select country, parameters, algorithm and visualization");
return;
}

analyzeBtn.innerText="Analyzing...";
analyzeBtn.disabled=true;
metricsDisplay.innerHTML="";

try{

const res=await fetch(`${API}/predict`,{
method:"POST",
headers:{ "Content-Type":"application/json" },
body:JSON.stringify({
country:state.country,
parameters:state.selectedParams,
algorithm:state.selectedAlgo
})
});

const data=await res.json();
if(!res.ok) throw new Error(data.error);

renderChart(data.years,data.predictions);
renderMetrics(data.metrics);
addSummary(state.country,state.selectedParams,data.years,data.predictions,state.selectedViz);

}catch(err){

alert(err.message);

}

analyzeBtn.innerText="Analyze";
analyzeBtn.disabled=false;

}

/* ---------------- INIT ---------------- */

(async function init(){

const countries=await fetchCountries();

countries.forEach(c=>{
const opt=document.createElement("option");
opt.value=c;
datalist.appendChild(opt);
});

renderParams();
renderAlgorithms();

countryInput.addEventListener("change",()=>{
state.country=countryInput.value.trim();
});

analyzeBtn.addEventListener("click",runAnalysis);

document.getElementById("exportCSV").addEventListener("click",exportCSV);
document.getElementById("exportPDF").addEventListener("click",exportPDF);
document.getElementById("exportPNG").addEventListener("click",exportPNG);

})();

})();
