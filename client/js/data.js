function seed(){
 return {
  people:JSON.parse(JSON.stringify(BASE_PEOPLE)),
  payrolls:JSON.parse(JSON.stringify(BASE_PAYROLLS)),
  payments:[
   {id:"TRF-2026-07-001",type:"Transfer",desc:"Amara Okafor · July salary",amount:175000,date:"27 Jul 2026",status:"Settled"},
   {id:"TRF-2026-07-002",type:"Transfer",desc:"Daniel Efe · July salary",amount:175000,date:"27 Jul 2026",status:"Settled"},
   {id:"FND-2026-07-001",type:"Funding",desc:"July payroll funding",amount:23940000,date:"25 Jul 2026",status:"Settled"}
  ],
  payslips:[
   {id:"PSL-2026-07-001",person:"Amara Okafor",period:"July 2026",amount:175000,date:"27 Jul 2026",status:"Available"},
   {id:"PSL-2026-07-002",person:"Daniel Efe",period:"July 2026",amount:175000,date:"27 Jul 2026",status:"Available"}
  ],
  activity:[
   {date:"24 Aug 2026 · 09:33",event:"Payroll prepared",record:"PR-2026-08-001",actor:"Scheduler",type:"Payroll"},
   {date:"23 Aug 2026 · 17:45",event:"Bank account verified",record:"EMP-00014 · Amara Okafor",actor:"System",type:"Bank account"}
  ],
  settings:{payday:"27th of each month",autoPrepare:"Enabled",approval:"Required",notify:"WhatsApp + SMS fallback",org:"The24thGroup",country:"Nigeria",reauth:"Enabled"},
  currentPerson:"EMP-00014"
 };
}
let state=JSON.parse(localStorage.getItem("ighoDemoState")||"null")||seed();
function save(){localStorage.setItem("ighoDemoState",JSON.stringify(state))}
function money(v){return new Intl.NumberFormat("en-NG",{style:"currency",currency:"NGN",maximumFractionDigits:0}).format(v)}
function cls(label){const s=(label||"").toLowerCase();if(["settled","verified","active","approved","funded","available","ready"].some(x=>s.includes(x)))return"ready";if(s.includes("processing"))return"processing";if(s.includes("failed"))return"failed";if(["pending","not funded","action required","draft"].some(x=>s.includes(x)))return"attention";return"neutral"}
function status(label){return `<span class="status ${cls(label)}">${String(label).toUpperCase()}</span>`}
function currentRun(){return state.payrolls.find(p=>p.id==="PR-2026-08-001")}
function includedPeople(){return state.people.filter(p=>p.included&&p.status==="Active")}
function readyPeople(){return includedPeople().filter(p=>p.bankStatus==="Verified")}
function issues(){return includedPeople().filter(p=>p.bankStatus!=="Verified")}
function calcRunTotal(){return includedPeople().reduce((s,p)=>s+p.pay,0)}
function log(event,record,actor="Johannes Oghoro",type="System"){
 state.activity.unshift({date:new Date().toLocaleString("en-GB",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}).replace(","," ·"),event,record,actor,type});
 save();
}
function toast(title,text){document.getElementById("toastTitle").textContent=title;document.getElementById("toastText").textContent=text;const t=document.getElementById("toast");t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2400)}
function goPage(id){document.querySelectorAll(".page").forEach(p=>p.classList.toggle("active",p.id===id));document.querySelectorAll(".nav-item").forEach(n=>n.classList.toggle("active",n.dataset.page===id));document.getElementById("breadcrumb").textContent="The24thGroup / "+(id==="payrollrun"?"August 2026 Payroll":id==="employee"?"Employee portal preview":id[0].toUpperCase()+id.slice(1));document.getElementById("sidebar").classList.remove("open");document.getElementById("main").scrollTo({top:0,behavior:"smooth"});render()}
document.querySelectorAll(".nav-item").forEach(n=>n.onclick=()=>goPage(n.dataset.page));
document.getElementById("menuBtn").onclick=()=>document.getElementById("sidebar").classList.toggle("open");
function openModal(id){document.getElementById(id).classList.add("open")}
function closeModal(id){document.getElementById(id).classList.remove("open")}
document.querySelectorAll(".modal-wrap").forEach(m=>m.onclick=e=>{if(e.target===m)m.classList.remove("open")});
