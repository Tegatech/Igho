(function(){
  const portalPage=document.getElementById('employee');
  if(!portalPage)return;

  const style=document.createElement('style');
  style.textContent=`
    #employee{padding:0!important;background:#f5f2ea;min-height:100%}
    .employee-portal-shell{min-height:100%;background:#f5f2ea;color:var(--navy)}
    .employee-portal-top{height:68px;background:#fff;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;padding:0 28px;position:sticky;top:0;z-index:4}
    .employee-brand{display:flex;align-items:center;gap:10px;font-weight:800;font-size:17px;letter-spacing:-.02em}.employee-brand img{width:24px;height:24px}.employee-brand small{font-size:10px;font-weight:600;color:var(--muted);letter-spacing:.05em;text-transform:uppercase;border-left:1px solid var(--line);padding-left:10px}
    .employee-top-actions{display:flex;align-items:center;gap:10px}.employee-top-user{text-align:right}.employee-top-user strong{display:block;font-size:12px}.employee-top-user span{display:block;font-size:10px;color:var(--muted);margin-top:2px}
    .employee-portal-layout{display:grid;grid-template-columns:210px minmax(0,760px);gap:42px;max-width:1080px;margin:0 auto;padding:38px 28px 64px}
    .employee-portal-nav{position:sticky;top:106px;align-self:start}.employee-identity{padding-bottom:22px;margin-bottom:14px;border-bottom:1px solid var(--line)}.employee-avatar{width:42px;height:42px;border-radius:50%;background:var(--navy);color:#fff;display:grid;place-items:center;font-weight:800;font-size:14px;margin-bottom:12px}.employee-identity strong{display:block;font-size:14px}.employee-identity span{display:block;color:var(--muted);font-size:11px;margin-top:4px}
    .employee-nav-link{width:100%;border:0;background:transparent;text-align:left;padding:10px 8px;border-radius:6px;color:var(--muted);font:inherit;font-size:12px;font-weight:650;cursor:pointer;margin-bottom:2px}.employee-nav-link:hover{background:#fff}.employee-nav-link.active{background:#fff;color:var(--navy);box-shadow:0 1px 0 rgba(8,24,43,.04)}
    .employee-content{min-width:0}.employee-page-eyebrow{font-size:10px;text-transform:uppercase;letter-spacing:.12em;color:var(--muted);font-weight:700}.employee-page-title{font-size:28px;line-height:1.08;letter-spacing:-.035em;margin:8px 0 6px}.employee-page-sub{color:var(--muted);font-size:12px;line-height:1.6;margin:0 0 24px}
    .employee-hero{background:var(--navy);color:#fff;padding:26px 28px;border-radius:8px;margin-bottom:18px}.employee-hero-label{font-size:10px;text-transform:uppercase;letter-spacing:.11em;color:rgba(255,255,255,.62);font-weight:700}.employee-hero-amount{font-size:38px;letter-spacing:-.04em;font-weight:780;margin:8px 0 12px}.employee-hero-meta{display:flex;gap:22px;flex-wrap:wrap}.employee-hero-meta div span{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.09em;color:rgba(255,255,255,.55);margin-bottom:3px}.employee-hero-meta div strong{font-size:11px}
    .employee-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.employee-card{background:#fff;border:1px solid var(--line);border-radius:8px;padding:18px}.employee-card.full{grid-column:1/-1}.employee-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:14px}.employee-card h3{font-size:13px;margin:0}.employee-card p{font-size:10.5px;color:var(--muted);line-height:1.55;margin:4px 0 0}.employee-kv{display:flex;justify-content:space-between;gap:18px;padding:10px 0;border-bottom:1px solid var(--line);font-size:11px}.employee-kv:last-child{border-bottom:0}.employee-kv span{color:var(--muted)}.employee-kv strong{text-align:right}.employee-net{font-size:15px!important}.employee-positive{color:var(--green)}.employee-negative{color:var(--red)}
    .employee-status{display:inline-flex;align-items:center;gap:6px;font-size:9px;font-weight:750;text-transform:uppercase;letter-spacing:.05em}.employee-status:before{content:'';width:6px;height:6px;border-radius:50%;background:var(--green)}.employee-status.attention:before{background:var(--amber)}
    .employee-slip{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:18px;align-items:center;padding:14px 0;border-bottom:1px solid var(--line)}.employee-slip:last-child{border-bottom:0}.employee-slip strong{font-size:11.5px}.employee-slip span{display:block;font-size:10px;color:var(--muted);margin-top:3px}.employee-slip-amount{font-size:12px;font-weight:750}.employee-slip button{white-space:nowrap}
    .employee-notice{padding:12px 14px;border:1px solid #ead9ae;background:#fffaf0;border-radius:6px;font-size:10.5px;line-height:1.55;color:#6a5521;margin-top:14px}.employee-proof{font-size:10.5px;line-height:1.6;color:var(--muted);padding-top:12px;margin-top:12px;border-top:1px solid var(--line)}
    .employee-profile-row{display:grid;grid-template-columns:150px 1fr;padding:11px 0;border-bottom:1px solid var(--line);font-size:11px}.employee-profile-row span{color:var(--muted)}
    .employee-mobile-tabs{display:none}
    @media(max-width:760px){
      .employee-portal-top{padding:0 16px;height:60px}.employee-brand small,.employee-top-user{display:none}.employee-portal-layout{display:block;padding:22px 16px 40px}.employee-portal-nav{display:none}.employee-mobile-tabs{display:flex;overflow-x:auto;gap:6px;margin:0 -16px 22px;padding:0 16px 4px}.employee-mobile-tabs .employee-nav-link{width:auto;white-space:nowrap;background:#fff;border:1px solid var(--line);padding:9px 12px}.employee-mobile-tabs .employee-nav-link.active{background:var(--navy);color:#fff;border-color:var(--navy)}.employee-page-title{font-size:24px}.employee-grid{grid-template-columns:1fr}.employee-card.full{grid-column:auto}.employee-hero{padding:22px 20px}.employee-hero-amount{font-size:32px}.employee-slip{grid-template-columns:1fr auto}.employee-slip button{grid-column:1/-1;width:100%}.employee-profile-row{grid-template-columns:1fr;gap:4px}}
  `;
  document.head.appendChild(style);

  function initials(name){return name.split(/\s+/).map(x=>x[0]).slice(0,2).join('').toUpperCase()}
  function adjTotal(p){return (p.adjustments||[]).reduce((s,a)=>s+a.amount,0)}
  function empNet(p){return p.pay+adjTotal(p)}
  function slipsFor(p){return state.payslips.filter(s=>s.employeeId===p.id||s.person===p.name)}
  function currentEmployee(){return state.people.find(p=>p.id===state.currentPerson)||state.people[0]}

  portalPage.innerHTML=`
    <div class="employee-portal-shell">
      <header class="employee-portal-top">
        <div class="employee-brand"><img src="assets/igho-icon.svg" alt=""><span>Igho</span><small>Employee portal</small></div>
        <div class="employee-top-actions"><div class="employee-top-user" id="employeeTopUser"></div><button class="btn secondary" onclick="goPage('people')">Admin demo</button></div>
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
    const run=currentRun(),adjs=p.adjustments||[],net=empNet(p);
    return `<div class="employee-page-eyebrow">My pay</div><h1 class="employee-page-title">Your next pay</h1><p class="employee-page-sub">A simple view of what you are due and when it is scheduled.</p>
      <section class="employee-hero"><div class="employee-hero-label">Expected net pay</div><div class="employee-hero-amount">${money(net)}</div><div class="employee-hero-meta"><div><span>Pay date</span><strong>${run.date}</strong></div><div><span>Pay period</span><strong>${run.period}</strong></div><div><span>Status</span><strong>${p.included&&p.bankStatus==='Verified'?'Scheduled':'Action required'}</strong></div></div></section>
      <div class="employee-grid">
        <section class="employee-card"><div class="employee-card-head"><div><h3>Pay breakdown</h3><p>What makes up this payroll amount.</p></div></div><div class="employee-kv"><span>Base salary</span><strong>${money(p.pay)}</strong></div>${adjs.map(a=>`<div class="employee-kv"><span>${a.type}${a.reason?' · '+a.reason:''}</span><strong class="${a.amount>=0?'employee-positive':'employee-negative'}">${a.amount>=0?'+':''}${money(a.amount)}</strong></div>`).join('')}<div class="employee-kv"><span>Expected net</span><strong class="employee-net">${money(net)}</strong></div></section>
        <section class="employee-card"><div class="employee-card-head"><div><h3>Payroll readiness</h3><p>Your information for the upcoming run.</p></div></div><div class="employee-kv"><span>Payroll</span><strong>${p.included?'Included':'Not included'}</strong></div><div class="employee-kv"><span>Bank details</span><strong>${p.bankStatus}</strong></div><div class="employee-kv"><span>Change cutoff</span><strong>${run.cutoffDate}</strong></div>${p.bankStatus!=='Verified'?`<div class="employee-notice">Your bank details need attention before this payroll can be paid.</div>`:''}</section>
        <section class="employee-card full"><div class="employee-card-head"><div><h3>Last payment</h3><p>Your most recent completed salary payment.</p></div></div><div class="employee-kv"><span>Amount</span><strong>${p.lastPaid==='—'?'No payment yet':money(p.pay)}</strong></div><div class="employee-kv"><span>Date</span><strong>${p.lastPaid||'—'}</strong></div></section>
      </div>`;
  }

  function bankView(p){return `<div class="employee-page-eyebrow">Bank account</div><h1 class="employee-page-title">Where you get paid</h1><p class="employee-page-sub">Keep your salary account current. Changes after payroll cutoff apply to the next run.</p><section class="employee-card"><div class="employee-card-head"><div><h3>Primary salary account</h3><p>Used for payroll transfers.</p></div><span class="employee-status ${p.bankStatus==='Verified'?'':'attention'}">${p.bankStatus}</span></div><div class="employee-kv"><span>Bank</span><strong>${p.bank||'Not added'}</strong></div><div class="employee-kv"><span>Account</span><strong>${p.account?'•••• '+p.account:'—'}</strong></div><div class="employee-kv"><span>Account holder</span><strong>${p.bankStatus==='Verified'?p.name:'—'}</strong></div><div style="margin-top:16px"><button class="btn primary" onclick="startBankUpdate('${p.id}')">${p.bank?'Update bank account':'Add bank account'}</button></div><div class="employee-notice">Bank changes are re-verified before they can be used for salary payments. Changes made after the current cutoff are applied to the next payroll.</div></section>`}

  function slipsView(p){const slips=slipsFor(p);return `<div class="employee-page-eyebrow">Payslips</div><h1 class="employee-page-title">Your pay records</h1><p class="employee-page-sub">Simple salary records you can keep or use as supporting proof of income and employment.</p><section class="employee-card"><div class="employee-card-head"><div><h3>Payslip history</h3><p>${slips.length} document${slips.length===1?'':'s'} available.</p></div></div>${slips.length?slips.map(s=>`<div class="employee-slip"><div><strong>${s.period}</strong><span>${s.id} · Paid ${s.date}</span></div><div class="employee-slip-amount">${money(s.amount)}</div><button class="btn secondary" onclick="previewPayslip('${s.id}')">View payslip</button></div>`).join(''):`<div class="employee-proof">No payslips are available yet. A payslip is generated after a successful salary payment.</div>`}<div class="employee-proof">Payslips show The24thGroup employer details, your employee reference, job title, employment start date, salary period, base pay, adjustments, net pay, payment date and payment reference.</div></section>`}

  function profileView(p){return `<div class="employee-page-eyebrow">Profile</div><h1 class="employee-page-title">Employment details</h1><p class="employee-page-sub">The basic employment information attached to your payroll record.</p><section class="employee-card"><div class="employee-profile-row"><span>Full name</span><strong>${p.name}</strong></div><div class="employee-profile-row"><span>Employee reference</span><strong>${p.id}</strong></div><div class="employee-profile-row"><span>Job title</span><strong>${p.role}</strong></div><div class="employee-profile-row"><span>Email</span><strong>${p.email}</strong></div><div class="employee-profile-row"><span>Employment start date</span><strong>${p.startDate||'—'}</strong></div><div class="employee-profile-row"><span>Employment status</span><strong>${p.status}</strong></div><div class="employee-profile-row"><span>Employer</span><strong>${state.settings.org}</strong></div><div class="employee-proof">For V1 these are payroll-facing employment details only. Igho is not an HR system.</div></section>`}

  window.renderEmployeePortal=function(){
    const p=currentEmployee();
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
    button.onclick=()=>{state.currentPerson=state.people[0]?.id;save();goPage('employee')};
    topActions.insertBefore(button,topActions.firstChild);
  }

  renderEmployeePortal();
})();
