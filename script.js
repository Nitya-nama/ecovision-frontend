(() => {

const API = "https://ecovision-api-hfuu.onrender.com";

/* ---------------- STATE ---------------- */
const state={
    country:null,
    selectedParams:[],
    selectedAlgo:null,
    selectedViz:null,
    chart:null
};

/* ---------------- ELEMENTS ---------------- */
const datalist=document.getElementById("country-list");
const countryInput=document.getElementById("country-search");
const paramsContainer=document.getElementById("params-container");
const algoContainer=document.getElementById("algo-container");
const vizContainer=document.getElementById("viz-container");
const analyzeBtn=document.getElementById("analyze-btn");
const resultCanvas=document.getElementById("result-chart");
const metricsDisplay=document.getElementById("metrics-display");

/* ---------------- PARAMETERS ---------------- */
const PARAMETERS=[
"life_expectancy","hdi_index","co2_consump","gdp","services",
"trade_percent_gdp","pv_est","inflation","service_workers_percent",
"hdi_full","lex","gdp_per_capita","co2_pcap_cons"
];

const ALGORITHMS=[
{key:"decision_tree",name:"Decision Tree"},
{key:"svm",name:"SVM"},
{key:"polynomial_reg",name:"Polynomial Regression"},
{key:"random_forest",name:"Random Forest"}
];

const VIZ={
decision_tree:["Line","Bar","Scatter"],
random_forest:["Line","Bar","Scatter"],
polynomial_reg:["Line","Scatter"],
svm:["Scatter","Line"]
};

/* ---------------- FETCH COUNTRIES ---------------- */
async function loadCountries(){
    const r=await fetch(`${API}/countries`);
    const d=await r.json();
    d.countries.forEach(c=>{
        const o=document.createElement("option");
        o.value=c;
        datalist.appendChild(o);
    });
}

/* ---------------- PARAMS ---------------- */
function renderParams(){
    PARAMETERS.forEach(p=>{
        const div=document.createElement("div");
        const cb=document.createElement("input");
        cb.type="checkbox";
        cb.value=p;
        cb.onchange=()=>{
            if(cb.checked) state.selectedParams.push(p);
            else state.selectedParams=state.selectedParams.filter(x=>x!==p);
        };
        div.append(cb,document.createTextNode(p));
        paramsContainer.appendChild(div);
    });
}

/* ---------------- ALGOS ---------------- */
function renderAlgos(){
    ALGORITHMS.forEach(a=>{
        const d=document.createElement("div");
        d.innerText=a.name;
        d.className="algo-card";
        d.onclick=()=>{
            document.querySelectorAll(".algo-card").forEach(x=>x.classList.remove("selected"));
            d.classList.add("selected");
            state.selectedAlgo=a.key;
            renderViz();
        };
        algoContainer.appendChild(d);
    });
}

/* ---------------- VIZ ---------------- */
function renderViz(){
    vizContainer.innerHTML="";
    if(!state.selectedAlgo) return;
    VIZ[state.selectedAlgo].forEach(v=>{
        const d=document.createElement("div");
        d.innerText=v;
        d.className="viz-option";
        d.onclick=()=>{
            document.querySelectorAll(".viz-option").forEach(x=>x.classList.remove("selected"));
            d.classList.add("selected");
            state.selectedViz=v;
        };
        vizContainer.appendChild(d);
    });
    if(vizContainer.children.length) vizContainer.children[0].click();
}

/* ---------------- CHART ---------------- */
function drawChart(years,preds){
    if(state.chart) state.chart.destroy();
    const key=Object.keys(preds)[0];
    state.chart=new Chart(resultCanvas,{
        type:"line",
        data:{labels:years,datasets:[{label:key,data:preds[key]}]}
    });
}

/* ---------------- METRICS ---------------- */
function showMetrics(m){
    metricsDisplay.innerHTML="<h3>Metrics</h3>";
    Object.entries(m).forEach(([k,v])=>{
        metricsDisplay.innerHTML+=`${k} → R2:${v.r2.toFixed(3)} MAE:${v.mae.toFixed(3)} RMSE:${v.rmse.toFixed(3)}<br>`;
    });
}

/* ---------------- SUMMARY ---------------- */
async function showSummary(country,parameters,years,predictions,chart){
    let box=document.getElementById("chart-summary");
    if(!box){
        box=document.createElement("div");
        box.id="chart-summary";
        document.getElementById("results-area").appendChild(box);
    }
    box.innerHTML="Generating insights...";
    const r=await fetch(`${API}/summary`,{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({country,parameters,years,predictions,chart})
    });
    const d=await r.json();
    box.innerHTML=d.summary||"No summary";
}

/* ---------------- ANALYZE ---------------- */
async function analyze(){

if(!state.country||!state.selectedAlgo||!state.selectedParams.length||!state.selectedViz){
alert("Select all fields");return;
}

analyzeBtn.disabled=true;

const r=await fetch(`${API}/predict`,{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({
country:state.country,
parameters:state.selectedParams,
algorithm:state.selectedAlgo
})
});

const d=await r.json();

drawChart(d.years,d.predictions);
showMetrics(d.metrics);
showSummary(state.country,state.selectedParams,d.years,d.predictions,state.selectedViz);

analyzeBtn.disabled=false;
}

/* ---------------- INIT ---------------- */
countryInput.onchange=()=>state.country=countryInput.value;
analyzeBtn.onclick=analyze;

loadCountries();
renderParams();
renderAlgos();

})();
