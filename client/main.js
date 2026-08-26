(async function loadIghoDemo(){
  const scripts = [
    "js/bootstrap.js",
    "js/data.js",
    "js/overview-people.js",
    "js/payroll-payments.js",
    "js/drawers.js",
    "js/payroll-actions.js",
    "js/responsive.js"
  ];
  for (const src of scripts) {
    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.body.appendChild(script);
    });
  }
})().catch(error => {
  console.error("Igho demo failed to initialise", error);
});
