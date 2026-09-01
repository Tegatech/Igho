(function(){
  const topActions=document.querySelector('.top-actions');
  if(topActions && !document.getElementById('landingLink')){
    const link=document.createElement('a');
    link.id='landingLink';
    link.className='landing-link';
    link.href='../index.html';
    link.textContent='Landing';
    link.setAttribute('aria-label','Back to Igho landing page');
    topActions.insertBefore(link, topActions.firstChild);
  }
  const brand=document.querySelector('.brand');
  if(brand){
    brand.setAttribute('role','link');
    brand.setAttribute('tabindex','0');
    brand.setAttribute('aria-label','Back to Igho landing page');
    const go=()=>{window.location.href='../index.html'};
    brand.addEventListener('click',go);
    brand.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go();}});
  }
})();
