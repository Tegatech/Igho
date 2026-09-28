(function(){
  const portalPage=document.getElementById('employee');
  if(!portalPage)return;


  function initials(name){return name.split(/\s+/).map(x=>x[0]).slice(0,2).join('').toUpperCase()}
  function adjTotal(p){return (p.adjustments||[]).reduce((s,a)=>s+a.amount,0)}
  function empNet(p){return p.pay+adjTotal(p)}
  function slipsFor(p){return state.payslips.filter(s=>s.employeeId===p.id||s.person===p.name)}
  function currentEmployee(){return state.people.find(p=>p.id===state.currentPerson)||null}

  portalPage.innerHTML=`
    <div class="employee-portal-shell">
      <header class="employee-portal-top">
        <div class="employee-brand"><img src="assets/igho-icon.svg" alt="" class="employee-brand-mark"><img src="assets/igho-wordmark.png" alt="Igho" class="employee-brand-wordmark"><small>Employee portal</small></div>
        <div class="employee-top-actions"><div class="employee-top-user" id="employeeTopUser"></div><button class="btn secondary employee-admin-return" onclick="goPage('people')">Back to payroll</button></div>
      </header>
      <div class="employee-portal-layout">
        <aside class="employee-portal-nav" id="employeePortalNav"></aside>
        <main class="employee-content">
          <div class="employee-mobile-tabs" id="employeeMobileTabs"></div>
          <div id="employeePortalContent"></div>
        </main>
      </div>
    </div>`;

  const tabs=[['pay','My pay'],['bank','Bank account'],['slips','Payslips'],['profile','Profile']];
  let activeTab='pay';

  function renderNav(){
    const p=currentEmployee();
    const nav=`<div class="employee-identity"><div class="employee-avatar">${initials(p.name)}</div><strong>${p.name}</strong><span>${p.role}</span></div>`+tabs.map(([id,label])=>`<button class="employee-nav-link ${activeTab===id?'active':''}" data-employee-tab="${id}">${label}</button>`).join('');
    document.getElementById('employeePortalNav').innerHTML=nav;
    document.getElementById('employeeMobileTabs').innerHTML=tabs.map(([id,label])=>`<button class="employee-nav-link ${activeTab===id?'active':''}" data-employee-tab="${id}">${label}</button>`).join('');
    document.querySelectorAll('[data-employee-tab]').forEach(btn=>btn.onclick=()=>{activeTab=btn.dataset.employeeTab;renderEmployeePortal()});
  }

  function payView(p){
    const live=window.IghoEmployeeLiveData?.pay;
    if(document.body.classList.contains('employee-mode')){
      const payroll=live?.status==='available'?live.payroll:null;
      if(!payroll){
        return `<div class="employee-page-eyebrow">My pay</div><h1 class="employee-page-title">No upcoming payroll yet</h1><p class="employee-page-sub">Your salary information is ready, but no payroll run has been prepared for you yet.</p><section class="employee-card"><div class="employee-card-head"><div><h3>What happens next</h3><p>When your employer prepares the next payroll, your pay date, amount and readiness will appear here automatically.</p></div></div><div class="employee-kv"><span>Monthly salary</span><strong>${money(p.pay)}</strong></div><div class="employee-kv"><span>Bank details</span><strong>${p.bankStatus}</strong></div></section>`;
      }
      const period=new Intl.DateTimeFormat('en-GB',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(payroll.periodYear,payroll.periodMonth-1,1)));
      const payDate=new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(payroll.payDate+'T00:00:00Z'));
      const cutoffDate=new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(payroll.cutoffDate+'T00:00:00Z'));
      const readiness=payroll.readinessStatus==='ready'?'Ready':payroll.readinessStatus==='excluded'?'Not included':'Action required';
      return `<div class="employee-page-eyebrow">My pay</div><h1 class="employee-page-title">Your next pay</h1><p class="employee-page-sub">Live payroll information for your upcoming salary payment.</p>
        <section class="employee-hero"><div class="employee-hero-label">Expected net pay</div><div class="employee-hero-amount">${money(payroll.netPay)}</div><div class="employee-hero-meta"><div><span>Pay date</span><strong>${payDate}</strong></div><div><span>Pay period</span><strong>${period}</strong></div><div><span>Status</span><strong>${readiness}</strong></div></div></section>
        <div class="employee-grid">
          <section class="employee-card"><div class="employee-card-head"><div><h3>Pay breakdown</h3><p>Snapshot for this payroll run.</p></div></div><div class="employee-kv"><span>Base salary</span><strong>${money(payroll.basePay)}</strong></div><div class="employee-kv"><span>Adjustments</span><strong>${money(payroll.adjustmentTotal)}</strong></div><div class="employee-kv"><span>Expected net</span><strong class="employee-net">${money(payroll.netPay)}</strong></div></section>
          <section class="employee-card"><div class="employee-card-head"><div><h3>Payroll readiness</h3><p>Your information for this run.</p></div></div><div class="employee-kv"><span>Payroll</span><strong>${payroll.included?'Included':'Not included'}</strong></div><div class="employee-kv"><span>Bank details</span><strong>${p.bankStatus}</strong></div><div class="employee-kv"><span>Change cutoff</span><strong>${cutoffDate}</strong></div>${payroll.readinessReason?`<div class="employee-notice">${payroll.readinessReason}</div>`:''}</section>
        </div>`;
    }

    const run=currentRun(),adjs=p.adjustments||[],net=empNet(p);
    return `<div class="employee-page-eyebrow">My pay</div><h1 class="employee-page-title">Your next pay</h1><p class="employee-page-sub">A simple view of what you are due and when it is scheduled.</p>
      <section class="employee-hero"><div class="employee-hero-label">Expected net pay</div><div class="employee-hero-amount">${money(net)}</div><div class="employee-hero-meta"><div><span>Pay date</span><strong>${run.date}</strong></div><div><span>Pay period</span><strong>${run.period}</strong></div><div><span>Status</span><strong>${p.included&&p.bankStatus==='Verified'?'Scheduled':'Action required'}</strong></div></div></section>
      <div class="employee-grid">
        <section class="employee-card"><div class="employee-card-head"><div><h3>Pay breakdown</h3><p>What makes up this payroll amount.</p></div></div><div class="employee-kv"><span>Base salary</span><strong>${money(p.pay)}</strong></div>${adjs.map(a=>`<div class="employee-kv"><span>${a.type}${a.reason?' · '+a.reason:''}</span><strong class="${a.amount>=0?'employee-positive':'employee-negative'}">${a.amount>=0?'+':''}${money(a.amount)}</strong></div>`).join('')}<div class="employee-kv"><span>Expected net</span><strong class="employee-net">${money(net)}</strong></div></section>
        <section class="employee-card"><div class="employee-card-head"><div><h3>Payroll readiness</h3><p>Your information for the upcoming run.</p></div></div><div class="employee-kv"><span>Payroll</span><strong>${p.included?'Included':'Not included'}</strong></div><div class="employee-kv"><span>Bank details</span><strong>${p.bankStatus}</strong></div><div class="employee-kv"><span>Change cutoff</span><strong>${run.cutoffDate}</strong></div>${p.bankStatus!=='Verified'?`<div class="employee-notice">Your bank details need attention before this payroll can be paid.</div>`:''}</section>
      </div>`;
  }

  function bankView(p){return `<div class="employee-page-eyebrow">Bank account</div><h1 class="employee-page-title">Where you get paid</h1><p class="employee-page-sub">Keep your salary account current. Changes after payroll cutoff apply to the next run.</p><section class="employee-card"><div class="employee-card-head"><div><h3>Primary salary account</h3><p>Used for payroll transfers.</p></div><span class="employee-status ${p.bankStatus==='Verified'?'':'attention'}">${p.bankStatus}</span></div><div class="employee-kv"><span>Bank</span><strong>${p.bank||'Not added'}</strong></div><div class="employee-kv"><span>Account</span><strong>${p.account?'•••• '+p.account:'—'}</strong></div><div class="employee-kv"><span>Account holder</span><strong>${p.bankStatus==='Verified'?p.name:'—'}</strong></div><div class="employee-action-gap"><button class="btn primary" onclick="startBankUpdate('${p.id}')">${p.bank?'Update bank account':'Add bank account'}</button></div><div class="employee-notice">Bank changes are re-verified before they can be used for salary payments. Changes made after the current cutoff are applied to the next payroll.</div></section>`}

  function slipsView(p){
    const liveItems=document.body.classList.contains('employee-mode')?(window.IghoEmployeeLiveData?.payslips?.items||[]):null;
    const slips=liveItems??slipsFor(p);
    return `<div class="employee-page-eyebrow">Payslips</div><h1 class="employee-page-title">Your pay records</h1><p class="employee-page-sub">Simple salary records you can keep or use as supporting proof of income and employment.</p><section class="employee-card"><div class="employee-card-head"><div><h3>Payslip history</h3><p>${slips.length} document${slips.length===1?'':'s'} available.</p></div></div>${slips.length?slips.map(s=>`<div class="employee-slip"><div><strong>${s.period||s.periodLabel}</strong><span>${s.id||s.reference} · Paid ${s.date||s.payDate}</span></div><div class="employee-slip-amount">${money(s.amount||s.netPay)}</div><button class="btn secondary" onclick="previewPayslip('${s.id}')">View payslip</button></div>`).join(''):`<div class="employee-proof">No payslips are available yet. Your first payslip will appear here after a successful salary payment.</div>`}<div class="employee-proof">Payslips will include your payroll period, pay values, payment date and document reference.</div></section>`}

  function profileView(p){return `<div class="employee-page-eyebrow">Profile</div><h1 class="employee-page-title">Employment details</h1><p class="employee-page-sub">The basic employment information attached to your payroll record.</p><section class="employee-card"><div class="employee-profile-row"><span>Full name</span><strong>${p.name}</strong></div><div class="employee-profile-row"><span>Employee reference</span><strong>${p.id}</strong></div><div class="employee-profile-row"><span>Job title</span><strong>${p.role}</strong></div><div class="employee-profile-row"><span>Email</span><strong>${p.email}</strong></div><div class="employee-profile-row"><span>Employment start date</span><strong>${p.startDate||'—'}</strong></div><div class="employee-profile-row"><span>Employment status</span><strong>${p.status}</strong></div><div class="employee-profile-row"><span>Employer</span><strong>${state.settings.org}</strong></div><div class="employee-proof">These details are used for payroll and pay records.</div></section>`}

  window.renderEmployeePortal=function(){
    const p=currentEmployee();
    if(!p){
      document.getElementById('employeeTopUser').innerHTML='';
      document.getElementById('employeePortalNav').innerHTML='';
      document.getElementById('employeeMobileTabs').innerHTML='';
      document.getElementById('employeePortalContent').innerHTML='<div class="employee-page-eyebrow">Employee portal</div><h1 class="employee-page-title">Profile not linked</h1><p class="employee-page-sub">This account is signed in, but no employee payroll record is linked to it yet.</p>';
      return;
    }
    document.getElementById('employeeTopUser').innerHTML=`<strong>${p.name}</strong><span>${p.id}</span>`;
    renderNav();
    const content=document.getElementById('employeePortalContent');
    content.innerHTML=activeTab==='bank'?bankView(p):activeTab==='slips'?slipsView(p):activeTab==='profile'?profileView(p):payView(p);
  };

  renderPortal=renderEmployeePortal;

  const topActions=document.querySelector('.top-actions');
  if(topActions && !document.getElementById('employeePortalLink')){
    const button=document.createElement('button');
    button.id='employeePortalLink';button.className='btn secondary';button.textContent='Employee portal';
    button.onclick=()=>{
      const selected=currentEmployee();
      if(!selected){toast('Choose an employee','Open People and select an employee to preview their portal.');goPage('people');return}
      goPage('employee');
    };
    topActions.insertBefore(button,topActions.firstChild);
  }

  renderEmployeePortal();
})();
