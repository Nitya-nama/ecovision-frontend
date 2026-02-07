(() => {

const API = "https://ecovision-api-hfuu.onrender.com";

/* ================= PARAMETERS ================= */

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
    hdi_full:"Full Human Development Index",
    lex:"Life Expectancy at Birth",
    gdp_per_capita:"GDP Per Capita",
    co2_pcap_cons:"CO2 Per Capita Consumption"
};

const ALGORITHMS = [
    { key:"decision_tree", name:"Decision Tree" },
    { key:"svm", name:"SVM" },
    { key:"polynomial_reg", name:"Polynomial Regression" },
    { key:"random_forest", name:"Random Forest" }
];

/* ================= STATE ================= */

const state = {
    country:null,
    selectedParams:[],
    selectedAlgo:null,
    selectedViz:null,
    chart:null,
    years:[]
};

/* ================= DOM ================= */

const datalist=document.getElementById("country-list");
const countryInput=document.getElementById("country-search");
const paramsContainer=document.getElementById("params-container");
const algoContainer=document.getElementById("algo-container");
const vizContainer=document.getElementById("viz-container");
const analyzeBtn=document.getElementById("analyze-btn");
const resultCanvas=document.getElementById("result-chart");
const metricsDisplay=document.getElementById("metrics-display");

/* ================= API ================= */

async function fetchCountries(){
    const res=await fetch(`${API}/countries`);
    const data=await res.json();
    return data.countries||[];
}

/* ================= RENDER PARAMS ================= */

function renderParams(){
    paramsContainer.innerHTML="";
    PARAMETERS.forEach(param=>{
        const div=document.createElement("div");
        div.className="param";

        const checkbox=document.createElement("input");
        checkbox.type="checkbox";
        checkbox.value=param;

        checkbox.addEventListener("change",()=>{
            if(checkbox.checked) state.selectedParams.push(param);
            else state.selectedParams=state.selectedParams.filter(p=>p!==param);
        });

        const label=document.createElement("label");
        label.innerText=PARAM_LABELS[param];

        div.appendChild(checkbox);
        div.appendChild(label);
        paramsContainer.appendChild(div);
    });
}

/* ================= RENDER ALGOS ================= */

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
        };

        algoContainer.appendChild(card);
    });
}

/* ================= METRICS ================= */

function renderMetrics(metrics){
    metricsDisplay.innerHTML="<h3>Model Performance</h3>";

    for(const param in metrics){
        const m=metrics[param];
        const div=document.createElement("div");
        div.innerHTML=`<b>${param}</b><br>
        R²: ${m.r2.toFixed(3)} |
        MAE: ${m.mae.toFixed(3)} |
        RMSE: ${m.rmse.toFixed(3)}<br><br>`;
        metricsDisplay.appendChild(div);
    }
}

/* ================= ANALYSIS ================= */

async function runAnalysis(){

    if(!state.country||!state.selectedAlgo||!state.selectedParams.length){
        alert("Select country, parameters and algorithm");
        return;
    }

    analyzeBtn.innerText="Analyzing...";
    analyzeBtn.disabled=true;

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

        if(data.metrics) renderMetrics(data.metrics);

    }catch(err){
        alert("Error: "+err.message);
    }

    analyzeBtn.innerText="Analyze";
    analyzeBtn.disabled=false;
}

/* ================= CHART ================= */

async function renderChart(years,predictions){

    if(state.chart) state.chart.destroy();

    const datasets=Object.keys(predictions).map((param,i)=>({
        label:param,
        data:predictions[param],
        borderColor:`hsl(${i*60},70%,50%)`,
        fill:false
    }));

    state.chart=new Chart(resultCanvas,{
        type:"line",
        data:{ labels:years, datasets }
    });
}

/* ================= EXPORTS ================= */

function exportCSV(){
    const qs=state.selectedParams.map(p=>`parameters=${p}`).join("&");
    window.open(`${API}/export/csv?country=${state.country}&${qs}`);
}

function exportPDF(){
    const qs=state.selectedParams.map(p=>`parameters=${p}`).join("&");
    window.open(`${API}/export/pdf?country=${state.country}&${qs}`);
}

/* ================= INIT ================= */

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
        state.country=countryInput.value;
    });

    analyzeBtn.addEventListener("click",runAnalysis);
    document.getElementById("exportCSV").addEventListener("click",exportCSV);
    document.getElementById("exportPDF").addEventListener("click",exportPDF);

})();
})();
