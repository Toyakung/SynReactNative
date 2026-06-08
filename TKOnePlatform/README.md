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
