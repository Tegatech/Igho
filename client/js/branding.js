(function(){
  const style=document.createElement('style');
  style.textContent=`
    .brand{height:74px!important;padding:0 16px!important;gap:11px!important;cursor:pointer}
    .brand .igho-sidebar-mark{width:34px;height:34px;flex:0 0 34px}
    .brand .igho-sidebar-wordmark{width:76px;height:auto;filter:brightness(0) invert(1);opacity:.98}
    .topbar-brand-icon{width:20px!important;height:20px!important;max-width:none!important}
    .employee-brand .igho-employee-wordmark{width:58px;height:auto;margin-left:1px}
    .employee-brand .igho-employee-mark{width:27px!important;height:27px!important}
    @media(max-width:760px){.brand{height:62px!important}.brand .igho-sidebar-mark{width:30px;height:30px;flex-basis:30px}.brand .igho-sidebar-wordmark{width:68px}.topbar-brand-icon{width:19px!important;height:19px!important}}
  `;
  document.head.appendChild(style);

  const sidebarBrand=document.querySelector('.sidebar .brand');
  if(sidebarBrand){
    sidebarBrand.innerHTML='<img src="assets/igho-icon-reversed.svg" alt="" class="igho-sidebar-mark"><img src="assets/igho-wordmark.png" alt="Igho" class="igho-sidebar-wordmark">';
    sidebarBrand.setAttribute('aria-label','Igho home');
  }

  document.querySelectorAll('.topbar-brand-icon').forEach(img=>{img.src='assets/igho-icon.svg';});

  const employeeBrand=document.querySelector('.employee-brand');
  if(employeeBrand){
    const icon=employeeBrand.querySelector('img');
    if(icon){icon.src='assets/igho-icon.svg';icon.classList.add('igho-employee-mark');}
    const text=employeeBrand.querySelector('span');
    if(text){text.outerHTML='<img src="assets/igho-wordmark.png" alt="Igho" class="igho-employee-wordmark">';}
  }

  let favicon=document.querySelector('link[rel="icon"]');
  if(!favicon){favicon=document.createElement('link');favicon.rel='icon';document.head.appendChild(favicon);}
  favicon.type='image/svg+xml';favicon.href='assets/igho-favicon.svg?v=2';

  let touch=document.querySelector('link[rel="apple-touch-icon"]');
  if(!touch){touch=document.createElement('link');touch.rel='apple-touch-icon';document.head.appendChild(touch);}
  touch.href='assets/igho-favicon.svg?v=2';
})();
