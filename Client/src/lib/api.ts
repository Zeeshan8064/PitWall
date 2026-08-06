import axios from "axios";

// Single source of truth for where the API lives. Previously every page
// carried its own `const API_BASE = "http://localhost:5000"`, which meant a
// deployed build asked the visitor's own machine for data and every request
// failed.
//
// Set VITE_API_BASE at build time. Vite inlines it, so it must be present when
// the bundle is built, not when it runs. Falls back to localhost so `npm run
// dev` works with no configuration.
export const API_BASE =
  import.meta.env.VITE_API_BASE?.replace(/\/$/, "") ?? "http://localhost:5000";

// Pre-configured client. Use this rather than bare axios so a timeout and the
// base URL apply everywhere by default.
export const api = axios.create({
  baseURL: `${API_BASE}/api/races`,
  // Long enough for a cold Atlas connection, short enough that a hung request
  // surfaces as an error rather than an indefinite spinner.
  timeout: 30_000,
});
