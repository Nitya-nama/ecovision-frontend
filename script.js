(() => {

const API = "https://ecovision-api-hfuu.onrender.com";

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
    { key:"decision_tree", name:"Decision Tree" },
    { key:"svm", name:"SVM" },
    { key:"polynomial_reg", name:"Polynomial Regression" },
    { key:"random_forest", name:"Random Forest" }
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

const state = {
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

/* ---------------- SUMMARY ---------------- */

async function addSummary(country,parameters,years,predictions,chartType){

    let box=document.getElementById("chart-summary");
    if(!box){
        box=document.createElement("div");
        box.id="chart-summary";
        document.getElementById("results-area").appendChild(box);
    }

    box.innerHTML="Generating AI insights...";

    try{
        const res=await fetch(`${API}/summary`,{
            method:"POST",
            headers:{ "Content-Type":"application/json" },
            body:JSON.stringify({country,parameters,years,predictions,chart:chartType})
        });

        const data=await res.json();
        box.innerHTML=data.summary||"No summary available";

    }catch{
        box.innerHTML="AI summary unavailable";
    }
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

})();

})();
