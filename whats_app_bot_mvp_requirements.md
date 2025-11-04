# WhatsApp Blood Pressure Shortcut Bot — MVP Requirements

> **Goal:** Enable a senior user to quickly send a selected blood‑pressure range to two caregivers via WhatsApp using one tap on predefined buttons.

## 1. Scope

### 1.1 In‑Scope
- Send an interactive WhatsApp message with shortcut buttons: `<110`, `120`, `130`, `140`, `150`, `>160`.
- On button press, forward a confirmation and the selected value to **two predefined recipients** (caregivers).
- Manual trigger endpoint to send the interactive menu to the senior.
- Optional daily schedule (cron) to send the menu at a fixed time.
- Minimal persistence (logging each selection to a flat file or SQLite).

### 1.2 Out‑of‑Scope (MVP)
- Real medical device integration.
- Rich analytics dashboard.
- Multi‑tenant support or admin UI.
- Multi‑language, except fixed English copy.

## 2. Users & Roles
- **Senior (primary):** receives menu, taps one button.
- **Caregivers (2 recipients):** receive the selected value as text.
- **Operator (technical):** deploys/maintains the service.

## 3. Success Criteria (Acceptance)
- Senior receives an interactive message with the 6 buttons.
- Pressing any button triggers:
  - A confirmation back to the senior within ≤ 3s (best effort).
  - Delivery of a text message with the selected value to both caregivers.
- System logs (timestamp, senior number, selected value) are persisted.
- Basic error handling: failures are logged and surfaced in server logs; senior gets a fallback error notice.

## 4. Functional Requirements

### FR‑1 Send Interactive Menu
- System provides a **GET** endpoint `/send-menu`.
- When called, sends an **interactive message with buttons** to the senior’s WhatsApp number via **WhatsApp Cloud API**.
- Message body: `Choose your blood pressure range:`
- Buttons (reply IDs can be arbitrary but stable):
  - `<110`, `120`, `130`, `140`, `150`, `>160`.

### FR‑2 Handle Button Selection (Webhook)
- System exposes a **POST** `/webhook` for WhatsApp event callbacks.
- On `interactive.button_reply` (or `list_reply`—not required for MVP but tolerated), extract the selected title.
- Compose message: `Blood pressure (senior selection): <VALUE>`.
- Send to both caregivers.
- Send confirmation to the senior: `Received: <VALUE>. Sent to caregivers.`

### FR‑3 Session & Template Rules
- Respect WhatsApp **24‑hour session** rule:
  - Senior: covered by their button press (inbound message).
  - Caregivers: ensure they have messaged the bot at least once **or** use **approved message templates** for outbound initiation.
- MVP: document a one‑time onboarding step where both caregivers send `Start` to the bot.

### FR‑4 Logging
- Each event is appended to storage (CSV or SQLite):
  - `timestamp_iso`, `senior_msisdn`, `selected_value`, `delivery_status_caregiver1`, `delivery_status_caregiver2`.
- Provide a simple **GET** `/health` returning `200 OK` + build/version.

### FR‑5 Optional Schedule
- Optional cron (outside app or as a lightweight job) calls `/send-menu` once per day at a configurable time.

## 5. Non‑Functional Requirements
- **Reliability:** Best‑effort delivery; log all failures; no message loss in the app due to crashes (use append‑only file or durable SQLite).
- **Latency:** Target under 3 seconds from selection to caregiver notifications.
- **Security:**
  - Store tokens in environment variables; never commit secrets.
  - Restrict `/send-menu` with a static bearer key in header (configurable).
  - Verify WhatsApp webhook signature if configured; verify token for webhook validation.
- **Privacy:** Do not store message contents beyond minimal logs; no PII beyond phone numbers.
- **Observability:** Console logs + rotating file logs; minimal metrics count (total sends, failures).
- **Deployability:** Single container image; runs on any Node.js 18+ runtime.

## 6. External Dependencies
- **WhatsApp Cloud API** (Meta):
  - WhatsApp Business Account ID
  - Phone Number ID
  - Permanent Access Token
  - Webhook configuration (verify token)

## 7. Configuration (ENV)
```
PORT=3000
VERIFY_TOKEN=your-verify-token
WHATSAPP_TOKEN=EAAG... (Permanent Access Token)
PHONE_NUMBER_ID=123456789000000
SENIOR_NUMBER=3712XXXXXXX             # E.164 digits, no '+'
CAREGIVER1=3712YYYYYYY
CAREGIVER2=3712ZZZZZZZ
SEND_MENU_BEARER=some-long-random     # to protect /send-menu
TIMEZONE=Europe/Riga                  # for cron, if used
```

## 8. API Surface (App)
- `GET /webhook` — WhatsApp verification: echo `hub.challenge` when `hub.verify_token` matches `VERIFY_TOKEN`.
- `POST /webhook` — WhatsApp events.
- `GET /send-menu` — Sends the interactive buttons to the senior; requires header `Authorization: Bearer <SEND_MENU_BEARER>`.
- `GET /health` — Returns `{ status: "ok", version: "x.y.z" }`.

## 9. WhatsApp Messages (MVP Formats)

### 9.1 Interactive Buttons (Outbound to Senior)
- Type: `interactive` → `button`.
- Body: `Choose your blood pressure range:`
- Buttons: `<110`, `120`, `130`, `140`, `150`, `>160`.

### 9.2 Caregiver Text (Outbound)
- Type: `text`.
- Body: `Blood pressure (senior selection): <VALUE>`.

### 9.3 Senior Confirmation (Outbound)
- Type: `text`.
- Body: `Received: <VALUE>. Sent to caregivers.`

### 9.4 (If Needed) Template for Outbound Initiation
- Name: `daily_check_bp`
- Language: `en`
- Body: `Please select your blood pressure range for today.`
- Use only if caregivers/senior haven’t messaged the bot within 24h.

## 10. Error Handling
- If WhatsApp send fails → log `{ to, value, error_code, error_message }`.
- Send fallback to senior: `Sorry, delivery failed. Please try again or contact support.`
- Webhook must always respond `200 OK` to avoid retries storms (after processing internally).

## 11. Minimal Data Model
- **Event Log (SQLite or CSV)**
  - `id` (auto)
  - `ts` (ISO8601 string)
  - `senior_msisdn` (string)
  - `value` (string one of: `<110|120|130|140|150|>160`)
  - `cg1_status` (enum: sent|failed)
  - `cg2_status` (enum: sent|failed)

## 12. Operational Notes
- Use `ngrok` or reverse proxy to expose `/webhook` publicly for Meta validation.
- Keep Permanent Access Token rotated per internal security policy.
- Backup logs daily; retain 90 days.

## 13. Testing
- Unit: parse webhook payload, map button titles, message composer.
- Integration: mock WhatsApp API (success + failure), end‑to‑end flow.
- UAT: manual tap on each button → verify both caregivers receive messages.

## 14. Future Enhancements (Post‑MVP)
- Configurable caregivers via small admin UI.
- Threshold alerts (e.g., `>160` triggers urgent template, optional phone call via telephony API).
- Multi‑language; large text size accessibility variant.
- Retry & dead‑letter queue for failed sends.
- Metrics dashboard (Grafana/Prometheus).

