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
