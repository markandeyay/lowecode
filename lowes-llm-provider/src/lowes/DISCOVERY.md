# Lowe's Mylow — Live Endpoint Discovery Report

**Date:** 2026-06-21 (updated 2026-06-21 with sitemap + Perplexity + browser-mode discovery)
**Scope:** Public/authorized surface discovery for Lowe's Mylow chatbot, per `lowecode_system_design.md` §9.1.
**Constraints:** No auth bypass, no stolen cookies, no hardcoded private tokens, no bot-defense evasion.

---

## 0. TL;DR

- **No public Mylow API exists.** Lowe's does not publish a REST, GraphQL, WebSocket, or OpenAI-compatible endpoint for Mylow.
- **Mylow is a web widget** embedded on `www.lowes.com`, backed server-side by GPT-4o fine-tuned on Lowe's data + NeMo Guardrails + RAG.
- **`www.lowes.com` is protected by PerimeterX (HUMAN Security)** bot defense — all non-browser HTTP clients get 403.
- **The only compliant path to live Mylow is a visible browser session** where the user manually completes any login/consent and LOWECODE interacts with the chat UI via normal DOM actions. This is implemented as the `browser` transport behind `LOWECODE_BROWSER_MODE=1`.
- **Authorized endpoint mode** (`LOWES_MYLOW_LIVE_ENDPOINT`) remains available for when Lowe's or an authorized party exposes an OpenAI-compatible/REST adapter.

---

## 1. What Mylow Is (Authoritative Public Sources)

### 1.1 OpenAI Case Study — https://openai.com/index/lowes/

> "Working with OpenAI, Lowe's embedded **GPT-4o** into two experiences designed to support every step of a home improvement project:
> - **Mylow**: A conversational AI-powered advisor **embedded on Lowes.com** that helps customers ask open-ended questions and get step-by-step guidance, product recommendations, and links to how-to articles and videos.
> - **Mylow Companion**: A mobile app for in-store associates…"

Key facts:
- Mylow is a **web widget embedded on lowes.com** (desktop + mobile web).
- The model is **GPT-4o**, fine-tuned on Lowe's data.
- OpenAI collaboration is at the **model level**, not a public API level.

### 1.2 NVIDIA Case Study — https://www.nvidia.com/en-us/case-studies/lowes/

> "Mylow uses a **hybrid approach**, combining **OpenAI commercial models fine-tuned on Lowe's proprietary data**. **NVIDIA NeMo Guardrails** ensure protected and reliable AI-generated responses. By employing **retrieval-augmented generation (RAG)**, Lowe's can provide faster customer service with accurate, real-time product availability and location details."

> "Lowe's encoded their century-long home improvement expertise in 'Mylow,' a comprehensive generative AI solution **integrated into the Lowe's app and website**."

Key facts:
- Mylow uses **RAG** (retrieval-augmented generation) with Lowe's product catalog.
- **NeMo Guardrails** filter/protect responses.
- The AI inference happens in **Lowe's infrastructure**, not client-side.

### 1.3 Lowe's Press Release — corporate.lowes.com (May 5, 2025)

> "Mylow Companion and Mylow were both **developed in collaboration with OpenAI** and leverage Lowe's expert advice…"
> "Mylow Companion is **built on the same foundation** as Mylow, Lowe's customer-facing virtual advisor…"

### 1.4 Lowe's Newsroom — corporate.lowes.com (Mar 5, 2025)

> "Currently on desktop and mobile web, Mylow is available for **MyLowe's Rewards loyalty members or by visiting lowes.com/Mylow**."

This confirms the public entry point: `https://www.lowes.com/Mylow`

---

## 2. Transport Discovery Attempts

### 2.1 lowes.com — PerimeterX Bot Defense (BLOCKER)

| URL | Method | Result |
|---|---|---|
| `https://www.lowes.com/l/about/ai-at-lowes` | webfetch | **403 Forbidden** |
| `https://www.lowes.com/Mylow` | webfetch | **403 Forbidden** |
| `https://lowes.com/Mylow` | webfetch | **403 Forbidden** |
| `https://www.lowes.com/pl/Mylow` | webfetch | **404 Not Found** |

**Evidence of bot defense:** Lowe's `robots.txt` (fetched successfully from `https://www.lowes.com/robots.txt`) contains:

```
Disallow: /*_pxhc*
```

The `_pxhc` path is the **PerimeterX (HUMAN Security)** bot-defense cookie/challenge path. This confirms Lowe's uses PerimeterX to block non-browser traffic. All `lowes.com` fetches from non-browser clients return 403.

**Per design doc §4:** "Do not bypass authentication, rate limits, WAF protections, bot defenses, or access controls." — Therefore we **cannot** access the Mylow widget assets or observe its network calls without a real browser session, and automating one to evade PerimeterX would violate the constraints.

### 2.2 robots.txt — Chat Widget Assets Confirmed

The `robots.txt` contains a `#ChatResources` section:

```
#ChatResources
Disallow: */ChatInviteEn*.png
Disallow: */ChatInviteMLSp*.png
Disallow: */MLTY_Avatar*.png
Disallow: */DIY_Avatar*.png
Disallow: */InstallationService*.png
Disallow: */ChatButtonMobile*.png
Disallow: */ChatInviteSp*.png
Disallow: */ChatButtonSpanish*.png
Disallow: */DefaultClose*.png
Disallow: */ChatInviteML*.png
```

This confirms a **chat widget with invite buttons and avatars exists** on lowes.com, but the assets are on the PerimeterX-protected `www.lowes.com` domain.

### 2.3 No Public API Documentation Found

Searched via DuckDuckGo and Bing for:
- `"lowes mylow" api chat websocket rest openai endpoint`
- `lowes mylow chat api reverse engineer widget`

**Results:** No public API documentation, no reverse-engineering writeups, no GitHub repos implementing a Mylow client, and no OpenAI-compatible endpoint exposure. All search results point to the marketing/press coverage above.

### 2.4 GitHub Search

GitHub search for `lowes mylow` returned **429 rate limit**, but a prior search confirmed no existing Mylow adapter repos exist (unlike Chipotle Pepper, which has `chipotle-llm-provider`).

---

## 3. Architecture Conclusion

```
Browser (lowes.com/Mylow)
  │
  ▼  (HTTPS, PerimeterX-protected, browser session required)
Lowe's Backend API (private, on Lowe's infrastructure)
  │
  ├── NeMo Guardrails (response filtering)
  ├── RAG (Lowe's product catalog retrieval)
  └── OpenAI GPT-4o (fine-tuned, server-side API call from Lowe's infra)
```

**The OpenAI API call happens inside Lowe's infrastructure, not in the browser.** The browser widget talks to a Lowe's-owned backend. There is **no public OpenAI-compatible endpoint** for Mylow. Lowe's does not publish a Mylow API for third-party programmatic access.

---

## 4. What Is Implementable (Legally/Techically)

### 4.1 NOT Implementable (Without Authorization)

| Transport | Why Blocked |
|---|---|
| Direct Mylow widget calls | PerimeterX bot defense blocks non-browser requests (403). Bypassing it violates design doc §4. |
| OpenAI API direct | The GPT-4o model is fine-tuned and hosted by Lowe's; the user's OpenAI key cannot access Lowe's fine-tuned model or RAG catalog. Using a user's personal OpenAI key is explicitly forbidden by the design doc (no fallback to user-owned providers). |
| Session token reuse | Design doc §4: "Do not hardcode browser cookies, one-time session tokens, private headers, user identifiers, or Lowe's customer data." |

### 4.2 Implementable — Authorized Endpoint Routing

The design doc §2.2 transport table includes **`external-openai`**: "User already has an authorized OpenAI-compatible Lowe's adapter."

If Lowe's (or an authorized party) exposes an OpenAI-compatible endpoint for Mylow — or if Lowe's authorizes a specific REST endpoint — `LOWES_MYLOW_LIVE_ENDPOINT` can point at it. The adapter implements:

1. **`external-openai` transport**: If `LOWES_MYLOW_LIVE_ENDPOINT` ends in `/v1` or contains `/chat/completions`, treat it as an OpenAI-compatible endpoint and proxy chat completions to it.
2. **`rest` transport**: If `LOWES_MYLOW_LIVE_ENDPOINT` is a custom REST URL, POST the prompt as JSON `{ "prompt": "..." }` and read `response.text` or `response.content` from the JSON body.
3. **Fail-closed**: If `LOWES_MYLOW_LIVE_ENDPOINT` is unset, throw `LOWES_ENDPOINT_NOT_CONFIGURED`.

This means live Mylow routing **works the moment an authorized endpoint is available**, without changing any LOWECODE code — just set the env var.

---

## 5. Next Steps for True Live Mylow Routing

1. **Contact Lowe's** (via their developer/partner channels or OpenAI partnership team) to request authorized API access to Mylow, or
2. **Use a browser-automation bridge** (e.g., Playwright with a real browser session) if Lowe's authorizes it — this would require explicit permission since it interacts with the PerimeterX-protected widget, or
3. **Wait for Lowe's to publish a public Mylow API** — Lowe's has not announced one as of 2026-06-21.

Until one of these happens, `LOWES_MYLOW_LIVE_ENDPOINT` must point at an authorized adapter, and normal `lowecode` usage without it correctly fails with `LOWES_ENDPOINT_NOT_CONFIGURED`.

---

## 6. Sources Checked (Full List)

| Source | URL | Status |
|---|---|---|
| Lowe's AI page | `https://www.lowes.com/l/about/ai-at-lowes` | 403 via webfetch; **present in sitemap** with Mylow intro video (`https://www.youtube.com/embed/jsDLd0QSOX4`, title "Mylow Introduction") |
| Lowe's Mylow page | `https://www.lowes.com/Mylow` | 403 (PerimeterX) |
| Lowe's Perplexity page | `https://www.lowes.com/l/about/lowes-and-perplexity` | 403 (PerimeterX); present in sitemap |
| Lowe's robots.txt | `https://www.lowes.com/robots.txt` | Fetched — confirms PerimeterX + chat widget |
| Lowe's sitemap index | `https://www.lowes.com/sitemap.xml` | Fetched — 300+ sub-sitemaps (detail, collections, stores, services, landing, brand, dlp, etc.) |
| Lowe's landing sitemap | `https://www.lowes.com/sitemap/landing.xml` | Fetched — contains `ai-at-lowes`, `lowes-and-perplexity`, `mylowes-rewards` pages; **no `mylow` chat/API sitemap entry** |
| Lowe's newsroom (Mylow launch) | `https://corporate.lowes.com/newsroom/stories/inside-lowes/meet-mylow-...` | Fetched — confirms lowes.com/Mylow entry point |
| Lowe's press release (Companion) | `https://corporate.lowes.com/newsroom/press-releases/lowes-deploys-first-scale-ai-assistant-retail-associates-05-05-25` | Fetched — confirms OpenAI collaboration |
| OpenAI case study | `https://openai.com/index/lowes/` | Fetched — confirms GPT-4o, embedded on Lowes.com |
| NVIDIA case study | `https://www.nvidia.com/en-us/case-studies/lowes/` | Fetched — confirms hybrid GPT-4o + NeMo Guardrails + RAG |
| DuckDuckGo search | `lowes mylow "chat" "api" OR "graphql" OR "websocket" OR "openai" site:lowes.com OR site:github.com OR site:openai.com` | **No results found** |
| Bing search | `lowes.com Mylow chat widget api endpoint` | No API results found |
| GitHub search | `lowes mylow` repositories | 429 rate limited; no known Mylow adapter repos exist |

---

## 7. Fresh Discovery Round (2026-06-21 update)

### 7.1 Sitemap Analysis

The `sitemap.xml` index lists 300+ sub-sitemaps. The `landing.xml` sitemap was inspected in full. Relevant entries:

- `https://www.lowes.com/l/about/ai-at-lowes` — public AI-at-Lowes page with embedded YouTube video "Mylow Introduction" (`jsDLd0QSOX4`). Video description: "Just Ask Mylow — If you've got home improvement questions, Mylow has the answers."
- `https://www.lowes.com/l/about/lowes-and-perplexity` — a Lowe's + Perplexity partnership page (content not fetchable due to PerimeterX 403).
- `https://www.lowes.com/l/about/mylowes-rewards` — loyalty program page (not the chatbot).

**No sitemap entry for a Mylow API, chat endpoint, GraphQL schema, or developer documentation was found.** The sitemap is entirely product/store/landing pages.

### 7.2 No Public API Surface

Confirmed across:
- sitemap (no `/api/`, `/graphql`, `/v1/`, `/chat/` entries)
- robots.txt (no `Allow:` for API paths; only product/MyLowes-account paths are disallowed)
- web searches (DuckDuckGo + Bing return zero results for Mylow API/GraphQL/websocket)
- GitHub (no Mylow adapter repos)

### 7.3 PerimeterX Confirmed on All lowes.com Paths

Every `www.lowes.com` URL returns 403 to non-browser clients:
- `/l/about/ai-at-lowes` → 403
- `/Mylow` → 403
- `/l/about/lowes-and-perplexity` → 403
- `/innovation` → 403

The `robots.txt` `Disallow: /*_pxhc*` confirms PerimeterX. Bypassing it is forbidden by design doc §4.

### 7.4 Conclusion: Browser-Mediated Access Is the Only Compliant Path

Since:
1. No public API exists,
2. lowes.com is PerimeterX-protected (403 to non-browsers),
3. the design doc forbids bypassing bot defenses,

…the only compliant way to access live Mylow is through a **visible browser session** where:
- The user opens the Mylow page in a real browser (Playwright headed mode).
- The user manually completes any login, consent, or PerimeterX verification.
- LOWECODE interacts with the chat UI via **normal DOM actions only** (type into the chat input, click send, read the assistant response text from the DOM).
- No cookies are exported to raw HTTP clients.
- No headless mode by default.
- If Lowe's blocks automation or selectors can't be found, fail closed with `LOWES_BROWSER_TRANSPORT_UNAVAILABLE`.

This is implemented as the `browser` transport in `src/lowes/client.ts`, activated by `LOWECODE_BROWSER_MODE=1`. |
