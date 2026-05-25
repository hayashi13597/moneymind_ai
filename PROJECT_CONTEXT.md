# MoneyMind AI Project Context

MoneyMind AI là ứng dụng quản lý chi tiêu cá nhân có AI phân tích tài chính.

Người dùng nhập thu chi hằng ngày, hệ thống tự phân loại giao dịch, phân tích thói quen tiêu tiền và dùng AI để đưa ra gợi ý tiết kiệm cá nhân hóa.

Primary locale: Vietnamese. Primary currency: VND.

## Core Idea

Ví dụ insight:

```txt
Tháng này bạn đã chi 3.200.000đ cho ăn uống, tăng 28% so với tháng trước.
Nếu giảm trà sữa/cafe 3 lần mỗi tuần, bạn có thể tiết kiệm khoảng 600.000đ/tháng.
```

## Core User Flows

### 1. Quản Lý Thu / Chi

Người dùng thêm giao dịch bằng ngôn ngữ tự nhiên:

```txt
Ăn trưa 55k
Cafe Highland 49k
Lương tháng 18tr
Mua áo Shopee 250k
hôm nay đi ăn lẩu với bạn hết 320k
```

AI tự hiểu và phân loại:

```txt
Ăn uống
Cafe
Thu nhập
Mua sắm
```

### 2. AI Phân Loại Giao Dịch

Input:

```txt
hôm nay đi ăn lẩu với bạn hết 320k
```

Output mong muốn:

```json
{
  "type": "expense",
  "amount": 320000,
  "category": "Eating Out",
  "note": "Ăn lẩu với bạn"
}
```

Trước khi lưu, UI nên cho người dùng review và chỉnh lại kết quả AI parse.

### 3. Dashboard Tài Chính

Dashboard tháng cần hiển thị:

- Tổng thu nhập.
- Tổng chi tiêu.
- Số tiền còn lại.
- Chi theo category.
- So sánh tháng này với tháng trước.

### 4. AI Financial Insight

AI phân tích dữ liệu tháng hiện tại, so sánh tháng trước và đưa ra gợi ý ngắn gọn:

```txt
Bạn đang chi quá nhiều vào ăn ngoài và mua sắm online.
Chi tiêu cố định của bạn đang ổn.
Nên đặt ngân sách ăn uống là 3.000.000đ/tháng.
```

### 5. Budget Planner

Người dùng có thể đặt ngân sách theo category:

```txt
Ăn uống: 3 triệu/tháng
Mua sắm: 1 triệu/tháng
Cafe: 500k/tháng
```

Budget planner và cảnh báo gần vượt mức nằm ngoài MVP đầu tiên.

### 6. Receipt OCR / Bill Scanner

Upload ảnh hóa đơn, AI đọc:

```txt
Highlands Coffee
Total: 89.000đ
Category: Cafe
Date: 25/05/2026
```

OCR nằm ngoài MVP đầu tiên.

### 7. AI Chat Tài Chính Cá Nhân

Ví dụ câu hỏi:

```txt
Tháng này tôi tiêu nhiều nhất vào đâu?
Tôi có thể tiết kiệm bao nhiêu?
So với tháng trước tôi tiêu khác gì?
Tạo kế hoạch tiết kiệm 5 triệu trong 3 tháng.
```

AI chat nằm ngoài MVP đầu tiên.

## MVP Scope

MVP tập trung vào core financial loop:

- Login.
- CRUD income/expense.
- Category management.
- Monthly dashboard.
- AI auto categorization.
- AI spending insight.

## Post-MVP Roadmap

- Upload hóa đơn / Receipt OCR.
- AI chat tài chính cá nhân.
- Budget alert.
- Recurring expenses.
- Export Excel/PDF.

## Tech Stack

- Frontend: Next.js, TypeScript, Tailwind CSS, shadcn/ui.
- Backend: Next.js API Routes.
- Database: PostgreSQL, target Neon/Vercel Postgres cho production.
- ORM: Prisma.
- Auth: Better Auth với email/password cho MVP.
- AI: OpenAI-compatible provider qua Base URL, API key và model.
- Chart: Recharts.
- Deploy: Vercel.

## Current Repository State

Repo hiện tại là một Next.js app mới. Implementation nên giữ cấu trúc hiện tại, thêm module sản phẩm dần dần, và không mở rộng sang các tính năng post-MVP cho đến khi transaction-dashboard-AI loop hoạt động ổn định.
