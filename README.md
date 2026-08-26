# Igho

Interactive payroll operations demo for The24thGroup.

## Current build

This repository contains the responsive, clickable Igho demo packaged as a Zoho Catalyst Basic Web App.

### Structure

```text
.
├── catalyst.json
├── client/
│   ├── client-package.json
│   ├── index.html
│   ├── main.css
│   ├── main.js
│   ├── js/
│   │   ├── bootstrap.js
│   │   ├── data.js
│   │   ├── overview-people.js
│   │   ├── payroll-payments.js
│   │   ├── drawers.js
│   │   ├── payroll-actions.js
│   │   └── responsive.js
│   ├── styles/
│   │   ├── core.css
│   │   ├── base.css
│   │   ├── list.css
│   │   ├── filters.css
│   │   └── responsive.css
│   └── assets/
│       └── igho-icon.svg
└── README.md
```

## Run locally

You can open `client/index.html` directly in a browser.

The demo is fully client-side and persists demo state in `localStorage`.

## Deploy to Zoho Catalyst

From the repository root, associate the local directory with the required Catalyst project/environment if it is not already linked, then deploy the client:

```bash
catalyst deploy --only client
```

The `client-package.json` package name is `igho`. Once the client has been hosted in Catalyst, keep that package name stable.

## Demo flow

1. Open **People**
2. Resolve an employee bank-account issue
3. Return to **Overview**
4. Fund the August payroll
5. Approve the payroll
6. Initiate payments
7. Review generated **Payments**
8. Review generated **Payslips**

## Product icon

`client/assets/igho-icon.svg` is the canonical Igho 3×3 dot-grid mark:
- Igho navy: `#08182B`
- centre gold: `#E5A400`

The SVG is used as the browser favicon and inside the application chrome.

## Notes

This is a frontend product demo only. Paystack, authentication, payroll persistence, audit persistence and notification providers are simulated in the browser and are not yet connected to production services.
