(function(){
  const SCOPE_VERSION="v1-internal-2026-09";

  function makeV1State(){
    return {
      scopeVersion:SCOPE_VERSION,
      people:[
        {id:"EMP-00001",name:"Amara Okafor",role:"Personal Assistant",email:"amara@the24thgroup.com",pay:175000,startDate:"01 Jun 2026",bank:"GTBank",account:"4821",bankStatus:"Verified",status:"Active",lastPaid:"01 Sep 2026",included:true,adjustments:[]},
        {id:"EMP-00002",name:"Daniel Efe",role:"Operations",email:"daniel@the24thgroup.com",pay:175000,startDate:"01 Jun 2026",bank:"Access Bank",account:"1604",bankStatus:"Verified",status:"Active",lastPaid:"01 Sep 2026",included:true,adjustments:[]},
        {id:"EMP-00003",name:"Chidi Nwosu",role:"Operations Coordinator",email:"chidi@the24thgroup.com",pay:220000,startDate:"01 Sep 2026",bank:"",account:"",bankStatus:"Action required",status:"Active",lastPaid:"—",included:true,adjustments:[]}
      ],
      payrolls:[
        {id:"PR-2026-10-001",period:"October 2026",date:"1 Oct 2026",prepareDate:"24 Sep 2026",cutoffDate:"24 Sep 2026",people:3,net:570000,funding:"Not funded",approval:"Pending",status:"Draft"},
        {id:"PR-2026-09-001",period:"September 2026",date:"1 Sep 2026",prepareDate:"25 Aug 2026",cutoffDate:"25 Aug 2026",people:2,net:350000,funding:"Funded",approval:"Approved",status:"Settled"},
        {id:"PR-2026-08-001",period:"August 2026",date:"1 Aug 2026",prepareDate:"25 Jul 2026",cutoffDate:"25 Jul 2026",people:2,net:350000,funding:"Funded",approval:"Approved",status:"Settled"}
      ],
      payments:[
        {id:"TRF-2026-09-001",type:"Transfer",desc:"Amara Okafor · September salary",amount:175000,date:"1 Sep 2026",status:"Settled"},
        {id:"TRF-2026-09-002",type:"Transfer",desc:"Daniel Efe · September salary",amount:175000,date:"1 Sep 2026",status:"Settled"},
        {id:"FND-2026-09-001",type:"Funding",desc:"September payroll funding",amount:350000,date:"31 Aug 2026",status:"Settled"}
      ],
      payslips:[
        {id:"PSL-2026-09-001",person:"Amara Okafor",employeeId:"EMP-00001",period:"September 2026",base:175000,amount:175000,date:"1 Sep 2026",paymentRef:"TRF-2026-09-001",status:"Available"},
        {id:"PSL-2026-09-002",person:"Daniel Efe",employeeId:"EMP-00002",period:"September 2026",base:175000,amount:175000,date:"1 Sep 2026",paymentRef:"TRF-2026-09-002",status:"Available"}
      ],
      activity:[
        {date:"01 Sep 2026 · 09:18",event:"September payroll settled",record:"PR-2026-09-001",actor:"Paystack",type:"Payment"},
        {date:"25 Aug 2026 · 09:00",event:"September payroll prepared",record:"PR-2026-09-001",actor:"Scheduler",type:"Payroll"},
        {date:"25 Aug 2026 · 09:00",event:"September change cutoff reached",record:"PR-2026-09-001",actor:"Scheduler",type:"Payroll"}
      ],
      settings:{
        payday:"1st of each month",
        prepDays:7,
        cutoffDays:7,
        holidayRule:"Keep configured payday",
        autoPrepare:"Enabled",
        approval:"Required",
        notify:"Email",
        org:"The24thGroup",
        employerAddress:"Nigeria",
        employerEmail:"payroll@the24thgroup.com",
        companyNumber:"",
        country:"Nigeria",
        reauth:"Enabled",
        fundingProvider:"Paystack",
        payoutProvider:"Paystack"
      },
      currentPerson:"EMP-00001"
    };
  }

  if(!state.scopeVersion || state.scopeVersion!==SCOPE_VERSION){
    state=makeV1State();
    save();
  }
  seed=makeV1State;
  currentRun=function(){return state.payrolls.find(p=>p.id==="PR-2026-10-001")||state.payrolls[0]};
  function adjustmentTotal(p){return (p.adjustments||[]).reduce((s,a)=>s+a.amount,0)}
  function employeeNet(p){return p.pay+adjustmentTotal(p)}
  calcRunTotal=function(){return includedPeople().reduce((s,p)=>s+employeeNet(p),0)};

  const style=document.createElement("style");
  style.textContent=`
    .scope-note{margin:0 0 16px;padding:12px 14px;border:1px solid var(--line);background:#fbfaf7;border-radius:var(--radius);font-size:11px;line-height:1.55;color:var(--muted)}
    .scope-note strong{color:var(--navy)}
    .adjustment-list{display:grid;gap:7px;margin-top:10px}.adjustment-item{display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid var(--line);font-size:11px}.adjustment-item:last-child{border-bottom:0}.adjustment-positive{color:var(--green)}.adjustment-negative{color:var(--red)}
    .proof-note{padding:10px 12px;background:var(--paper);border-radius:var(--radius-sm);font-size:10px;line-height:1.5;color:var(--muted);margin-top:14px}
  `;
  document.head.appendChild(style);

  document.querySelector('#overview .page-title').textContent='October payroll';
  document.querySelector('#payrollrun .page-title').textContent='October 2026 Payroll';
  const runTable=document.getElementById('recipientRows')?.closest('table');
  if(runTable){runTable.querySelector('thead tr').innerHTML='<th>Employee</th><th>Bank</th><th>Base pay</th><th>Adjustments</th><th>Net pay</th><th>Readiness</th><th>Transfer</th>'}

  renderOverview=function(){
    const run=currentRun(),total=calcRunTotal(),ready=readyPeople().length,all=includedPeople().length,issueList=issues();
    document.getElementById('overviewSubtitle').textContent=`The24thGroup · pay date ${run.date} · prepared ${run.prepareDate}`;
    document.getElementById('overviewMetrics').innerHTML=`
      <div class="metric"><div class="metric-label">Payroll total</div><div class="metric-value">${money(total)}</div><div class="metric-meta">${all} staff · monthly run</div></div>
      <div class="metric"><div class="metric-label">Readiness</div><div class="metric-value">${ready} / ${all}</div><div class="metric-meta">${issueList.length?issueList.length+' needs attention':'All staff ready'}</div></div>
      <div class="metric"><div class="metric-label">Funding</div><div class="metric-value">${status(run.funding)}</div><div class="metric-meta">Provider: ${state.settings.fundingProvider}</div></div>
      <div class="metric"><div class="metric-label">Pay date</div><div class="metric-value">1 Oct</div><div class="metric-meta">Never auto-shifted for weekends/holidays</div></div>`;
    const primary=document.getElementById('overviewPrimary');
    if(issueList.length){primary.textContent=`Review ${issueList.length} issue`;primary.className='btn primary';primary.onclick=()=>goPage('people')}
    else if(run.funding!=="Funded"){primary.textContent='Fund payroll';primary.className='btn financial';primary.onclick=startFunding}
    else if(run.approval!=="Approved"){primary.textContent='Approve payroll';primary.className='btn financial';primary.onclick=startApproval}
    else if(run.status==='Approved'){primary.textContent=`Pay ${all} people · ${money(total)}`;primary.className='btn financial';primary.onclick=processPayroll}
    else{primary.textContent=run.status==='Settled'?'Payroll complete':'View payment progress';primary.className='btn secondary';primary.onclick=()=>goPage('payrollrun')}
    const stage=issueList.length?0:run.funding!=="Funded"?1:run.approval!=="Approved"?2:run.status==='Settled'?4:3;
    document.getElementById('overviewPayrollCard').innerHTML=`
      <div class="payroll-top"><div><div class="eyebrow">Payroll run</div><div class="payroll-name">The24thGroup — ${run.period}</div><div class="muted">${all} staff · Pay ${run.date}</div></div><div><div class="eyebrow">Net payroll</div><div class="money">${money(total)}</div><div class="muted">Prep + change cutoff: ${run.cutoffDate}</div></div></div>
      <div class="progress"><div class="step ${stage>0?'done':stage===0?'current':''}"><b>01 · READINESS</b><small>${ready}/${all} ready</small></div><div class="step ${stage>1?'done':stage===1?'current':''}"><b>02 · FUNDING</b><small>${run.funding}</small></div><div class="step ${stage>2?'done':stage===2?'current':''}"><b>03 · APPROVAL</b><small>${run.approval}</small></div><div class="step ${stage>=4?'done':stage===3?'current':''}"><b>04 · PAYMENT</b><small>${run.status}</small></div></div>
      <div class="scope-note"><strong>V1 payroll rule:</strong> changes made after ${run.cutoffDate} apply to the next payroll. The configured payday stays ${run.date} even if it falls on a weekend or bank holiday.</div>
      <div class="actions-row"><button class="btn secondary" onclick="goPage('payrollrun')">Open payroll</button></div>`;
    document.getElementById('attentionCount').textContent=`${issueList.length} item${issueList.length===1?'':'s'}`;
    document.getElementById('attentionList').innerHTML=issueList.length?issueList.map(p=>`<div class="attention-row"><div class="attention-dot"></div><div><strong>${p.name}</strong><small>${p.bankStatus}</small></div><button class="btn ghost" onclick="openPerson('${p.id}')">Review</button></div>`).join(''):`<div class="attention-row"><div class="attention-dot" style="background:var(--green)"></div><div><strong>Payroll ready</strong><small>No recipient issues remain.</small></div></div>`;
  };

  renderPeople=function(){
    const list=peopleFiltered(),active=state.people.filter(p=>p.status==='Active').length,verified=state.people.filter(p=>p.bankStatus==='Verified').length,inactive=state.people.filter(p=>p.status==='Inactive').length;
    document.getElementById('peopleNavCount').textContent=state.people.length;
    document.getElementById('peopleStats').innerHTML=`<div class="count-pill info"><strong>${state.people.length}</strong> total</div><div class="count-pill good"><strong>${active}</strong> active</div><div class="count-pill good"><strong>${verified}</strong> verified</div><div class="count-pill bad"><strong>${inactive}</strong> inactive</div>`;
    document.getElementById('peopleRange').textContent=`Showing ${list.length} staff`;
    const rows=document.getElementById('peopleRows'),mobile=document.getElementById('peopleMobile');rows.innerHTML='';mobile.innerHTML='';
    list.forEach(p=>{
      const adj=adjustmentTotal(p),net=employeeNet(p);
      const tr=document.createElement('tr');tr.className='clickable';tr.onclick=()=>openPerson(p.id);tr.innerHTML=`<td><input class="checkbox person-check" data-id="${p.id}" type="checkbox" onclick="event.stopPropagation()"></td><td class="person"><strong>${p.name}</strong><small>${p.email}</small></td><td>${p.role}</td><td>${money(p.pay)}</td><td>${status(p.bankStatus)}</td><td>${status(p.included?'Included':'Not included')}</td><td>${p.lastPaid||'—'}</td>`;rows.appendChild(tr);
      const c=document.createElement('div');c.className='mobile-record';c.onclick=()=>openPerson(p.id);c.innerHTML=`<h4>${p.name}</h4><p>${p.role} · ${p.email}</p><div class="mobile-record-grid"><div><span>Base pay</span><strong>${money(p.pay)}</strong></div><div><span>Bank</span><strong>${p.bankStatus}</strong></div><div><span>Current net</span><strong>${money(net)}</strong></div><div><span>Last paid</span><strong>${p.lastPaid||'—'}</strong></div></div>`;mobile.appendChild(c);
    });
    bindChecks();
  };

  renderPayroll=function(){
    const q=document.getElementById('payrollSearch')?.value.toLowerCase()||'',st=document.getElementById('payrollStatus')?.value||'';
    const list=state.payrolls.filter(p=>(!q||`${p.id} ${p.period}`.toLowerCase().includes(q))&&(!st||[p.status,p.funding,p.approval].includes(st)));
    const rows=document.getElementById('payrollRows'),mob=document.getElementById('payrollMobile');rows.innerHTML='';mob.innerHTML='';
    list.forEach(r=>{if(r.id===currentRun().id){r.people=includedPeople().length;r.net=calcRunTotal()}
      const tr=document.createElement('tr');tr.className='clickable';tr.onclick=()=>openPayroll(r.id);tr.innerHTML=`<td class="person"><strong>${r.period}</strong><small>${r.id}</small></td><td>${r.date}</td><td>${r.people}</td><td>${money(r.net)}</td><td>${status(r.funding)}</td><td>${status(r.approval)}</td><td>${status(r.status)}</td>`;rows.appendChild(tr);
      const c=document.createElement('div');c.className='mobile-record';c.onclick=()=>openPayroll(r.id);c.innerHTML=`<h4>${r.period}</h4><p>${r.id} · Pay ${r.date}</p><div class="mobile-record-grid"><div><span>People</span><strong>${r.people}</strong></div><div><span>Net payroll</span><strong>${money(r.net)}</strong></div><div><span>Funding</span><strong>${r.funding}</strong></div><div><span>Status</span><strong>${r.status}</strong></div></div><div class="mobile-record-foot">${status(r.status)}<span>›</span></div>`;mob.appendChild(c);
    });
    document.getElementById('payrollStats').innerHTML=`<div class="count-pill info"><strong>${state.payrolls.length}</strong> total</div><div class="count-pill good"><strong>${state.payrolls.filter(x=>x.status==='Settled').length}</strong> settled</div><div class="count-pill warn"><strong>${state.payrolls.filter(x=>x.funding!=='Funded').length}</strong> awaiting funding</div><div class="count-pill bad"><strong>${state.payrolls.filter(x=>['Failed','Reversed'].includes(x.status)).length}</strong> failed</div>`;
  };

  renderRun=function(){
    const run=currentRun(),all=includedPeople(),ready=readyPeople(),issue=issues(),total=calcRunTotal();
    document.getElementById('runSubtitle').textContent=`${run.id} · ${all.length} staff · pay date ${run.date} · cutoff ${run.cutoffDate}`;
    document.getElementById('runStats').innerHTML=`<div class="run-stat"><span>Net payroll</span><strong>${money(total)}</strong></div><div class="run-stat"><span>Ready</span><strong>${ready.length} / ${all.length}</strong></div><div class="run-stat"><span>Funding</span><strong style="font-size:13px">${status(run.funding)}</strong></div><div class="run-stat"><span>Approval</span><strong style="font-size:13px">${status(run.approval)}</strong></div>`;
    const rows=document.getElementById('recipientRows'),mob=document.getElementById('recipientMobile');rows.innerHTML='';mob.innerHTML='';
    all.forEach(p=>{const isReady=p.bankStatus==='Verified',adj=adjustmentTotal(p),net=employeeNet(p),transfer=run.status==='Settled'?'Settled':run.status==='Processing'?'Processing':isReady?'Not started':'Blocked';
      const tr=document.createElement('tr');tr.className='clickable';tr.onclick=()=>openPerson(p.id);tr.innerHTML=`<td class="person"><strong>${p.name}</strong><small>${p.role}</small></td><td>${p.bank?`${p.bank} · •••• ${p.account}`:'Action required'}</td><td>${money(p.pay)}</td><td><button class="btn ghost" onclick="event.stopPropagation();openAdjustment('${p.id}')">${adj?money(adj):'Add'}</button></td><td><strong>${money(net)}</strong></td><td>${status(isReady?'Ready':'Action required')}</td><td>${status(transfer)}</td>`;rows.appendChild(tr);
      const c=document.createElement('div');c.className='mobile-record';c.onclick=()=>openPerson(p.id);c.innerHTML=`<h4>${p.name}</h4><p>${p.role}</p><div class="mobile-record-grid"><div><span>Base pay</span><strong>${money(p.pay)}</strong></div><div><span>Adjustments</span><strong>${adj?money(adj):'None'}</strong></div><div><span>Net pay</span><strong>${money(net)}</strong></div><div><span>Readiness</span><strong>${isReady?'Ready':'Action required'}</strong></div></div><div class="mobile-record-foot"><button class="btn ghost" onclick="event.stopPropagation();openAdjustment('${p.id}')">Add adjustment</button>${status(transfer)}</div>`;mob.appendChild(c);
    });
    document.getElementById('runIssueCount').textContent=`${issue.length} issue${issue.length===1?'':'s'}`;document.getElementById('runIssues').innerHTML=issue.length?issue.map(p=>`<div class="exception-row"><div><strong>${p.name}</strong><small>${p.bankStatus}</small></div><button class="btn ghost" onclick="openPerson('${p.id}')">Review</button></div>`).join(''):`<div class="exception-row"><div><strong>All recipients ready</strong><small>No bank or eligibility issues.</small></div></div>`;
    document.getElementById('runStateLabel').textContent=run.status.toUpperCase();document.getElementById('runSummary').innerHTML=`<div class="kv"><span>Prepared</span><strong>${run.prepareDate}</strong></div><div class="kv"><span>Change cutoff</span><strong>${run.cutoffDate}</strong></div><div class="kv"><span>Pay date</span><strong>${run.date}</strong></div><div class="kv"><span>People</span><strong>${all.length}</strong></div><div class="kv"><span>Net payroll</span><strong>${money(total)}</strong></div><div class="kv"><span>Funding</span>${status(run.funding)}</div><div class="kv"><span>Approval</span>${status(run.approval)}</div><div class="scope-note"><strong>Timing rule:</strong> payday is not moved for weekends or bank holidays. Post-cutoff changes move to the next payroll run.</div>`;
    const btn=document.getElementById('runPrimary');if(issue.length){btn.textContent='Resolve readiness';btn.className='btn primary';btn.onclick=()=>goPage('people')}else if(run.funding!=='Funded'){btn.textContent='Fund payroll';btn.className='btn financial';btn.onclick=startFunding}else if(run.approval!=='Approved'){btn.textContent='Approve payroll';btn.className='btn financial';btn.onclick=startApproval}else if(run.status==='Approved'){btn.textContent=`Pay ${all.length} people · ${money(total)}`;btn.className='btn financial';btn.onclick=processPayroll}else{btn.textContent=run.status==='Settled'?'Payroll complete':'Payment processing';btn.className='btn secondary';btn.onclick=()=>goPage('payments')}
  };

  function ensureAdjustmentModal(){
    if(document.getElementById('adjustmentModal'))return;
    const wrap=document.createElement('div');wrap.className='modal-wrap';wrap.id='adjustmentModal';wrap.innerHTML=`<div class="modal"><div class="modal-head"><h3>Add adjustment</h3><button class="icon-btn" onclick="closeModal('adjustmentModal')">×</button></div><div class="modal-body"><div class="field" style="margin-bottom:10px"><select id="adjType"><option>Bonus</option><option>Reimbursement</option><option>Allowance</option><option>Deduction</option><option>Salary correction</option><option>Other</option></select></div><div class="field" style="margin-bottom:10px"><input id="adjAmount" placeholder="Amount, e.g. 25000"></div><div class="field"><input id="adjReason" placeholder="Reason"></div><div class="proof-note">Keep adjustments simple. Positive values increase net pay; choose Deduction to subtract.</div></div><div class="modal-foot"><button class="btn secondary" onclick="closeModal('adjustmentModal')">Cancel</button><button class="btn primary" id="adjSave">Add adjustment</button></div></div>`;document.body.appendChild(wrap);
  }
  ensureAdjustmentModal();
  window.openAdjustment=function(id){state.currentPerson=id;const p=state.people.find(x=>x.id===id);document.querySelector('#adjustmentModal h3').textContent=`Adjustment · ${p.name}`;document.getElementById('adjType').value='Bonus';document.getElementById('adjAmount').value='';document.getElementById('adjReason').value='';document.getElementById('adjSave').onclick=saveAdjustment;openModal('adjustmentModal')};
  function saveAdjustment(){const p=state.people.find(x=>x.id===state.currentPerson),type=document.getElementById('adjType').value,raw=parseInt(document.getElementById('adjAmount').value.replace(/\D/g,''),10),reason=document.getElementById('adjReason').value.trim();if(!raw||!reason){toast('Complete adjustment','Amount and reason are required.');return}const amount=type==='Deduction'?-raw:raw;p.adjustments=p.adjustments||[];p.adjustments.push({id:`ADJ-${Date.now()}`,type,amount,reason,createdBy:'Johannes Oghoro',createdAt:new Date().toISOString()});log('Payroll adjustment added',`${p.id} · ${type} · ${money(amount)}`,'Johannes Oghoro','Payroll');save();closeModal('adjustmentModal');render();toast('Adjustment added',`${type} applied to ${p.name}.`)}

  openPerson=function(id){const p=state.people.find(x=>x.id===id);if(!p)return;const adj=(p.adjustments||[]).map(a=>`<div class="adjustment-item"><span>${a.type}<small style="display:block;color:var(--muted)">${a.reason}</small></span><strong class="${a.amount<0?'adjustment-negative':'adjustment-positive'}">${a.amount<0?'-':'+'}${money(Math.abs(a.amount))}</strong></div>`).join('')||'<div class="muted">No adjustments for this payroll.</div>';openDrawer(p.name,`${p.role} · ${p.status}`,`<div class="kv"><span>Email</span><strong>${p.email}</strong></div><div class="kv"><span>Employee ID</span><strong>${p.id}</strong></div><div class="kv"><span>Start date</span><strong>${p.startDate}</strong></div><div class="kv"><span>Monthly salary</span><strong>${money(p.pay)}</strong></div><div class="kv"><span>Bank</span>${status(p.bankStatus)}</div><div class="kv"><span>October payroll</span><strong>${money(employeeNet(p))}</strong></div><div class="adjustment-list">${adj}</div><div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap"><button class="btn secondary" onclick="startBankUpdate('${p.id}')">Update bank</button><button class="btn secondary" onclick="openAdjustment('${p.id}')">Add adjustment</button><button class="btn secondary" onclick="toggleInclude('${p.id}')">${p.included?'Remove from payroll':'Include in payroll'}</button></div>`,`<div class="mini-list"><div class="mini-item"><strong>September 2026 · ${money(p.pay)}</strong><small>${p.lastPaid==='—'?'No previous payment':'Settled · '+p.lastPaid}</small></div></div>`,`<div class="mini-list"><div class="mini-item"><strong>${p.bankStatus==='Verified'?'Bank verified':'Bank action required'}</strong><small>Current payroll-readiness state</small></div></div>`,'Preview employee portal',()=>{state.currentPerson=p.id;save();closeDrawer();goPage('employee')})};

  toggleInclude=function(id){const p=state.people.find(x=>x.id===id);p.included=!p.included;log(p.included?'Added to payroll':'Removed from payroll',`${p.id} · ${p.name}`,'Johannes Oghoro','Employee');save();closeDrawer();render();toast('Payroll updated',`${p.name} ${p.included?'included in':'removed from'} October payroll.`)};
  openPayroll=function(id){const r=state.payrolls.find(x=>x.id===id);openDrawer(r.period,`${r.people} people · ${money(r.net)}`,`<div class="kv"><span>Prepared</span><strong>${r.prepareDate||'—'}</strong></div><div class="kv"><span>Change cutoff</span><strong>${r.cutoffDate||'—'}</strong></div><div class="kv"><span>Pay date</span><strong>${r.date}</strong></div><div class="kv"><span>Funding</span>${status(r.funding)}</div><div class="kv"><span>Approval</span>${status(r.approval)}</div><div class="kv"><span>Status</span>${status(r.status)}</div>`,`<div class="mini-item"><strong>Payroll prepared</strong><small>${r.prepareDate||'Scheduler'}</small></div>`,`<div class="mini-item"><strong>${r.id}</strong><small>Immutable payroll reference</small></div>`,'Open payroll',()=>{closeDrawer();goPage(r.id===currentRun().id?'payrollrun':'payroll')})};

  previewPayslip=function(id){const s=state.payslips.find(x=>x.id===id),p=state.people.find(x=>x.id===s.employeeId)||state.people.find(x=>x.name===s.person),adjustments=(p?.adjustments||[]).filter(()=>false);openDrawer(`${s.person} · ${s.period}`,'Payslip / proof of income',`<div class="eyebrow">${state.settings.org}</div><h2 style="font-size:20px;margin:8px 0 16px">Payslip</h2><div class="kv"><span>Employer</span><strong>${state.settings.org}</strong></div><div class="kv"><span>Employer contact</span><strong>${state.settings.employerEmail}</strong></div><div class="kv"><span>Employee</span><strong>${s.person}</strong></div><div class="kv"><span>Employee reference</span><strong>${p?.id||'—'}</strong></div><div class="kv"><span>Job title</span><strong>${p?.role||'—'}</strong></div><div class="kv"><span>Employment start</span><strong>${p?.startDate||'—'}</strong></div><div class="kv"><span>Payroll period</span><strong>${s.period}</strong></div><div class="kv"><span>Base salary</span><strong>${money(s.base||s.amount)}</strong></div><div class="kv"><span>Net pay</span><strong>${money(s.amount)}</strong></div><div class="kv"><span>Currency</span><strong>NGN</strong></div><div class="kv"><span>Pay date</span><strong>${s.date}</strong></div><div class="kv"><span>Payment status</span>${status('Settled')}</div><div class="kv"><span>Payment reference</span><strong>${s.paymentRef||'—'}</strong></div><div class="kv"><span>Payslip reference</span><strong>${s.id}</strong></div><div class="proof-note">Generated from Igho payroll records for ${state.settings.org}. This payslip can support basic proof-of-income and employment checks.</div>`,`<div class="mini-item"><strong>Generated</strong><small>${s.date}</small></div>`,`<div class="mini-item"><strong>${s.id}</strong><small>Document reference</small></div>`,'Download PDF',()=>toast('Payslip downloaded','Demo PDF download simulated.'))};

  renderSettings=function(){const s=state.settings,days=Array.from({length:31},(_,i)=>i+1);document.getElementById('settingsContent').innerHTML=`
    <section class="settings-section active" id="s-payroll"><div class="settings-section-head"><h3>Payroll</h3><p>Internal monthly payroll rules for The24thGroup.</p></div><div class="settings-body">
      <div class="settings-row"><div class="settings-copy"><strong>Default payday</strong><small>Default is the 1st. Any day of the month can be selected.</small></div><div class="field"><select id="setPayday">${days.map(d=>`<option ${s.payday.startsWith(d+'st')||s.payday.startsWith(d+'nd')||s.payday.startsWith(d+'rd')||s.payday.startsWith(d+'th')?'selected':''}>${d}${d===1?'st':d===2?'nd':d===3?'rd':'th'} of each month</option>`).join('')}</select></div></div>
      <div class="settings-row"><div class="settings-copy"><strong>Automatic preparation</strong><small>Prepare payroll 7 days before payday.</small></div><div class="field"><input value="7 days before payday" readonly></div></div>
      <div class="settings-row"><div class="settings-copy"><strong>Change cutoff</strong><small>Salary, bank and employee changes after cutoff move to the next run.</small></div><div class="field"><input value="7 days before payday" readonly></div></div>
      <div class="settings-row"><div class="settings-copy"><strong>Weekend / bank holiday</strong><small>Igho does not automatically move the configured payday.</small></div><div class="field"><input value="Keep configured payday" readonly></div></div>
      <div class="settings-row"><div class="settings-copy"><strong>Adjustments</strong><small>Simple bonus, reimbursement, allowance, deduction, correction or other.</small></div><div class="field"><input value="Simple adjustments" readonly></div></div>
      <div class="settings-row"><div class="settings-copy"><strong>Final approval</strong><small>Approval is required before employee transfers.</small></div><div class="field"><select id="setApproval"><option selected>Required</option><option>Not required</option></select></div></div>
    </div><div class="settings-save"><button class="btn primary" onclick="savePayrollSettings()">Save payroll settings</button></div></section>
    <section class="settings-section" id="s-payments"><div class="settings-section-head"><h3>Payments</h3><p>Provider-agnostic architecture with Paystack configured for V1.</p></div><div class="settings-body"><div class="settings-row"><div class="settings-copy"><strong>Funding provider</strong><small>Provider used to collect payroll funding.</small></div><div class="field"><input value="${s.fundingProvider}" readonly></div></div><div class="settings-row"><div class="settings-copy"><strong>Payout provider</strong><small>Provider used for employee bank transfers.</small></div><div class="field"><input value="${s.payoutProvider}" readonly></div></div></div></section>
    <section class="settings-section" id="s-notifications"><div class="settings-section-head"><h3>Notifications</h3><p>Event-driven employee and payroll alerts.</p></div><div class="settings-body"><div class="settings-row"><div class="settings-copy"><strong>V1 channel</strong><small>Employee invites, payment updates and payslip alerts.</small></div><div class="field"><input value="Email" readonly></div></div></div></section>
    <section class="settings-section" id="s-workspace"><div class="settings-section-head"><h3>Workspace</h3><p>Details used on payroll and proof-of-income documents.</p></div><div class="settings-body"><div class="settings-row"><div class="settings-copy"><strong>Organisation name</strong></div><div class="field"><input id="setOrg" value="${s.org}"></div></div><div class="settings-row"><div class="settings-copy"><strong>Employer email</strong></div><div class="field"><input id="setEmployerEmail" value="${s.employerEmail}"></div></div><div class="settings-row"><div class="settings-copy"><strong>Employer address</strong></div><div class="field"><input id="setEmployerAddress" value="${s.employerAddress}"></div></div></div><div class="settings-save"><button class="btn primary" onclick="saveWorkspaceSettings()">Save workspace settings</button></div></section>
    <section class="settings-section" id="s-security"><div class="settings-section-head"><h3>Security</h3><p>Authentication provider is intentionally not locked yet.</p></div><div class="settings-body"><div class="settings-row"><div class="settings-copy"><strong>Authentication</strong><small>Database direction: Neon. Auth provider still to be selected.</small></div><div class="field"><input value="To be configured" readonly></div></div><div class="settings-row"><div class="settings-copy"><strong>Re-authentication</strong><small>Require sign-in again before sensitive payment actions.</small></div><div class="field"><select id="setReauth"><option selected>Enabled</option><option>Disabled</option></select></div></div></div></section>`;
    document.querySelectorAll('.settings-link').forEach(b=>b.onclick=()=>{document.querySelectorAll('.settings-link').forEach(x=>x.classList.remove('active'));document.querySelectorAll('.settings-section').forEach(x=>x.classList.remove('active'));b.classList.add('active');document.getElementById(b.dataset.settings).classList.add('active')});
  };

  savePayrollSettings=function(){state.settings.payday=document.getElementById('setPayday').value;state.settings.approval=document.getElementById('setApproval').value;log('Payroll settings updated','Settings','Johannes Oghoro','System');save();toast('Payroll settings saved','Payday and approval rules updated.')};
  saveWorkspaceSettings=function(){state.settings.org=document.getElementById('setOrg').value;state.settings.employerEmail=document.getElementById('setEmployerEmail').value;state.settings.employerAddress=document.getElementById('setEmployerAddress').value;save();toast('Workspace saved','Employer details updated.')};

  renderPortal=function(){const p=state.people.find(x=>x.id===state.currentPerson)||state.people[0];document.getElementById('employeeSubtitle').textContent=`${p.name} · ${p.role}`;document.getElementById('portalUser').innerHTML=`<strong>${p.name}</strong><small>${p.role}</small>`;const renderTab=(tab)=>{document.querySelectorAll('.portal-link').forEach(x=>x.classList.toggle('active',x.dataset.portal===tab));const main=document.getElementById('portalMain');if(tab==='pay'){main.innerHTML=`<div class="eyebrow">Next payment</div><div class="money" style="margin-top:7px">${money(employeeNet(p))}</div><div class="muted" style="margin-top:5px">Scheduled for 1 October 2026</div><div class="pay-card" style="margin-top:20px"><div class="kv"><span>Pay period</span><strong>October 2026</strong></div><div class="kv"><span>Base salary</span><strong>${money(p.pay)}</strong></div><div class="kv"><span>Adjustments</span><strong>${money(adjustmentTotal(p))}</strong></div><div class="kv"><span>Expected net</span><strong>${money(employeeNet(p))}</strong></div><div class="kv"><span>Status</span>${status(p.included?'Scheduled':'Not included')}</div></div>`}if(tab==='bank'){main.innerHTML=`<div class="eyebrow">Bank account</div><div class="bank-card" style="margin-top:10px"><div class="kv"><span>Bank</span><strong>${p.bank||'Not added'}</strong></div><div class="kv"><span>Account</span><strong>${p.account?'•••• '+p.account:'—'}</strong></div><div class="kv"><span>Status</span>${status(p.bankStatus)}</div></div><button class="btn primary" style="margin-top:14px" onclick="startBankUpdate('${p.id}')">Update bank account</button>`}if(tab==='slips'){const slips=state.payslips.filter(s=>s.person===p.name);main.innerHTML=`<div class="eyebrow">Payslips</div><div class="mini-list" style="margin-top:10px">${slips.length?slips.map(s=>`<div class="mini-item" style="cursor:pointer" onclick="previewPayslip('${s.id}')"><strong>${s.period} · ${money(s.amount)}</strong><small>${s.date} · ${s.status}</small></div>`).join(''):'<div class="mini-item"><strong>No payslips yet</strong><small>Payslips appear after successful payment.</small></div>'}</div>`}};document.querySelectorAll('.portal-link').forEach(b=>b.onclick=()=>renderTab(b.dataset.portal));renderTab('pay')};

  confirmFunding=function(){const run=currentRun();run.funding='Funded';run.status='Funded';state.payments.unshift({id:`FND-2026-10-${String(state.payments.filter(x=>x.type==='Funding').length+1).padStart(3,'0')}`,type:'Funding',desc:'October payroll funding',amount:calcRunTotal(),date:'30 Sep 2026',status:'Settled'});log('Payroll funded',run.id,'Paystack','Payment');save();closeModal('fundModal');render();toast('Payroll funded',`${money(calcRunTotal())} confirmed via ${window.demoFundingMethod}.`)};
  processPayroll=function(){const run=currentRun();if(run.approval!=='Approved'){toast('Approval required','Approve the payroll first.');return}run.status='Processing';includedPeople().forEach((p,i)=>state.payments.unshift({id:`TRF-2026-10-${String(i+1).padStart(3,'0')}`,type:'Transfer',desc:`${p.name} · October salary`,amount:employeeNet(p),date:'1 Oct 2026',status:'Processing'}));log('Payroll payment initiated',run.id,'Johannes Oghoro','Payroll');save();render();toast('Payments initiated',`${includedPeople().length} transfers are processing.`);setTimeout(settlePayroll,1800)};
  settlePayroll=function(){const run=currentRun();run.status='Settled';state.payments.filter(p=>p.id.startsWith('TRF-2026-10')).forEach(p=>p.status='Settled');includedPeople().forEach((p,i)=>{p.lastPaid='1 Oct 2026';if(!state.payslips.some(s=>s.person===p.name&&s.period==='October 2026'))state.payslips.unshift({id:`PSL-2026-10-${String(i+1).padStart(3,'0')}`,person:p.name,employeeId:p.id,period:'October 2026',base:p.pay,amount:employeeNet(p),date:'1 Oct 2026',paymentRef:`TRF-2026-10-${String(i+1).padStart(3,'0')}`,status:'Available'})});log('Payroll settled',run.id,'Paystack','Payment');save();render();toast('Payroll complete','All demo transfers settled and payslips were generated.')};
  createPayroll=function(){toast('Payroll schedule','October payroll is the current prepared demo run. Future runs prepare 7 days before payday.')};

  const oldGoPage=goPage;goPage=function(id){oldGoPage(id);if(id==='payrollrun')document.getElementById('breadcrumb').textContent='The24thGroup / October 2026 Payroll'};
  document.getElementById('resetBtn').onclick=()=>{if(confirm('Reset the Igho demo back to the scoped V1 starting state?')){state=makeV1State();save();render();goPage('overview');toast('Demo reset','The V1 internal payroll starting state has been restored.')}};

  render();
})();
