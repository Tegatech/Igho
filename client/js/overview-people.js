function renderOverview(){
 const run=currentRun(), total=calcRunTotal(), r=readyPeople().length, all=includedPeople().length, issueList=issues();
 document.getElementById("overviewSubtitle").textContent=`The24thGroup · scheduled for ${run.date}`;
 document.getElementById("overviewMetrics").innerHTML=`
 <div class="metric"><div class="metric-label">Payroll total</div><div class="metric-value">${money(total)}</div><div class="metric-meta">${all} people · monthly run</div></div>
 <div class="metric"><div class="metric-label">Readiness</div><div class="metric-value">${r} / ${all}</div><div class="metric-meta">${issueList.length} ${issueList.length===1?"person needs":"people need"} attention</div></div>
 <div class="metric"><div class="metric-label">Funding</div><div class="metric-value">${status(run.funding)}</div><div class="metric-meta">${run.funding==="Funded"?"Funding confirmed":"Funding required"}</div></div>
 <div class="metric"><div class="metric-label">Payroll status</div><div class="metric-value">${status(run.status)}</div><div class="metric-meta">${run.approval==="Approved"?"Approved":"Approval required"}</div></div>`;
 const primary=document.getElementById("overviewPrimary");
 if(issueList.length){primary.textContent=`Review ${issueList.length} issue${issueList.length>1?"s":""}`;primary.className="btn primary";primary.onclick=()=>goPage("people")}
 else if(run.funding!=="Funded"){primary.textContent="Fund payroll";primary.className="btn financial";primary.onclick=()=>startFunding()}
 else if(run.approval!=="Approved"){primary.textContent="Approve payroll";primary.className="btn financial";primary.onclick=()=>startApproval()}
 else if(run.status==="Approved"){primary.textContent=`Pay ${all} people · ${money(total)}`;primary.className="btn financial";primary.onclick=()=>processPayroll()}
 else {primary.textContent=run.status==="Settled"?"Payroll complete":"View payment progress";primary.className="btn secondary";primary.onclick=()=>goPage("payrollrun")}
 const stage=issueList.length?0:run.funding!=="Funded"?1:run.approval!=="Approved"?2:run.status==="Settled"?4:3;
 document.getElementById("overviewPayrollCard").innerHTML=`
 <div class="payroll-top"><div><div class="eyebrow">Payroll run</div><div class="payroll-name">The24thGroup — August 2026</div><div class="muted">${all} people · Pay date ${run.date}</div></div><div><div class="eyebrow">Net payroll</div><div class="money">${money(total)}</div><div class="muted">Current included recipients</div></div></div>
 <div class="progress">
  <div class="step ${stage>0?"done":stage===0?"current":""}"><b>01 · READINESS</b><small>${r}/${all} ready</small></div>
  <div class="step ${stage>1?"done":stage===1?"current":""}"><b>02 · FUNDING</b><small>${run.funding}</small></div>
  <div class="step ${stage>2?"done":stage===2?"current":""}"><b>03 · APPROVAL</b><small>${run.approval}</small></div>
  <div class="step ${stage>=4?"done":stage===3?"current":""}"><b>04 · PAYMENT</b><small>${run.status}</small></div>
 </div><div class="actions-row"><button class="btn secondary" onclick="goPage('payrollrun')">Open payroll</button></div>`;
 document.getElementById("attentionCount").textContent=`${issueList.length} item${issueList.length===1?"":"s"}`;
 document.getElementById("attentionList").innerHTML=issueList.length?issueList.map(p=>`<div class="attention-row"><div class="attention-dot"></div><div><strong>${p.name}</strong><small>${p.bankStatus}</small></div><button class="btn ghost" onclick="openPerson('${p.id}')">Review</button></div>`).join(""):`<div class="attention-row"><div class="attention-dot" style="background:var(--green)"></div><div><strong>Payroll ready</strong><small>No recipient issues remain.</small></div></div>`;
}
function peopleFiltered(){
 const q=document.getElementById("peopleSearch")?.value.toLowerCase()||"", st=document.getElementById("peopleStatus")?.value||"", bk=document.getElementById("peopleBank")?.value||"";
 return state.people.filter(p=>(!q||[p.name,p.email,p.role].join(" ").toLowerCase().includes(q))&&(!st||p.status===st)&&(!bk||p.bankStatus===bk));
}
function renderPeople(){
 const list=peopleFiltered(), active=state.people.filter(p=>p.status==="Active").length, verified=state.people.filter(p=>p.bankStatus==="Verified").length;
 document.getElementById("peopleNavCount").textContent=128+(state.people.length-BASE_PEOPLE.length);
 document.getElementById("peopleStats").innerHTML=`<div class="count-pill info"><strong>${128+(state.people.length-BASE_PEOPLE.length)}</strong> total</div><div class="count-pill good"><strong>${active+118}</strong> active</div><div class="count-pill good"><strong>${verified+111}</strong> verified</div><div class="count-pill bad"><strong>${state.people.filter(p=>p.status==="Inactive").length+4}</strong> inactive</div>`;
 document.getElementById("peopleRange").textContent=`Showing ${Math.min(list.length,25)} demo records · ${128+(state.people.length-BASE_PEOPLE.length)} total`;
 const rows=document.getElementById("peopleRows"), mobile=document.getElementById("peopleMobile");rows.innerHTML="";mobile.innerHTML="";
 list.slice(0,25).forEach(p=>{
  const tr=document.createElement("tr");tr.className="clickable";tr.onclick=()=>openPerson(p.id);tr.innerHTML=`<td><input class="checkbox person-check" data-id="${p.id}" type="checkbox" onclick="event.stopPropagation()"></td><td class="person"><strong>${p.name}</strong><small>${p.email}</small></td><td>${p.role}</td><td>${money(p.pay)}</td><td>${status(p.bankStatus)}</td><td>${status(p.included?"Included":"Not included")}</td><td>${p.lastPaid||"—"}</td>`;rows.appendChild(tr);
  const c=document.createElement("div");c.className="mobile-record";c.onclick=()=>openPerson(p.id);c.innerHTML=`<h4>${p.name}</h4><p>${p.role} · ${p.email}</p><div class="mobile-record-grid"><div><span>Pay</span><strong>${money(p.pay)}</strong></div><div><span>Bank</span><strong>${p.bankStatus}</strong></div><div><span>Payroll</span><strong>${p.included?"Included":"Not included"}</strong></div><div><span>Last paid</span><strong>${p.lastPaid||"—"}</strong></div></div>`;mobile.appendChild(c);
 });
 bindChecks();
}
function bindChecks(){document.querySelectorAll(".person-check").forEach(c=>c.onchange=updateBulk)}
function selectedIds(){return [...document.querySelectorAll(".person-check:checked")].map(c=>c.dataset.id)}
function updateBulk(){const n=selectedIds().length;document.getElementById("selectedCount").textContent=`${n} selected`;document.getElementById("peopleBulk").classList.toggle("show",n>0)}
function bulkInclude(){const ids=selectedIds();state.people.forEach(p=>{if(ids.includes(p.id))p.included=true});log("People included in payroll",`${ids.length} people`,"Johannes Oghoro","Employee");save();toast("People included",`${ids.length} selected people added to August payroll.`);render()}
function bulkInactive(){const ids=selectedIds();state.people.forEach(p=>{if(ids.includes(p.id)){p.status="Inactive";p.included=false}});log("People marked inactive",`${ids.length} people`,"Johannes Oghoro","Employee");save();toast("People updated",`${ids.length} selected people marked inactive.`);render()}
