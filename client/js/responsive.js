/* ===== V19 RESPONSIVE INTERACTION HELPERS ===== */
function syncInput(sourceId,targetId,renderFn){
  const source=document.getElementById(sourceId), target=document.getElementById(targetId);
  if(!source||!target)return;
  source.addEventListener("input",()=>{target.value=source.value;renderFn()});
  target.addEventListener("input",()=>{source.value=target.value});
}
function setFilterBadge(buttonId,countId,count,clearId){
  const badge=document.getElementById(countId);
  if(badge){badge.textContent=count||"";badge.classList.toggle("active",count>0)}
  const clear=document.getElementById(clearId);if(clear)clear.style.display=count>0?"inline-flex":"none";
}
function updateFilterBadges(){
  const peopleCount=(document.getElementById("peopleStatus")?.value?1:0)+(document.getElementById("peopleBank")?.value?1:0);setFilterBadge("peopleFilterBtn","peopleFilterCount",peopleCount,"peopleClearFilters");
  const payrollCount=(document.getElementById("payrollStatus")?.value?1:0)+(document.getElementById("payrollSearch")?.value?1:0);setFilterBadge("payrollFilterBtn","payrollFilterCount",payrollCount,"payrollClearFilters");
  const paymentCount=(document.getElementById("paymentType")?.value?1:0)+(document.getElementById("paymentStatus")?.value?1:0);setFilterBadge("paymentFilterBtn","paymentFilterCount",paymentCount,"paymentClearFilters");
  const payslipCount=(document.getElementById("payslipPeriod")?.value?1:0);setFilterBadge("payslipFilterBtn","payslipFilterCount",payslipCount,"payslipClearFilters");
  const activityCount=(document.getElementById("activityType")?.value?1:0)+(document.getElementById("activityActor")?.value?1:0);setFilterBadge("activityFilterBtn","activityFilterCount",activityCount,"activityClearFilters");
}
function clearPeopleFilters(){document.getElementById("peopleStatus").value="";document.getElementById("peopleBank").value="";renderPeople();updateFilterBadges()}
function clearPayrollFilters(){document.getElementById("payrollSearch").value="";document.getElementById("payrollStatus").value="";renderPayroll();updateFilterBadges()}
function clearPaymentFilters(){document.getElementById("paymentType").value="";document.getElementById("paymentStatus").value="";renderPayments();updateFilterBadges()}
function clearPayslipFilters(){document.getElementById("payslipPeriod").value="";renderPayslips();updateFilterBadges()}
function clearActivityFilters(){document.getElementById("activityType").value="";document.getElementById("activityActor").value="";renderActivity();updateFilterBadges()}
function setupSettingsMobileSelector(){
  const nav=document.querySelector(".settings-nav");if(!nav)return;
  nav.addEventListener("click",e=>{if(window.innerWidth>520)return;const link=e.target.closest(".settings-link");if(!link)return;if(!nav.classList.contains("open")&&link.classList.contains("active")){e.preventDefault();nav.classList.add("open");return}nav.classList.remove("open")});
}
syncInput("peopleSearchMobile","peopleSearch",renderPeople);
syncInput("paymentSearchMobile","paymentSearch",renderPayments);
syncInput("payslipSearchMobile","payslipSearch",renderPayslips);
syncInput("activitySearchMobile","activitySearch",renderActivity);
["peopleStatus","peopleBank","payrollStatus","paymentType","paymentStatus","payslipPeriod","activityType","activityActor"].forEach(id=>{const el=document.getElementById(id);if(el)el.addEventListener("change",updateFilterBadges)});
document.getElementById("payrollSearch")?.addEventListener("input",updateFilterBadges);
setupSettingsMobileSelector();updateFilterBadges();
