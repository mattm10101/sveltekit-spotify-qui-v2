// src/routes/dashboard/+page.ts

// This ensures the dashboard page runs in the browser, which is necessary
// for it to know its own URL to generate the correct QR code.
export const ssr = false;