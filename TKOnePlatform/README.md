# TK ONE — Property Intelligence Platform

เครื่องมือภายในสำหรับทีมงาน TK One: พนักงานป้อน **ความต้องการลูกค้า** + **ทรัพย์ที่ตรวจสอบแล้ว**
จากนั้น AI ช่วย **วิเคราะห์ / ให้คะแนน / จัดอันดับ / เขียนรายงาน / ร่างข้อความติดต่อ**

> AI วิเคราะห์เฉพาะข้อมูลที่พนักงานป้อนเท่านั้น — **ไม่กุทรัพย์ ราคา หรือข้อเท็จจริงขึ้นเอง**

## สถาปัตยกรรม

```
Browser (React + TS)  ──POST /api/analyze──►  Express proxy  ──►  Anthropic API
        │                                          │
        │ (ถ้า proxy/AI ล่ม)                        └── ANTHROPIC_API_KEY อยู่ฝั่ง server เท่านั้น
        └── fallback ► built-in scoring engine (deterministic, ทำงานได้เสมอ)
```

- **`src/engine/`** — เครื่องวิเคราะห์ built-in (pure functions, deterministic) เป็น fallback ที่รับประกันว่าระบบใช้งานได้เสมอ
- **`src/ai/client.ts`** — เรียก backend proxy + sanitize ผลลัพธ์ AI ให้ตรง contract เสมอ
- **`server/`** — Express proxy เก็บ API key ฝั่ง server (key ไม่หลุดไป browser)
- **`src/components/`, `src/App.tsx`** — UI 5 ขั้นตอน: ความต้องการ → ทรัพย์ → วิเคราะห์ → รายงาน PDF → ติดต่อ

## เริ่มใช้งาน

```bash
npm install
cp .env.example .env        # ใส่ ANTHROPIC_API_KEY
npm start                   # รัน proxy (:8787) + frontend (:5173) พร้อมกัน
```

รันแยกส่วน:

```bash
npm run server   # backend proxy
npm run dev       # frontend (proxy /api → :8787)
```

## เชื่อมต่อ AI จริง (Claude)

จุดต่อ AI อยู่ที่ backend proxy เท่านั้น (`server/`) — frontend ไม่เคยเห็น API key

1. **ขอ API key**: console.anthropic.com → API Keys → สร้าง key (`sk-ant-...`)
2. **ใส่ใน `.env`** (ห้าม commit ไฟล์นี้ — มี `.gitignore` กันไว้แล้ว):
   ```bash
   cp .env.example .env
   # แก้ ANTHROPIC_API_KEY=sk-ant-...
   ```
3. **รัน**: `npm start` (proxy :8787 + web :5173) แล้วกด "ให้ AI วิเคราะห์" — ระบบจะเรียก Claude จริง

รายละเอียดการต่อ:
- ใช้ **Anthropic SDK อย่างเป็นทางการ** (`@anthropic-ai/sdk`) ฝั่ง server (`server/handler.mjs`)
- โมเดลเริ่มต้น **`claude-opus-4-8`** (เก่งสุด) — ปรับได้ที่ `TKONE_MODEL` ใน `.env`
  (ถ้าเน้นปริมาณ/ลดต้นทุน ใช้ `claude-sonnet-4-6`)
- ใช้ **Structured Outputs** (`output_config.format` + JSON Schema) การันตีว่าโมเดลตอบ JSON
  ตรง contract ทุกครั้ง — เกรด A–F / Low-Med-High ถูกบังคับด้วย enum
- ถ้า AI ล่ม/ไม่มี key → frontend fallback ไป built-in engine อัตโนมัติ ระบบใช้งานได้เสมอ

> ต้นทุน: เรียก Claude คิดตามจำนวน token ต่อการวิเคราะห์ 1 ครั้ง ดูราคาที่ console.anthropic.com
> ส่วนลิงก์เดโม static (Netlify) ใช้ built-in engine ไม่เรียก API จึงไม่มีค่าใช้จ่ายและไม่ต้องมี key

## Deploy บน Netlify ให้ต่อ Claude จริง (ทำจากมือถือได้)

Netlify มี **Functions** (serverless) ในตัว — ใช้เป็น backend proxy ได้เลย ไม่ต้องมี host อื่น
(ไฟล์พร้อมแล้ว: `netlify.toml` + `netlify/functions/analyze.mjs`)

> ลิงก์ Netlify Drop แบบ static เดิม **เรียก Claude ไม่ได้** (ไม่มี backend) — ต้องเปลี่ยนมาเป็น
> deploy แบบ **เชื่อม GitHub repo** เพื่อให้ Function ทำงาน

ขั้นตอน (ทำในเบราว์เซอร์มือถือที่ **app.netlify.com** ได้):
1. **Add new site → Import an existing project → GitHub** → เลือก repo `SynReactNative`
   - Netlify จะอ่าน `netlify.toml` เอง (base = `TKOnePlatform`, build = `npm run build`,
     functions = `netlify/functions`) — ไม่ต้องตั้งค่า build เพิ่ม
2. **Site settings → Environment variables → Add**:
   - `ANTHROPIC_API_KEY` = `sk-ant-...` (จาก console.anthropic.com)
   - (ออปชัน) `TKONE_MODEL` = `claude-opus-4-8` หรือ `claude-sonnet-4-6`
3. **Deploys → Trigger deploy** → เปิดลิงก์เว็บ → กด "ให้ AI วิเคราะห์" = ต่อ Claude จริง

ทำงานยังไง: frontend เรียก `/api/analyze` → `netlify.toml` redirect ไปที่ Function →
Function เรียก Claude ด้วย key ที่อยู่ใน env ของ Netlify (ไม่หลุดไป browser)
ถ้ายังไม่ใส่ key → Function ตอบ 503 → frontend fallback ไป built-in engine อัตโนมัติ

### จำกัดการใช้งานเฉพาะพนักงาน (passcode gate)

endpoint ที่ต่อ Claude เป็น public — กันคนนอกแอบใช้/กินเครดิตด้วยรหัสพนักงาน:

1. Netlify → Environment variables → เพิ่ม `TKONE_ACCESS_CODE` = รหัสที่ตั้งเอง (เช่น `tkone-2026`)
2. Trigger deploy ใหม่
3. พนักงานเข้าเว็บ → กดปุ่ม **🔑 ใส่รหัสพนักงาน** (มุมขวาบน) ใส่รหัสครั้งเดียว (จำไว้ในเครื่อง)

กลไก: ตรวจรหัสฝั่ง server แบบ constant-time (`x-tkone-code` header) — รหัสไม่อยู่ในโค้ด/ไม่หลุดใน git
ถ้าไม่ตั้ง `TKONE_ACCESS_CODE` = เปิดให้ทุกคน (gate ปิด) · เปลี่ยน/ยกเลิกรหัสได้ทุกเมื่อจาก Netlify

> ทางเลือกที่แข็งแรงกว่า (ถ้าต้องการบัญชีรายคน + audit log):
> - **Netlify Identity / SSO** — ล็อกอินด้วยอีเมล เชิญเฉพาะพนักงาน (เหมาะองค์กรจริง)
> - **Cloudflare Access / Netlify password protection** — กั้นทั้งไซต์ก่อนเข้า
> - passcode นี้เหมาะกับทีมเล็ก/แชร์เร็ว ส่วน Identity เหมาะเมื่อต้องรู้ว่าใครใช้เมื่อไร

## คุณภาพ / เทสต์

```bash
npm test            # รันชุดเทสต์ทั้งหมด
npm run test:coverage
npm run typecheck
npm run build
```

- core ที่สำคัญต่อธุรกิจ (`src/engine/**`) ถูกบังคับ coverage ที่ **100%** (statements / branches / functions / lines)
- ครอบคลุม: engine การให้คะแนน, validation, AI client + sanitizer, backend handler และ flow ของ UI

## ความปลอดภัย / Enterprise notes

- API key อยู่ฝั่ง server เท่านั้น — frontend ไม่เคยเห็น key
- ทุก output ของ AI ผ่าน `sanitizeResult` ก่อนเข้า UI (กันข้อมูลเพี้ยน/ทรัพย์ที่ไม่มีจริง)
- ข้อมูลงาน (ความต้องการ + ทรัพย์) เก็บใน `localStorage` รีเฟรชแล้วไม่หาย
- การส่งข้อความอัตโนมัติ (LINE/อีเมล) + ความยินยอม PDPA เป็นงานฝั่ง backend จริง — เวอร์ชันนี้ให้พนักงานกดส่งเอง
