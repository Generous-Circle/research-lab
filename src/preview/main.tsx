// PREVIEW ONLY entry: runs the real Lab UI on a static page with example data.
import React from "react";
import ReactDOM from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "../App";
import "../index.css";
import { installFakeBackend } from "./fakeBackend";

const SUPA = import.meta.env.VITE_SUPABASE_URL as string;
installFakeBackend(SUPA);

// Pretend someone is signed in; fall back to an in-memory store if storage is blocked.
try {
  localStorage.setItem("research_lab_token", "crt_preview");
} catch {
  const mem: Record<string, string> = { research_lab_token: "crt_preview" };
  Object.defineProperty(window, "localStorage", {
    value: { getItem: (k: string) => mem[k] ?? null, setItem: (k: string, v: string) => void (mem[k] = v), removeItem: (k: string) => void delete mem[k] },
  });
}

const css = document.createElement("style");
css.textContent = `body.hl [data-model-check-new]{outline:2px dashed hsl(var(--primary));outline-offset:3px}
body.hl td[data-model-check-new],body.hl th[data-model-check-new]{outline:none;background:hsl(var(--primary)/.09)}
.pv-bar{position:sticky;bottom:0;z-index:30;display:flex;justify-content:center;padding:10px;background:hsl(var(--background));border-top:1px solid hsl(var(--border));font-size:13px}`;
document.head.appendChild(css);
const bar = document.createElement("div");
bar.className = "pv-bar";
bar.innerHTML = `<label style="display:flex;gap:8px;align-items:center;cursor:pointer"><input type="checkbox" id="pv-hl" checked> Highlight what is new. Everything else is the real Research Lab code, running on example data.</label>`;
document.body.appendChild(bar);
document.body.classList.add("hl");
bar.querySelector("input")!.addEventListener("change", (e) => document.body.classList.toggle("hl", (e.target as HTMLInputElement).checked));

const qc = new QueryClient({ defaultOptions: { queries: { retry: 0, refetchOnWindowFocus: false } } });
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/research-lab?tab=runs"]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
