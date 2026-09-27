function openDrawer(title,subtitle,summary,history,audit,primary,action){document.getElementById("drawerTitle").textContent=title;document.getElementById("drawerSubtitle").textContent=subtitle;document.getElementById("d-summary").innerHTML=summary;document.getElementById("d-history").innerHTML=history;document.getElementById("d-audit").innerHTML=audit;document.getElementById("drawerPrimary").textContent=primary;document.getElementById("drawerPrimary").onclick=action||(()=>{});document.getElementById("drawerWrap").classList.add("open")}
function closeDrawer(){document.getElementById("drawerWrap").classList.remove("open")}
document.getElementById("drawerWrap").onclick=e=>{if(e.target.id==="drawerWrap")closeDrawer()};
document.querySelectorAll(".drawer-tab").forEach(t=>t.onclick=()=>{document.querySelectorAll(".drawer-tab").forEach(x=>x.classList.remove("active"));document.querySelectorAll(".drawer-section").forEach(x=>x.classList.remove("active"));t.classList.add("active");document.getElementById("d-"+t.dataset.tab).classList.add("active")});
function openPerson(id){const p=state.people.find(x=>x.id===id);if(!p)return;openDrawer(p.name,`${p.role} · ${p.status}`,`<div class="kv"><span>Email</span><strong>${p.email}</strong></div><div class="kv"><span>Monthly pay</span><strong>${money(p.pay)}</strong></div><div class="kv"><span>Bank</span>${status(p.bankStatus)}</div><div class="kv"><span>Payroll</span>${status(p.included?"Included":"Not included")}</div><div class="drawer-inline-actions"><button class="btn secondary" onclick="startBankUpdate('${p.id}')">Update bank</button><button class="btn secondary" onclick="toggleInclude('${p.id}')">${p.included?"Remove from payroll":"Include in payroll"}</button></div>`,`<div class="mini-list"><div class="mini-item"><strong>July 2026 · ${money(p.pay)}</strong><small>Settled · 27 Jul 2026</small></div></div>`,`<div class="mini-list"><div class="mini-item"><strong>${p.bankStatus==="Verified"?"Bank verified":"Bank action required"}</strong><small>Current account state</small></div></div>`,"Preview employee portal",()=>{state.currentPerson=p.id;save();closeDrawer();goPage("employee")})}
function toggleInclude(id){const p=state.people.find(x=>x.id===id);p.included=!p.included;log(p.included?"Added to payroll":"Removed from payroll",`${p.id} · ${p.name}`,"Johannes Oghoro","Employee");save();closeDrawer();render();toast("Payroll updated",`${p.name} ${p.included?"included in":"removed from"} August payroll.`)}
function openPayroll(id){const r=state.payrolls.find(x=>x.id===id);openDrawer(r.period,`${r.people} people · ${money(r.net)}`,`<div class="kv"><span>Pay date</span><strong>${r.date}</strong></div><div class="kv"><span>Funding</span>${status(r.funding)}</div><div class="kv"><span>Approval</span>${status(r.approval)}</div><div class="kv"><span>Status</span>${status(r.status)}</div>`,`<div class="mini-item"><strong>Payroll prepared</strong><small>Scheduler</small></div>`,`<div class="mini-item"><strong>${r.id}</strong><small>Immutable payroll reference</small></div>`,"Open payroll",()=>{closeDrawer();goPage(r.id==="PR-2026-08-001"?"payrollrun":"payroll")})}
function openPayment(id){const p=state.payments.find(x=>x.id===id);openDrawer(p.id,`${p.type} · ${p.status}`,`<div class="kv"><span>Description</span><strong>${p.desc}</strong></div><div class="kv"><span>Amount</span><strong>${money(p.amount)}</strong></div><div class="kv"><span>Date</span><strong>${p.date}</strong></div><div class="kv"><span>Status</span>${status(p.status)}</div><div class="kv"><span>Provider</span><strong>Paystack</strong></div>`,`<div class="mini-item"><strong>Provider event</strong><small>${p.status}</small></div>`,`<div class="mini-item"><strong>Audit record</strong><small>${p.id}</small></div>`,"Close",closeDrawer)}
function previewPayslip(id){const s=state.payslips.find(x=>x.id===id);openDrawer(`${s.person} · ${s.period}`,"Payslip",`<div class="eyebrow">The24thGroup</div><h2 class="document-title">Payslip</h2><div class="kv"><span>Employee</span><strong>${s.person}</strong></div><div class="kv"><span>Net pay</span><strong>${money(s.amount)}</strong></div><div class="kv"><span>Period</span><strong>${s.period}</strong></div><div class="kv"><span>Status</span>${status(s.status)}</div>`,`<div class="mini-item"><strong>Generated</strong><small>${s.date}</small></div>`,`<div class="mini-item"><strong>${s.id}</strong><small>Document reference</small></div>`,"Download PDF",()=>toast("Payslip ready","Payslip export is not enabled yet."))}
async function startBankUpdate(id){
  const p=state.people.find(x=>x.id===id);
  if(!p)return;
  state.currentPerson=id;
  document.getElementById("resolvedName").value=p.bankStatus==="Verified"?p.name:"";
  document.getElementById("accountNumber").value="";
  closeDrawer();
  openModal("bankModal");

  const roles=window.IghoLive?.me?.roles||[];
  if(!roles.includes("EMPLOYEE"))return;

  const select=document.getElementById("bankName");
  select.disabled=true;
  select.innerHTML='<option value="">Loading banks…</option>';
  try{
    const response=await window.IghoLive.api.banks();
    const items=response?.data?.items||[];
    select.innerHTML='<option value="">Select bank</option>'+items.map(bank=>`<option value="${bank.code}">${bank.name}</option>`).join("");
  }catch(error){
    select.innerHTML='<option value="">Could not load banks</option>';
    toast("Could not load banks",error?.message||"Try again in a moment.");
  }finally{
    select.disabled=false;
  }
}
document.getElementById("bankConfirm").onclick=async()=>{
  const p=state.people.find(x=>x.id===state.currentPerson);
  const acct=document.getElementById("accountNumber").value.trim();
  const bankSelect=document.getElementById("bankName");
  if(!p)return;
  if(!/^\d{10}$/.test(acct)){toast("Check account number","Enter a valid 10-digit account number.");return}

  const roles=window.IghoLive?.me?.roles||[];
  if(roles.includes("EMPLOYEE")){
    const bankCode=bankSelect.value;
    if(!bankCode){toast("Choose your bank","Select the bank for this account.");return}
    const button=document.getElementById("bankConfirm");
    button.disabled=true;
    button.textContent="Verifying…";
    try{
      const result=await window.IghoLive.api.saveMyBankAccount(bankCode,acct);
      const bank=result?.data?.bank_account;
      if(!bank)throw new Error("Igho could not read the verified account.");
      document.getElementById("resolvedName").value=bank.account_name||"";
      const profile=await window.IghoLive.api.myProfile();
      window.hydrateEmployeeFromApi?.(profile?.data);
      closeModal("bankModal");
      toast("Bank account verified","Your salary account is ready for payroll.");
    }catch(error){
      toast("Bank verification failed",error?.message||"Check the details and try again.");
    }finally{
      button.disabled=false;
      button.textContent="Verify & save";
    }
    return;
  }

  p.bank=bankSelect.options[bankSelect.selectedIndex]?.text||bankSelect.value;
  p.account=acct.slice(-4);
  p.bankStatus="Verified";
  log("Bank account verified",`${p.id} · ${p.name}`,"System","Bank account");
  save();
  closeModal("bankModal");
  render();
  toast("Bank account verified",`${p.name} is now ready for payroll.`);
}
window.preparePersonModal=function(){
  document.getElementById("personModalTitle").textContent="Add person";
  document.getElementById("personInviteFields").hidden=false;
  document.getElementById("inviteResult").hidden=true;
  ["newName","newEmail","newRole","newPay"].forEach((id)=>{const el=document.getElementById(id);if(el)el.value=""});
  const button=document.getElementById("addPersonConfirm");
  button.disabled=false;
  button.textContent="Add & invite";
  button.onclick=submitPersonInvitation;
};

async function copyInviteLink(){
  const input=document.getElementById("inviteLink");
  try{
    await navigator.clipboard.writeText(input.value);
    toast("Invite link copied","Open it in another browser or device to test employee acceptance.");
  }catch{
    input.focus();
    input.select();
    toast("Copy the invite link","The secure invitation link is selected.");
  }
}
document.getElementById("copyInviteLink").onclick=copyInviteLink;

async function submitPersonInvitation(){
  const name=document.getElementById("newName").value.trim();
  const email=document.getElementById("newEmail").value.trim().toLowerCase();
  const role=document.getElementById("newRole").value.trim();
  const pay=parseInt(document.getElementById("newPay").value.replace(/\D/g,""),10);
  if(!name||!email||!role||!pay){toast("Complete all fields","Name, email, role and monthly pay are required.");return}

  const button=document.getElementById("addPersonConfirm");
  button.disabled=true;
  button.textContent="Creating invite…";

  try{
    if(!window.IghoLive?.api){
      throw new Error("Live workspace connection is required to create an invitation.");
    }

    const result=await window.IghoLive.api.createInvitation(email,"EMPLOYEE",{full_name:name,job_title:role,monthly_pay_amount:pay,currency:"NGN",employment_start_date:null});
    const token=result?.data?.activation_token;
    if(!token) throw new Error("Igho did not return an invitation token.");

    const inviteUrl=new URL("auth.html",window.location.href);
    inviteUrl.searchParams.set("invite",token);
    inviteUrl.searchParams.set("name",name);
    inviteUrl.searchParams.set("email",email);
    inviteUrl.searchParams.set("return","index.html?live=1");

    const id=`EMP-${String(24+state.people.length).padStart(5,"0")}`;
    if(!state.people.some((person)=>person.email.toLowerCase()===email)){
      state.people.unshift({id,name,email,role,pay,bank:"",account:"",bankStatus:"Action required",status:"Active",lastPaid:"—",included:true});
      log("Employee invited",`${id} · ${name}`,"Johannes Oghoro","Employee");
      save();
      render();
    }

    document.getElementById("personInviteFields").hidden=true;
    document.getElementById("inviteResult").hidden=false;
    document.getElementById("inviteLink").value=inviteUrl.toString();
    document.getElementById("personModalTitle").textContent="Invitation ready";
    button.disabled=false;
    button.textContent="Done";
    button.onclick=()=>closeModal("personModal");
    toast("Invitation created",`${name} can now join The24thGroup.`);
  }catch(error){
    button.disabled=false;
    button.textContent="Add & invite";
    toast("Invitation failed",error?.message||"Could not create the employee invitation.");
  }
}
document.getElementById("addPersonConfirm").onclick=submitPersonInvitation;
