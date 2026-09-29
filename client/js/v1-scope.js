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
  currentRun=function(){return state.payrolls.find(p=>p.id===state.currentPayrollId)||state.payrolls[0]};
  function adjustmentTotal(p){return (p.adjustments||[]).reduce((s,a)=>s+a.amount,0)}
  function employeeNet(p){return p.pay+adjustmentTotal(p)}
  calcRunTotal=function(){return includedPeople().reduce((s,p)=>s+employeeNet(p),0)};

  function liveAdminMode(){return Boolean(window.IghoLive?.me?.roles?.some(role=>role==='OWNER'||role==='PAYROLL_ADMIN'))}
  function formatApiDate(value){if(!value)return '—';const d=new Date(value+'T00:00:00Z');return new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(d)}
  function formatPeriod(year,month){return new Intl.DateTimeFormat('en-GB',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(year,month-1,1)))}
  function titleStatus(value){return String(value||'').toLowerCase().replace(/_/g,' ').replace(/\b\w/g,m=>m.toUpperCase())}
  function fundingLabel(rawStatus){
    if(['FUNDED','AWAITING_APPROVAL','APPROVED','PROCESSING','PARTIALLY_PAID','SETTLED'].includes(rawStatus))return 'Funded';
    if(['AWAITING_FUNDING','FUNDING_PENDING'].includes(rawStatus))return 'Pending';
    if(rawStatus==='FAILED')return 'Failed';
    return 'Not funded';
  }
  function approvalLabel(rawStatus){return ['APPROVED','PROCESSING','PARTIALLY_PAID','SETTLED'].includes(rawStatus)?'Approved':'Pending'}
  function otpPayout(run){return (run?.payouts||[]).find(p=>p.status==='otp')||null}
  function apiRunToState(run){return {id:run.id,period:formatPeriod(run.periodYear,run.periodMonth),date:formatApiDate(run.payDate),prepareDate:formatApiDate(run.preparationDate),cutoffDate:formatApiDate(run.cutoffDate),people:run.includedCount,net:Number(run.totalNetPay||0),funding:fundingLabel(run.status),approval:approvalLabel(run.status),status:titleStatus(run.status),rawStatus:run.status,payDateRaw:run.payDate,cutoffDateRaw:run.cutoffDate,fundingAttempt:run.funding||null}}
  function runEditable(run=currentRun()){if(!run||!run.cutoffDateRaw)return true;const today=new Date();const todayKey=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;return ['DRAFT','READY'].includes(run.rawStatus)&&todayKey<=run.cutoffDateRaw}


  document.querySelector('#overview .page-title').textContent='Payroll overview';
  document.querySelector('#payrollrun .page-title').textContent='Payroll';
  const runTable=document.getElementById('recipientRows')?.closest('table');
  if(runTable){runTable.querySelector('thead tr').innerHTML='<th>Employee</th><th>Salary account</th><th>Base pay</th><th>Adjustments</th><th>Net pay</th><th>Payroll check</th><th>Payment</th><th>Payroll</th>'}

  renderOverview=function(){
    const run=currentRun();
    if(!run){
      document.getElementById('overviewSubtitle').textContent='No payroll has been prepared yet.';
      document.getElementById('overviewMetrics').innerHTML='';
      document.getElementById('overviewPayrollCard').innerHTML='<div class="payroll-card"><div class="eyebrow">Payroll</div><div class="payroll-name">No payroll prepared</div><div class="muted">Prepare payroll to include active employees and check that they are ready to be paid.</div><div class="actions-row"><button class="btn primary" onclick="createPayroll()">Prepare payroll</button></div></div>';
      document.getElementById('attentionCount').textContent='0 items';
      document.getElementById('attentionList').innerHTML='<div class="attention-row"><div class="attention-dot ready-dot"></div><div><strong>No active payroll</strong><small>Nothing needs attention yet.</small></div></div>';
      const primary=document.getElementById('overviewPrimary');primary.textContent='Prepare payroll';primary.className='btn primary';primary.disabled=false;primary.onclick=createPayroll;
      return;
    }
    const total=calcRunTotal(),ready=readyPeople().length,all=includedPeople().length,issueList=issues();
    document.querySelector('#overview .page-title').textContent=`${run.period} payroll`;
    document.getElementById('overviewSubtitle').textContent=`The24thGroup · pay date ${run.date} · prepared ${run.prepareDate}`;
    document.getElementById('overviewMetrics').innerHTML=`
      <div class="metric"><div class="metric-label">Payroll total</div><div class="metric-value">${money(total)}</div><div class="metric-meta">${all} employees · monthly payroll</div></div>
      <div class="metric"><div class="metric-label">Ready to pay</div><div class="metric-value">${ready} / ${all}</div><div class="metric-meta">${issueList.length?issueList.length+' need attention':'All employees ready'}</div></div>
      <div class="metric"><div class="metric-label">Funding</div><div class="metric-value">${status(run.funding)}</div><div class="metric-meta">Money added before payments are released</div></div>
      <div class="metric"><div class="metric-label">Pay date</div><div class="metric-value">${run.date}</div><div class="metric-meta">Never auto-shifted for weekends/holidays</div></div>`;
    const primary=document.getElementById('overviewPrimary');
    primary.disabled=false;
    if(issueList.length){primary.textContent=`Review ${issueList.length} issue`;primary.className='btn primary';primary.onclick=()=>goPage('people')}
    else if(liveAdminMode()&&['READY','AWAITING_FUNDING','FUNDING_PENDING'].includes(run.rawStatus)){primary.textContent=run.rawStatus==='READY'?'Fund payroll':'Continue funding';primary.className='btn financial';primary.onclick=startFunding}
    else if(liveAdminMode()&&run.rawStatus==='FUNDED'){primary.textContent='Approve payroll';primary.className='btn financial';primary.onclick=startApproval}
    else if(liveAdminMode()&&run.rawStatus==='APPROVED'){primary.textContent=`Pay ${all} employee${all===1?'':'s'} · ${money(total)}`;primary.className='btn financial';primary.onclick=processPayroll}
    else if(liveAdminMode()&&otpPayout(run)){primary.textContent='Authorise payment';primary.className='btn financial';primary.onclick=openPayoutOtpModal}
    else if(liveAdminMode()&&['PROCESSING','PARTIALLY_PAID','FAILED'].includes(run.rawStatus)){primary.textContent='Check payment status';primary.className='btn secondary';primary.onclick=refreshPayouts}
    else if(liveAdminMode()&&run.rawStatus==='SETTLED'){primary.textContent='Payroll complete';primary.className='btn secondary';primary.disabled=true;primary.onclick=null}
    else if(liveAdminMode()){primary.textContent='Review payroll';primary.className='btn secondary';primary.onclick=()=>goPage('payrollrun')}
    else if(run.funding!=="Funded"){primary.textContent='Fund payroll';primary.className='btn financial';primary.onclick=startFunding}
    else if(run.approval!=="Approved"){primary.textContent='Approve payroll';primary.className='btn financial';primary.onclick=startApproval}
    else if(run.status==='Approved'){primary.textContent=`Pay ${all} people · ${money(total)}`;primary.className='btn financial';primary.onclick=processPayroll}
    else{primary.textContent=run.status==='Settled'?'Payroll complete':'View payment progress';primary.className='btn secondary';primary.onclick=()=>goPage('payrollrun')}
    const stage=issueList.length?0:run.funding!=="Funded"?1:run.approval!=="Approved"?2:run.status==='Settled'?4:3;
    document.getElementById('overviewPayrollCard').innerHTML=`
      <div class="payroll-top"><div><div class="eyebrow">Current payroll</div><div class="payroll-name">The24thGroup — ${run.period}</div><div class="muted">${all} employees · Pay date ${run.date}</div></div><div><div class="eyebrow">Net payroll</div><div class="money">${money(total)}</div><div class="muted">Changes allowed until ${run.cutoffDate}</div></div></div>
      <div class="progress"><div class="step ${stage>0?'done':stage===0?'current':''}"><b>01 · CHECKS</b><small>${ready}/${all} ready to pay</small></div><div class="step ${stage>1?'done':stage===1?'current':''}"><b>02 · FUNDING</b><small>${run.funding}</small></div><div class="step ${stage>2?'done':stage===2?'current':''}"><b>03 · APPROVAL</b><small>${run.approval}</small></div><div class="step ${stage>=4?'done':stage===3?'current':''}"><b>04 · PAYMENT</b><small>${run.status}</small></div></div>
      <div class="scope-note"><strong>Payroll rule:</strong> changes made after ${run.cutoffDate} apply to the next payroll. The configured payday stays ${run.date} even if it falls on a weekend or bank holiday.</div>
      <div class="actions-row"><button class="btn secondary" onclick="goPage('payrollrun')">Open payroll</button></div>`;
    document.getElementById('attentionCount').textContent=`${issueList.length} item${issueList.length===1?'':'s'}`;
    document.getElementById('attentionList').innerHTML=issueList.length?issueList.map(p=>`<div class="attention-row"><div class="attention-dot"></div><div><strong>${p.name}</strong><small>${p.bankStatus}</small></div><button class="btn ghost" onclick="openPerson('${p.id}')">Review</button></div>`).join(''):`<div class="attention-row"><div class="attention-dot ready-dot"></div><div><strong>Payroll ready</strong><small>All included employees are ready.</small></div></div>`;
  };

  renderPeople=function(){
    const list=peopleFiltered(),active=state.people.filter(p=>p.status==='Active').length,verified=state.people.filter(p=>p.bankStatus==='Verified').length,inactive=state.people.filter(p=>p.status==='Inactive').length;
    document.getElementById('peopleNavCount').textContent=state.people.length;
    document.getElementById('peopleStats').innerHTML=`<div class="count-pill info"><strong>${state.people.length}</strong> total</div><div class="count-pill good"><strong>${active}</strong> active</div><div class="count-pill good"><strong>${verified}</strong> verified</div><div class="count-pill bad"><strong>${inactive}</strong> inactive</div>`;
    document.getElementById('peopleRange').textContent=`Showing ${list.length} employees`;
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
    const run=currentRun();
    if(!run){
      document.getElementById('runSubtitle').textContent='No payroll has been prepared yet.';
      document.getElementById('runStats').innerHTML='';
      document.getElementById('recipientRows').innerHTML='';
      document.getElementById('recipientMobile').innerHTML='';
      document.getElementById('runIssues').innerHTML='<div class="exception-row"><div><strong>No payroll prepared</strong><small>Prepare payroll to include employees and check their payment details.</small></div></div>';
      document.getElementById('runPrimary').textContent='Prepare payroll';
      document.getElementById('runPrimary').className='btn primary';
      document.getElementById('runPrimary').onclick=createPayroll;
      return;
    }
    const participants=liveAdminMode()?state.people.filter(p=>p.payrollItemId):state.people;
    const all=participants.filter(p=>p.included);
    const ready=all.filter(p=>p.bankStatus==='Verified');
    const issue=all.filter(p=>p.bankStatus!=='Verified');
    const total=all.reduce((sum,p)=>sum+employeeNet(p),0);
    const editable=runEditable(run);
    document.querySelector('#payrollrun .page-title').textContent=`${run.period} payroll`;
    document.getElementById('runSubtitle').textContent=`${run.id} · ${all.length} included · pay date ${run.date} · changes until ${run.cutoffDate}`;
    document.getElementById('runStats').innerHTML=`<div class="run-stat"><span>Net payroll</span><strong>${money(total)}</strong></div><div class="run-stat"><span>Ready to pay</span><strong>${ready.length} / ${all.length}</strong></div><div class="run-stat"><span>Funding</span><strong>${status(run.funding)}</strong></div><div class="run-stat"><span>Status</span><strong>${status(run.status)}</strong></div>`;
    const rows=document.getElementById('recipientRows'),mob=document.getElementById('recipientMobile');rows.innerHTML='';mob.innerHTML='';
    participants.forEach(p=>{const isReady=p.included&&p.bankStatus==='Verified',adj=adjustmentTotal(p),net=employeeNet(p),transfer=!p.included?'Excluded':p.payoutStatus==='success'?'Settled':p.payoutStatus==='failed'?'Failed':p.payoutStatus==='reversed'?'Reversed':p.payoutStatus==='otp'?'Authorisation required':p.payoutStatus==='pending'?'Processing':p.payoutStatus==='queued'?'Queued':isReady?'Not sent':'Needs attention';const readiness=!p.included?'Not included':isReady?'Ready to pay':'Needs attention';
      const tr=document.createElement('tr');tr.className='clickable';tr.onclick=()=>openPerson(p.id);tr.innerHTML=`<td class="person"><strong>${p.name}</strong><small>${p.role}</small></td><td>${p.bank?`${p.bank} · •••• ${p.account}`:'Add bank account'}</td><td>${money(p.pay)}</td><td><button class="btn ghost" ${!editable||!p.included?'disabled':''} onclick="event.stopPropagation();openAdjustment('${p.id}')">${adj?money(adj):'Add'}</button></td><td><strong>${money(net)}</strong></td><td>${status(readiness)}</td><td>${status(transfer)}</td><td><button class="btn ghost" ${!editable?'disabled':''} onclick="event.stopPropagation();toggleInclude('${p.id}')">${p.included?'Exclude':'Include'}</button></td>`;rows.appendChild(tr);
      const card=document.createElement('div');card.className='mobile-record';card.onclick=()=>openPerson(p.id);card.innerHTML=`<h4>${p.name}</h4><p>${p.role}</p><div class="mobile-record-grid"><div><span>Base pay</span><strong>${money(p.pay)}</strong></div><div><span>Adjustments</span><strong>${adj?money(adj):'None'}</strong></div><div><span>Net pay</span><strong>${money(net)}</strong></div><div><span>Payroll check</span><strong>${readiness}</strong></div></div><div class="mobile-record-foot"><button class="btn ghost" ${!editable||!p.included?'disabled':''} onclick="event.stopPropagation();openAdjustment('${p.id}')">Add adjustment</button><button class="btn ghost" ${!editable?'disabled':''} onclick="event.stopPropagation();toggleInclude('${p.id}')">${p.included?'Exclude':'Include'}</button></div>`;mob.appendChild(card);
    });
    document.getElementById('runIssueCount').textContent=`${issue.length} issue${issue.length===1?'':'s'}`;document.getElementById('runIssues').innerHTML=issue.length?issue.map(p=>`<div class="exception-row"><div><strong>${p.name}</strong><small>${p.readinessReason||p.bankStatus}</small></div><button class="btn ghost" onclick="openPerson('${p.id}')">Review</button></div>`).join(''):`<div class="exception-row"><div><strong>All included employees are ready</strong><small>No payment details need attention.</small></div></div>`;
    document.getElementById('runStateLabel').textContent=run.status.toUpperCase();document.getElementById('runSummary').innerHTML=`<div class="kv"><span>Prepared</span><strong>${run.prepareDate}</strong></div><div class="kv"><span>Changes allowed until</span><strong>${run.cutoffDate}</strong></div><div class="kv"><span>Pay date</span><strong>${run.date}</strong></div><div class="kv"><span>Employees included</span><strong>${all.length}</strong></div><div class="kv"><span>Net payroll</span><strong>${money(total)}</strong></div><div class="kv"><span>Funding</span>${status(run.funding)}</div>${run.fundingAttempt?.providerReference?`<div class="kv"><span>Funding reference</span><strong>${run.fundingAttempt.providerReference}</strong></div>`:''}<div class="kv"><span>Approval</span>${status(run.approval)}</div>${run.payouts?.length?`<div class="kv"><span>Payments</span><strong>${run.payouts.filter(p=>p.status==='success').length} / ${run.payouts.length} settled</strong></div>`:''}<div class="scope-note"><strong>${editable?'Changes':'Changes closed'}:</strong> ${editable?`You can update this payroll until ${run.cutoffDate}.`:`This payroll can no longer be changed. New changes will apply to a later payroll.`}</div>${liveAdminMode()&&run.rawStatus==='FUNDING_PENDING'?'<div class="actions-row"><button class="btn secondary" onclick="refreshFunding()">Check funding status</button></div>':''}${liveAdminMode()&&otpPayout(run)?'<div class="actions-row"><button class="btn financial" onclick="openPayoutOtpModal()">Authorise payment</button></div>':liveAdminMode()&&['PROCESSING','PARTIALLY_PAID','FAILED'].includes(run.rawStatus)?'<div class="actions-row"><button class="btn secondary" onclick="refreshPayouts()">Check payment status</button></div>':''}`;
    const btn=document.getElementById('runPrimary');btn.disabled=false;if(issue.length){btn.textContent='Review employees';btn.className='btn primary';btn.onclick=()=>goPage('people')}else if(liveAdminMode()&&run.rawStatus==='READY'){btn.textContent='Fund payroll';btn.className='btn financial';btn.onclick=startFunding}else if(liveAdminMode()&&['AWAITING_FUNDING','FUNDING_PENDING'].includes(run.rawStatus)){btn.textContent='Continue funding';btn.className='btn financial';btn.onclick=startFunding}else if(liveAdminMode()&&run.rawStatus==='FUNDED'){btn.textContent='Approve payroll';btn.className='btn financial';btn.onclick=startApproval}else if(liveAdminMode()&&run.rawStatus==='APPROVED'){btn.textContent=`Pay ${all.length} employee${all.length===1?'':'s'} · ${money(total)}`;btn.className='btn financial';btn.onclick=processPayroll}else if(liveAdminMode()&&otpPayout(run)){btn.textContent='Authorise payment';btn.className='btn financial';btn.onclick=openPayoutOtpModal}else if(liveAdminMode()&&['PROCESSING','PARTIALLY_PAID','FAILED'].includes(run.rawStatus)){btn.textContent='Check payment status';btn.className='btn secondary';btn.onclick=refreshPayouts}else if(liveAdminMode()&&run.rawStatus==='SETTLED'){btn.textContent='Payroll complete';btn.className='btn secondary';btn.disabled=true;btn.onclick=null}else if(liveAdminMode()){btn.textContent='Payroll needs attention';btn.className='btn secondary';btn.disabled=true;btn.onclick=null}else if(run.funding!=='Funded'){btn.textContent='Fund payroll';btn.className='btn financial';btn.onclick=startFunding}else if(run.approval!=='Approved'){btn.textContent='Approve payroll';btn.className='btn financial';btn.onclick=startApproval}else if(run.status==='Approved'){btn.textContent=`Pay ${all.length} people · ${money(total)}`;btn.className='btn financial';btn.onclick=processPayroll}else{btn.textContent=run.status==='Settled'?'Payroll complete':'View payment progress';btn.className='btn secondary';btn.onclick=()=>goPage('payments')}
  };

  function ensureAdjustmentModal(){
    if(document.getElementById('adjustmentModal'))return;
    const wrap=document.createElement('div');wrap.className='modal-wrap';wrap.id='adjustmentModal';wrap.innerHTML=`<div class="modal"><div class="modal-head"><div><h3>Add pay adjustment</h3><p class="modal-subtitle" id="adjustmentSubtitle">Update this employee’s pay for the selected payroll.</p></div><button class="icon-btn" onclick="closeModal('adjustmentModal')" aria-label="Close">×</button></div><div class="modal-body"><section class="form-section"><div class="form-grid"><label class="field"><span class="field-label">Adjustment type</span><select id="adjType"><option>Bonus</option><option>Reimbursement</option><option>Allowance</option><option>Deduction</option><option>Salary correction</option><option>Other</option></select></label><label class="field"><span class="field-label">Amount</span><span class="field-with-prefix"><span class="field-prefix">₦</span><input id="adjAmount" inputmode="numeric" placeholder="25,000"></span><small class="field-help">For a deduction, enter the amount normally and choose Deduction above.</small></label><label class="field"><span class="field-label">Reason</span><input id="adjReason" placeholder="e.g. September performance bonus"><small class="field-help">This will be kept with the payroll record.</small></label></div></section></div><div class="modal-foot"><button class="btn secondary" onclick="closeModal('adjustmentModal')">Cancel</button><button class="btn primary" id="adjSave">Add adjustment</button></div></div>`;document.body.appendChild(wrap);
  }
  ensureAdjustmentModal();
  window.openAdjustment=function(id){state.currentPerson=id;const p=state.people.find(x=>x.id===id);document.querySelector('#adjustmentModal h3').textContent=`Adjust ${p.name}'s pay`;document.getElementById('adjustmentSubtitle').textContent=`${currentRun()?.period||'Current'} payroll · Base pay ${money(p.pay)}`;document.getElementById('adjType').value='Bonus';document.getElementById('adjAmount').value='';document.getElementById('adjReason').value='';document.getElementById('adjSave').onclick=saveAdjustment;openModal('adjustmentModal')};
  async function saveAdjustment(){const p=state.people.find(x=>x.id===state.currentPerson),type=document.getElementById('adjType').value,raw=parseInt(document.getElementById('adjAmount').value.replace(/\D/g,''),10),reason=document.getElementById('adjReason').value.trim();if(!raw||!reason){toast('Complete adjustment','Amount and reason are required.');return}const amount=type==='Deduction'?-raw:raw;if(liveAdminMode()&&p?.payrollItemId&&currentRun()?.id){const typeMap={'Bonus':'bonus','Reimbursement':'reimbursement','Allowance':'allowance','Deduction':'deduction','Salary correction':'salary_correction','Other':'other'};try{const response=await window.IghoLive.api.addPayrollAdjustment(currentRun().id,p.payrollItemId,{type:typeMap[type]||'other',amount,reason});window.hydratePayrollDetailFromApi?.(response?.data?.payroll);closeModal('adjustmentModal');toast('Adjustment added',`${type} applied to ${p.name}.`)}catch(error){toast('Adjustment not added',error?.message||'This payroll can no longer be changed.')}return}p.adjustments=p.adjustments||[];p.adjustments.push({id:`ADJ-${Date.now()}`,type,amount,reason,createdBy:'Johannes Oghoro',createdAt:new Date().toISOString()});log('Payroll adjustment added',`${p.id} · ${type} · ${money(amount)}`,'Johannes Oghoro','Payroll');save();closeModal('adjustmentModal');render();toast('Adjustment added',`${type} applied to ${p.name}.`)}

  const demoStartFunding=startFunding;
  window.selectLiveFundingMethod=function(button,method){
    document.querySelectorAll('#fundModal .fund-option').forEach(x=>x.classList.remove('selected'));
    button.classList.add('selected');
    window.ighoFundingMethod=method;
  };
  startFunding=async function(){
    if(!liveAdminMode())return demoStartFunding();
    const run=currentRun();
    if(!run)return;
    if(run.rawStatus==='FUNDING_PENDING'&&run.fundingAttempt?.authorizationUrl){
      window.location.assign(run.fundingAttempt.authorizationUrl);
      return;
    }
    if(run.rawStatus!=='READY'){
      toast('Funding unavailable','This payroll is not ready to start a new funding attempt.');
      return;
    }
    document.getElementById('fundModalTitle').textContent=`Fund ${run.period} payroll`;
    document.getElementById('fundModalBody').innerHTML=`<div class="eyebrow">Amount to fund</div><div class="money funding-total">${money(calcRunTotal())}</div><div class="muted content-note">Choose how you want to add the payroll funds.</div><div class="fund-options"><button class="fund-option selected" type="button" onclick="selectLiveFundingMethod(this,'card')"><strong>Card</strong><small>Pay securely through Paystack.</small></button><button class="fund-option" type="button" onclick="selectLiveFundingMethod(this,'bank_transfer')"><strong>Bank transfer</strong><small>Use a Paystack bank transfer checkout.</small></button></div><div class="form-note">Igho marks the payroll funded only after Paystack confirms the payment.</div>`;
    window.ighoFundingMethod='card';
    const button=document.getElementById('fundConfirm');
    button.textContent='Continue to Paystack';
    button.onclick=confirmLiveFunding;
    openModal('fundModal');
  };
  async function confirmLiveFunding(){
    const run=currentRun(),button=document.getElementById('fundConfirm');
    if(!run)return;
    button.disabled=true;button.textContent='Starting funding…';
    try{
      const response=await window.IghoLive.api.startPayrollFunding(run.id,window.ighoFundingMethod||'card');
      window.hydratePayrollDetailFromApi?.(response?.data?.payroll);
      const checkout=response?.data?.checkout_url;
      closeModal('fundModal');
      if(checkout){
        window.location.assign(checkout);
        return;
      }
      toast('Funding started','The payroll funding attempt is pending.');
    }catch(error){
      toast('Funding not started',error?.message||'Could not start payroll funding.');
    }finally{
      button.disabled=false;button.textContent='Continue to Paystack';
    }
  }
  window.refreshFunding=async function(){
    const run=currentRun();
    if(!liveAdminMode()||!run)return;
    try{
      const response=await window.IghoLive.api.refreshPayrollFunding(run.id);
      window.hydratePayrollDetailFromApi?.(response?.data?.payroll);
      const updated=response?.data?.payroll;
      if(updated?.status==='FUNDED')toast('Payroll funded',`${money(Number(updated.totalNetPay||0))} confirmed and ready for approval.`);
      else if(updated?.status==='READY')toast('Funding not completed','You can start another funding attempt.');
      else toast('Funding pending','Paystack has not confirmed the funds yet.');
    }catch(error){
      toast('Could not check funding',error?.message||'Try again in a moment.');
    }
  };

  const demoStartApproval=typeof startApproval==='function'?startApproval:null;
  const demoProcessPayroll=typeof processPayroll==='function'?processPayroll:null;
  function ensureM5Modal(){
    if(document.getElementById('m5ConfirmModal'))return;
    const wrap=document.createElement('div');wrap.className='modal-wrap';wrap.id='m5ConfirmModal';wrap.innerHTML=`<div class="modal"><div class="modal-head"><div><h3 id="m5ConfirmTitle">Confirm payroll action</h3><p class="modal-subtitle" id="m5ConfirmSubtitle"></p></div><button class="icon-btn" onclick="closeModal('m5ConfirmModal')" aria-label="Close">×</button></div><div class="modal-body" id="m5ConfirmBody"></div><div class="modal-foot"><button class="btn secondary" onclick="closeModal('m5ConfirmModal')">Cancel</button><button class="btn financial" id="m5ConfirmButton">Confirm</button></div></div>`;document.body.appendChild(wrap);
  }
  ensureM5Modal();
  startApproval=async function(){
    if(!liveAdminMode())return demoStartApproval?.();
    const run=currentRun();if(!run||run.rawStatus!=='FUNDED'){toast('Approval unavailable','This payroll must be funded before approval.');return}
    const all=includedPeople();
    document.getElementById('m5ConfirmTitle').textContent=`Approve ${run.period} payroll`;
    document.getElementById('m5ConfirmSubtitle').textContent='Approval locks the payroll before salary payments are released.';
    document.getElementById('m5ConfirmBody').innerHTML=`<div class="kv"><span>Employees</span><strong>${all.length}</strong></div><div class="kv"><span>Net payroll</span><strong>${money(calcRunTotal())}</strong></div><div class="kv"><span>Funding</span><strong>Confirmed</strong></div><div class="scope-note"><strong>After approval:</strong> salary, inclusion and adjustment changes are locked for this payroll.</div>`;
    const button=document.getElementById('m5ConfirmButton');button.textContent='Approve payroll';button.onclick=async()=>{button.disabled=true;button.textContent='Approving…';try{const response=await window.IghoLive.api.approvePayroll(run.id);window.hydratePayrollDetailFromApi?.(response?.data?.payroll);closeModal('m5ConfirmModal');toast('Payroll approved','Payroll is locked and ready for salary payments.')}catch(error){toast('Payroll not approved',error?.message||'Could not approve payroll.')}finally{button.disabled=false;button.textContent='Approve payroll'}};
    openModal('m5ConfirmModal');
  };
  window.openPayoutOtpModal=function(){
    const run=currentRun(),payout=otpPayout(run);
    if(!liveAdminMode()||!run||!payout){toast('No authorisation required','There is no payment currently waiting for a Paystack OTP.');return}
    ensureM5Modal();
    document.getElementById('m5ConfirmTitle').textContent='Authorise salary payment';
    document.getElementById('m5ConfirmSubtitle').textContent=`Paystack requires an OTP before the payment to ${payout.employeeName} can proceed.`;
    document.getElementById('m5ConfirmBody').innerHTML=`<div class="form-section"><div class="form-grid two-col"><div class="field"><span class="field-label">Employee</span><input value="${payout.employeeName}" readonly></div><div class="field"><span class="field-label">Amount</span><input value="${money(Number(payout.amount||0))}" readonly></div></div><div class="field"><label class="field-label" for="payoutOtpInput">Paystack transfer OTP</label><input id="payoutOtpInput" inputmode="numeric" autocomplete="one-time-code" maxlength="8" placeholder="Enter OTP"><small class="field-help">Use the OTP Paystack sent to the business contact for this transfer.</small></div><div class="form-note">The OTP expires for security. If it has expired, request a new one for this same salary transfer.</div><div class="actions-row"><button class="btn secondary" type="button" id="resendPayoutOtp">Resend OTP</button></div></div>`;
    const resendButton=document.getElementById('resendPayoutOtp');
    resendButton.onclick=async()=>{
      resendButton.disabled=true;resendButton.textContent='Sending…';
      try{
        await window.IghoLive.api.resendPayrollPayoutOtp(run.id,payout.id);
        document.getElementById('payoutOtpInput').value='';
        document.getElementById('payoutOtpInput').focus();
        toast('New OTP sent','Paystack sent a new OTP for this salary payment.');
      }catch(error){
        toast('OTP not resent',error?.message||'Could not request a new Paystack OTP.');
      }finally{
        resendButton.disabled=false;resendButton.textContent='Resend OTP';
      }
    };
    const button=document.getElementById('m5ConfirmButton');
    button.textContent='Authorise payment';
    button.onclick=async()=>{
      const otp=document.getElementById('payoutOtpInput')?.value?.trim()||'';
      if(!/^\d{4,8}$/.test(otp)){toast('OTP required','Enter the Paystack transfer OTP.');return}
      button.disabled=true;button.textContent='Authorising…';
      try{
        const response=await window.IghoLive.api.authorisePayrollPayout(run.id,payout.id,otp);
        window.hydratePayrollDetailFromApi?.(response?.data?.payroll);
        closeModal('m5ConfirmModal');
        const updated=response?.data?.payroll;
        if(updated?.status==='SETTLED')toast('Payroll paid','The salary payment settled successfully.');
        else if((updated?.payouts||[]).some(p=>p.status==='otp'))toast('Authorisation still required','Paystack is still waiting for a valid OTP.');
        else toast('Payment authorised','Paystack accepted the OTP and the transfer is processing.');
      }catch(error){
        toast('Payment not authorised',error?.message||'Check the OTP and try again.');
      }finally{
        button.disabled=false;button.textContent='Authorise payment';
      }
    };
    openModal('m5ConfirmModal');
  };

  processPayroll=async function(){
    if(!liveAdminMode())return demoProcessPayroll?.();
    const run=currentRun();if(!run||run.rawStatus!=='APPROVED'){toast('Approval required','Approve the payroll before releasing salary payments.');return}
    const all=includedPeople();
    document.getElementById('m5ConfirmTitle').textContent='Release salary payments';
    document.getElementById('m5ConfirmSubtitle').textContent=`Paystack will send the approved ${run.period} payroll to the verified salary accounts.`;
    document.getElementById('m5ConfirmBody').innerHTML=`<div class="kv"><span>Employees</span><strong>${all.length}</strong></div><div class="kv"><span>Total to send</span><strong>${money(calcRunTotal())}</strong></div><div class="scope-note"><strong>Confirm carefully:</strong> this starts real provider transfer requests for this environment. Igho tracks each transfer and will not create a second payout record for the same payroll item.</div>`;
    const button=document.getElementById('m5ConfirmButton');button.textContent=`Pay ${all.length} employee${all.length===1?'':'s'}`;button.onclick=async()=>{button.disabled=true;button.textContent='Sending…';try{const response=await window.IghoLive.api.executePayrollPayouts(run.id);window.hydratePayrollDetailFromApi?.(response?.data?.payroll);closeModal('m5ConfirmModal');const updated=response?.data?.payroll;if(updated?.status==='SETTLED')toast('Payroll paid','All salary transfers settled successfully.');else if(updated?.status==='FAILED')toast('Payment failed','No salary transfer settled. Review the payment status before retrying.');else if((updated?.payouts||[]).some(p=>p.status==='otp')){toast('Authorisation required','Paystack requires an OTP before the salary payment can proceed.');setTimeout(()=>openPayoutOtpModal(),150)}else toast('Payments processing','Salary transfers were submitted to Paystack.')}catch(error){toast('Payments not started',error?.message||'Could not release salary payments.')}finally{button.disabled=false;button.textContent='Pay employees'}};
    openModal('m5ConfirmModal');
  };
  window.processLivePayrollPayouts=processPayroll;
  window.refreshPayouts=async function(){
    const run=currentRun();if(!liveAdminMode()||!run)return;
    try{const response=await window.IghoLive.api.refreshPayrollPayouts(run.id);window.hydratePayrollDetailFromApi?.(response?.data?.payroll);const updated=response?.data?.payroll;if(updated?.status==='SETTLED')toast('Payroll settled','All salary payments are confirmed.');else if(updated?.status==='FAILED')toast('Payment failed','The transfer did not settle.');else if(updated?.status==='PARTIALLY_PAID')toast('Payroll partly paid','Some salary payments settled and some need attention.');else if((updated?.payouts||[]).some(p=>p.status==='otp'))toast('Authorisation required','Enter the Paystack transfer OTP to continue this payment.');else toast('Payments processing','Paystack has not confirmed every transfer yet.')}catch(error){toast('Could not check payments',error?.message||'Try again in a moment.')}
  };

  openPerson=function(id){const p=state.people.find(x=>x.id===id);if(!p)return;state.currentPerson=p.id;save();closeDrawer();goPage('employee');renderEmployeePortal?.()};

  toggleInclude=async function(id){const p=state.people.find(x=>x.id===id);if(!p)return;if(liveAdminMode()&&p.payrollItemId&&currentRun()?.id){try{const response=await window.IghoLive.api.setPayrollItemIncluded(currentRun().id,p.payrollItemId,!p.included);window.hydratePayrollDetailFromApi?.(response?.data?.payroll);closeDrawer();toast('Payroll updated',`${p.name} ${!p.included?'included in':'removed from'} ${currentRun()?.period||'the payroll'}.`)}catch(error){toast('Payroll not changed',error?.message||'This payroll can no longer be changed.')}return}p.included=!p.included;log(p.included?'Added to payroll':'Removed from payroll',`${p.id} · ${p.name}`,'Johannes Oghoro','Employee');save();closeDrawer();render();toast('Payroll updated',`${p.name} ${p.included?'included in':'removed from'} October payroll.`)};
  openPayroll=async function(id){if(liveAdminMode()){try{const response=await window.IghoLive.api.payrollRun(id);window.hydratePayrollDetailFromApi?.(response?.data?.payroll);goPage('payrollrun')}catch(error){toast('Payroll unavailable',error?.message||'Could not load payroll.')}return}const r=state.payrolls.find(x=>x.id===id);openDrawer(r.period,`${r.people} people · ${money(r.net)}`,`<div class="kv"><span>Prepared</span><strong>${r.prepareDate||'—'}</strong></div><div class="kv"><span>Changes allowed until</span><strong>${r.cutoffDate||'—'}</strong></div><div class="kv"><span>Pay date</span><strong>${r.date}</strong></div><div class="kv"><span>Funding</span>${status(r.funding)}</div><div class="kv"><span>Approval</span>${status(r.approval)}</div><div class="kv"><span>Status</span>${status(r.status)}</div>`,`<div class="mini-item"><strong>Payroll prepared</strong><small>${r.prepareDate||'Automatically prepared'}</small></div>`,`<div class="mini-item"><strong>${r.id}</strong><small>Payroll reference</small></div>`,'Open payroll',()=>{closeDrawer();goPage(r.id===currentRun().id?'payrollrun':'payroll')})};

  previewPayslip=function(id){const s=state.payslips.find(x=>x.id===id),p=state.people.find(x=>x.id===s.employeeId)||state.people.find(x=>x.name===s.person),adjustments=(p?.adjustments||[]).filter(()=>false);openDrawer(`${s.person} · ${s.period}`,'Payslip',`<div class="eyebrow">${state.settings.org}</div><h2 class="document-title">Payslip</h2><div class="kv"><span>Employer</span><strong>${state.settings.org}</strong></div><div class="kv"><span>Employer contact</span><strong>${state.settings.employerEmail}</strong></div><div class="kv"><span>Employee</span><strong>${s.person}</strong></div><div class="kv"><span>Employee reference</span><strong>${p?.id||'—'}</strong></div><div class="kv"><span>Job title</span><strong>${p?.role||'—'}</strong></div><div class="kv"><span>Employment start</span><strong>${p?.startDate||'—'}</strong></div><div class="kv"><span>Payroll period</span><strong>${s.period}</strong></div><div class="kv"><span>Base salary</span><strong>${money(s.base||s.amount)}</strong></div><div class="kv"><span>Net pay</span><strong>${money(s.amount)}</strong></div><div class="kv"><span>Currency</span><strong>NGN</strong></div><div class="kv"><span>Pay date</span><strong>${s.date}</strong></div><div class="kv"><span>Payment status</span>${status('Settled')}</div><div class="kv"><span>Payment reference</span><strong>${s.paymentRef||'—'}</strong></div><div class="kv"><span>Payslip reference</span><strong>${s.id}</strong></div><div class="proof-note">Generated from Igho payroll records for ${state.settings.org}. This payslip can support basic proof-of-income and employment checks.</div>`,`<div class="mini-item"><strong>Generated</strong><small>${s.date}</small></div>`,`<div class="mini-item"><strong>${s.id}</strong><small>Document reference</small></div>`,'Download PDF',()=>toast('Payslip downloaded','Payslip export is not enabled yet.'))};

  renderSettings=function(){const s=state.settings,days=Array.from({length:31},(_,i)=>i+1);document.getElementById('settingsContent').innerHTML=`
    <section class="settings-section active" id="s-payroll"><div class="settings-section-head"><h3>Payroll</h3><p>Set when payroll is prepared, when changes close and when approval is required.</p></div><div class="settings-body">
      <div class="settings-row"><div class="settings-copy"><strong>Default payday</strong><small>Default is the 1st. Any day of the month can be selected.</small></div><div class="field"><select id="setPayday">${days.map(d=>`<option ${s.payday.startsWith(d+'st')||s.payday.startsWith(d+'nd')||s.payday.startsWith(d+'rd')||s.payday.startsWith(d+'th')?'selected':''}>${d}${d===1?'st':d===2?'nd':d===3?'rd':'th'} of each month</option>`).join('')}</select></div></div>
      <div class="settings-row"><div class="settings-copy"><strong>Automatic preparation</strong><small>Prepare payroll 7 days before payday.</small></div><div class="field"><input value="7 days before payday" readonly></div></div>
      <div class="settings-row"><div class="settings-copy"><strong>Changes allowed until</strong><small>Salary, bank and employee changes made after this point apply to the next payroll.</small></div><div class="field"><input value="7 days before payday" readonly></div></div>
      <div class="settings-row"><div class="settings-copy"><strong>Weekend / bank holiday</strong><small>Igho does not automatically move the configured payday.</small></div><div class="field"><input value="Keep configured payday" readonly></div></div>
      <div class="settings-row"><div class="settings-copy"><strong>Adjustments</strong><small>Simple bonus, reimbursement, allowance, deduction, correction or other.</small></div><div class="field"><input value="Simple adjustments" readonly></div></div>
      <div class="settings-row"><div class="settings-copy"><strong>Payroll approval</strong><small>Require approval before salary payments are released.</small></div><div class="field"><select id="setApproval"><option selected>Required</option><option>Not required</option></select></div></div>
    </div><div class="settings-save"><button class="btn primary" onclick="savePayrollSettings()">Save payroll settings</button></div></section>
    <section class="settings-section" id="s-payments"><div class="settings-section-head"><h3>Payments</h3><p>Services used to add payroll funds and send salary payments.</p></div><div class="settings-body"><div class="settings-row"><div class="settings-copy"><strong>Funding service</strong><small>Used to add money for payroll.</small></div><div class="field"><input value="${s.fundingProvider}" readonly></div></div><div class="settings-row"><div class="settings-copy"><strong>Salary payment service</strong><small>Used to send salary payments to employee bank accounts.</small></div><div class="field"><input value="${s.payoutProvider}" readonly></div></div></div></section>
    <section class="settings-section" id="s-notifications"><div class="settings-section-head"><h3>Notifications</h3><p>Choose how employees receive payroll updates.</p></div><div class="settings-body"><div class="settings-row"><div class="settings-copy"><strong>Delivery channel</strong><small>Used for employee invitations, payment updates and payslip alerts.</small></div><div class="field"><input value="Email" readonly></div></div></div></section>
    <section class="settings-section" id="s-workspace"><div class="settings-section-head"><h3>Workspace</h3><p>Details used on payroll and proof-of-income documents.</p></div><div class="settings-body"><div class="settings-row"><div class="settings-copy"><strong>Organisation name</strong></div><div class="field"><input id="setOrg" value="${s.org}"></div></div><div class="settings-row"><div class="settings-copy"><strong>Employer email</strong></div><div class="field"><input id="setEmployerEmail" value="${s.employerEmail}"></div></div><div class="settings-row"><div class="settings-copy"><strong>Employer address</strong></div><div class="field"><input id="setEmployerAddress" value="${s.employerAddress}"></div></div></div><div class="settings-save"><button class="btn primary" onclick="saveWorkspaceSettings()">Save workspace settings</button></div></section>
    <section class="settings-section" id="s-security"><div class="settings-section-head"><h3>Security</h3><p>Security controls for sensitive payroll actions.</p></div><div class="settings-body"><div class="settings-row"><div class="settings-copy"><strong>Sign-in protection</strong><small>Workspace access requires a signed-in Igho account.</small></div><div class="field"><input value="Enabled" readonly></div></div><div class="settings-row"><div class="settings-copy"><strong>Re-authentication</strong><small>Require sign-in again before sensitive payment actions.</small></div><div class="field"><select id="setReauth"><option selected>Enabled</option><option>Disabled</option></select></div></div></div></section>`;
    document.querySelectorAll('.settings-link').forEach(b=>b.onclick=()=>{document.querySelectorAll('.settings-link').forEach(x=>x.classList.remove('active'));document.querySelectorAll('.settings-section').forEach(x=>x.classList.remove('active'));b.classList.add('active');document.getElementById(b.dataset.settings).classList.add('active')});
  };

  savePayrollSettings=function(){state.settings.payday=document.getElementById('setPayday').value;state.settings.approval=document.getElementById('setApproval').value;log('Payroll settings updated','Settings','Johannes Oghoro','System');save();toast('Payroll settings saved','Payday and approval rules updated.')};
  saveWorkspaceSettings=function(){state.settings.org=document.getElementById('setOrg').value;state.settings.employerEmail=document.getElementById('setEmployerEmail').value;state.settings.employerAddress=document.getElementById('setEmployerAddress').value;save();toast('Workspace saved','Employer details updated.')};

  renderPortal=function(){
    if(document.body.classList.contains('employee-mode')&&typeof window.renderEmployeePortal==='function'){
      window.renderEmployeePortal();
      return;
    }
    const p=state.people.find(x=>x.id===state.currentPerson);
    if(!p)return;
    const subtitle=document.getElementById('employeeSubtitle');
    const portalUser=document.getElementById('portalUser');
    if(!subtitle||!portalUser)return;
    subtitle.textContent=`${p.name} · ${p.role}`;
    portalUser.innerHTML=`<strong>${p.name}</strong><small>${p.role}</small>`;
  };

  confirmFunding=function(){const run=currentRun();run.funding='Funded';run.status='Funded';state.payments.unshift({id:`FND-2026-10-${String(state.payments.filter(x=>x.type==='Funding').length+1).padStart(3,'0')}`,type:'Funding',desc:'October payroll funding',amount:calcRunTotal(),date:'30 Sep 2026',status:'Settled'});log('Payroll funded',run.id,'Paystack','Payment');save();closeModal('fundModal');render();toast('Payroll funded',`${money(calcRunTotal())} confirmed via ${window.ighoFundingMethod}.`)};
  processPayroll=function(){if(liveAdminMode()&&window.processLivePayrollPayouts)return window.processLivePayrollPayouts();const run=currentRun();if(run.approval!=='Approved'){toast('Approval required','Approve the payroll first.');return}run.status='Processing';includedPeople().forEach((p,i)=>state.payments.unshift({id:`TRF-2026-10-${String(i+1).padStart(3,'0')}`,type:'Transfer',desc:`${p.name} · October salary`,amount:employeeNet(p),date:'1 Oct 2026',status:'Processing'}));log('Payroll payment initiated',run.id,'Johannes Oghoro','Payroll');save();render();toast('Payments initiated',`${includedPeople().length} transfers are processing.`);setTimeout(settlePayroll,1800)};
  settlePayroll=function(){const run=currentRun();run.status='Settled';state.payments.filter(p=>p.id.startsWith('TRF-2026-10')).forEach(p=>p.status='Settled');includedPeople().forEach((p,i)=>{p.lastPaid='1 Oct 2026';if(!state.payslips.some(s=>s.person===p.name&&s.period==='October 2026'))state.payslips.unshift({id:`PSL-2026-10-${String(i+1).padStart(3,'0')}`,person:p.name,employeeId:p.id,period:'October 2026',base:p.pay,amount:employeeNet(p),date:'1 Oct 2026',paymentRef:`TRF-2026-10-${String(i+1).padStart(3,'0')}`,status:'Available'})});log('Payroll settled',run.id,'Paystack','Payment');save();render();toast('Payroll complete','All transfers settled and payslips were generated.')};
  createPayroll=async function(){if(liveAdminMode()){try{let period;const latest=state.payrolls[0];if(latest?.payDateRaw){const d=new Date(latest.payDateRaw+'T00:00:00Z');d.setUTCMonth(d.getUTCMonth()+1);period=`${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}`}const response=await window.IghoLive.api.preparePayroll(period);const payroll=response?.data?.payroll;if(payroll?.id){const detailResponse=await window.IghoLive.api.payrollRun(payroll.id);const runsResponse=await window.IghoLive.api.payrollRuns();window.hydratePayrollFromApi?.(runsResponse?.data?.items||[],detailResponse?.data?.payroll||null);goPage('payrollrun');toast('Payroll prepared',`${formatPeriod(payroll.periodYear,payroll.periodMonth)} payroll is ready for review.`)}}catch(error){toast('Payroll not prepared',error?.message||'Could not prepare payroll.')}return}toast('Payroll schedule','October payroll is the current prepared run. Future runs prepare 7 days before payday.')};

  const oldGoPage=goPage;goPage=function(id){
    oldGoPage(id);
    if(id==='payrollrun'){
      const run=currentRun();
      document.getElementById('breadcrumb').textContent=`The24thGroup / ${run?.period||'Payroll'}`;
    }
  };
  document.getElementById('resetBtn').onclick=()=>{if(confirm('Reset this workspace view to its starting state?')){state=makeV1State();save();render();goPage('overview');toast('Workspace reset','The payroll starting state has been restored.')}};

  function apiEmployeeToState(employee){
    const bank=employee.bankAccount||{};
    return {
      id:employee.id,
      name:employee.fullName,
      role:employee.jobTitle,
      email:employee.email,
      pay:Number(employee.monthlyPayAmount||0),
      startDate:employee.employmentStartDate||"—",
      bank:bank.bankName||"",
      account:bank.accountNumberLast4||"",
      bankStatus:bank.verificationStatus==="verified"?"Verified":bank.verificationStatus==="pending"?"Pending":"Action required",
      status:employee.status==="inactive"?"Inactive":"Active",
      lastPaid:"—",
      included:employee.status==="active",
      adjustments:[]
    };
  }

  window.hydratePeopleFromApi=function(items){
    if(!Array.isArray(items))return;
    state.people=items.map(apiEmployeeToState);
    if(liveAdminMode()){
      // Live mode must never leak seeded/demo payslips into the real workspace.
      // Real payslips will be hydrated from the backend once M6 is available.
      state.payslips=[];
    }
    if(state.people.length&&!state.people.some(p=>p.id===state.currentPerson))state.currentPerson=state.people[0].id;
    save();
    render();
  };

  window.hydrateEmployeeFromApi=function(employee){
    if(!employee)return;
    const mapped=apiEmployeeToState(employee);
    state.people=[mapped];
    state.currentPerson=mapped.id;
    save();
    render();
  };

  window.hydratePayrollDetailFromApi=function(detail){
    if(!detail)return;
    const mappedRun=apiRunToState(detail);
    mappedRun.fundingAttempt=detail.funding||null;
    mappedRun.payouts=detail.payouts||[];
    const existingIndex=state.payrolls.findIndex(r=>r.id===mappedRun.id);
    if(existingIndex>=0)state.payrolls[existingIndex]=mappedRun;else state.payrolls.unshift(mappedRun);
    state.currentPayrollId=mappedRun.id;
    const byEmployee=new Map((detail.items||[]).map(item=>[item.employeeId,item]));
    const payoutByEmployee=new Map((detail.payouts||[]).map(payout=>[payout.employeeId,payout]));
    state.people=state.people.map(p=>{const item=byEmployee.get(p.id),payout=payoutByEmployee.get(p.id);if(!item)return {...p,included:false,payrollItemId:null,adjustments:[],payoutStatus:null,payoutReference:null};return {...p,pay:Number(item.basePay||p.pay),included:Boolean(item.included),payrollItemId:item.id,bank:item.bankName||p.bank,account:item.accountNumberLast4||p.account,bankStatus:item.bankVerificationStatus==='verified'?'Verified':item.bankVerificationStatus==='pending'?'Pending':'Action required',adjustments:(item.adjustments||[]).map(a=>({id:a.id,type:titleStatus(a.type),amount:Number(a.amount),reason:a.reason,createdAt:a.createdAt})),readinessStatus:item.readinessStatus,readinessReason:item.readinessReason,payoutStatus:payout?.status||null,payoutReference:payout?.providerReference||null}});
    if(liveAdminMode())state.payments=(detail.payouts||[]).map(payout=>({id:payout.providerReference,type:'Transfer',desc:`${payout.employeeName} · ${mappedRun.period} salary`,amount:Number(payout.amount||0),date:payout.initiatedAt?new Date(payout.initiatedAt).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'—',status:payout.status==='success'?'Settled':payout.status==='otp'?'Authorisation required':payout.status==='pending'?'Processing':payout.status==='queued'?'Queued':payout.status==='reversed'?'Reversed':'Failed'}));
    save();render();
  };

  window.hydratePayrollFromApi=function(runs,detail){
    if(!Array.isArray(runs))return;
    state.payrolls=runs.map(apiRunToState);
    if(detail){window.hydratePayrollDetailFromApi(detail);return}
    state.currentPayrollId=state.payrolls[0]?.id||null;
    save();render();
  };

  window.showEmployeeProfileUnavailable=function(){
    state.people=[];
    state.currentPerson=null;
    save();
    const portal=document.getElementById('employeePortalContent');
    if(portal){
      portal.innerHTML='<div class="employee-page-eyebrow">Employee portal</div><h1 class="employee-page-title">Profile not linked</h1><p class="employee-page-sub">This signed-in account has employee access, but it is not linked to an employee payroll record yet.</p>';
    }
  };

  render();
})();
