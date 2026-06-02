# 🍎 ELPPA - Premium Apple-Style E-Commerce Experience

[![React](https://img.shields.io/badge/Frontend-React%2018-blue.svg)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Backend-Node.js%2018-green.svg)](https://nodejs.org/)
[![Microservices](https://img.shields.io/badge/Architecture-Microservices-orange.svg)]()
[![Docker](https://img.shields.io/badge/DevOps-Docker-blue.svg)](https://www.docker.com/)

**ELPPA** là một nền tảng thương mại điện tử cao cấp chuyên về các sản phẩm công nghệ (Phone Store), được lấy cảm hứng từ ngôn ngữ thiết kế tối giản và sang trọng của Apple. Dự án được xây dựng trên kiến trúc Microservices mạnh mẽ, đảm bảo khả năng mở rộng và hiệu suất cao.

---

## Phase 3 Integration Notes

### Chạy service local

- API Gateway: `npm run dev:gateway`
- Order Service: chạy trong `services/order-service` bằng `npm start`
- Payment Service: chạy trong `services/payment-service` bằng `npm start`

### Chạy E2E

Từ thư mục gốc:

```bash
npm run test:e2e
```

### Giả lập webhook PayOS

```bash
npm run fake:webhook -- <orderCode>
```

Mặc định script sẽ gửi webhook `PAID` đến Payment Service và dùng chữ ký mock hợp lệ từ `PAYOS_CHECKSUM_KEY` hoặc `PAYOS_SECRET`.

## ✨ Tính năng nổi bật

### 🎨 Trải nghiệm Người dùng (UX/UI)

- **Apple Design Language**: Giao diện tinh tế, sử dụng hiệu ứng Glassmorphism và chuyển động mượt mà với Framer Motion.
- **Dynamic Dark Mode**: Hỗ trợ chế độ sáng/tối đồng bộ toàn diện trên cả trang người dùng và quản trị.
- **Responsive Design**: Hiển thị hoàn hảo trên mọi thiết bị từ Mobile đến Desktop.

### 🛠 Hệ thống Quản trị (Admin Dashboard)

- **Business Analytics**: Biểu đồ trực quan về doanh thu, lợi nhuận và xu hướng bán hàng (Recharts).
- **Real-time Chat Support**: Hệ thống hỗ trợ khách hàng trực tuyến thông qua Socket.io.
- **Inventory Management**: Quản lý sản phẩm, đơn hàng, khách hàng và danh mục một cách chuyên nghiệp.
- **Localization**: Hỗ trợ tiếng Việt 100% và đơn vị tiền tệ VNĐ.

### 🏗 Kiến trúc Microservices

- **API Gateway**: Điểm điều phối duy nhất cho mọi yêu cầu từ Client.
- **Auth Service**: Quản lý định danh, bảo mật JWT.
- **Product Service**: Quản lý kho dữ liệu sản phẩm linh hoạt (MongoDB).
- **Cart Service**: Quản lý giỏ hàng và lưu trữ tạm thời (Redis).
- **Order Service**: Xử lý đơn hàng, thanh toán và lịch sử giao dịch (PostgreSQL).
- **Chat Service**: Xử lý tin nhắn thời gian thực.
- **Database**: Sử dụng kết hợp PostgreSQL (Dữ liệu giao dịch) và MongoDB (Dữ liệu sản phẩm).

### 🤖 AI Shopping Assistant

- **AI Agent Service**: Phân loại ý định bằng LLM cục bộ qua Ollama và gọi công cụ dữ liệu thật.
- **Inventory Tool**: Kiểm tra tồn kho từ dữ liệu sản phẩm hiện tại.
- **Product Tool**: Tìm kiếm, lọc và so sánh sản phẩm theo danh mục, thương hiệu và khoảng giá.
- **FAQ Tool**: Tra cứu chính sách bảo hành, đổi trả và thanh toán từ kho tri thức nội bộ.
- **Frontend Widget**: Floating AI button, lịch sử chat, typing indicator và thẻ sản phẩm trực quan.

---

## 🚀 Công nghệ sử dụng (Tech Stack)

| Thành phần   | Công nghệ                                                        |
| :----------- | :--------------------------------------------------------------- |
| **Frontend** | React, Vite, Tailwind CSS, Framer Motion, Recharts, Lucide React |
| **Backend**  | Node.js, Express.js, Socket.io                                   |
| **Database** | MongoDB, PostgreSQL, Redis                                       |
| **DevOps**   | Docker, Docker Compose                                           |

---

## 🛠 Hướng dẫn cài đặt & Chạy dự án

### 1. Yêu cầu hệ thống

- **Docker Desktop** cài đặt trên máy (bao gồm Docker Engine & Docker Compose)
- **Node.js** phiên bản 18 trở lên (cho việc chạy Frontend và các service local)
- **Git** để clone/pull repository
- Trên **Windows**: PowerShell hoặc Command Prompt; trên **Mac/Linux**: Terminal

**Kiểm tra cài đặt:**

```bash
docker --version
docker compose --version
node --version
npm --version
```

---

### 2. Bước 1: Clone hoặc Cập nhật Repository

Nếu chưa có dự án trên máy:

```bash
git clone https://github.com/pnwang1704/Nhom18_KTTKPM_Project.git
cd Nhom18_KTTKPM_Project
```

Nếu đã có rồi, cập nhật mã mới nhất:

```bash
cd Nhom18_KTTKPM_Project
git pull origin main
```

---

### 3. Bước 2: Tạo và Cấu hình File Môi Trường (.env)

#### 2.1 Tạo file `.env` cho Frontend

Copy file mẫu thành file `.env`:

**Trên Windows (PowerShell):**

```powershell
Copy-Item frontend\.env.example frontend\.env
```

**Trên Mac/Linux:**

```bash
cp frontend/.env.example frontend/.env
```

**Nội dung của `frontend/.env` (sửa theo cần thiết):**

```env
VITE_API_BASE_URL=http://localhost:3000
```

#### 2.2 Tạo file `.env` cho Auth Service

Copy file mẫu:

**Trên Windows (PowerShell):**

```powershell
Copy-Item services/auth-service/.env.example services/auth-service/.env
```

**Trên Mac/Linux:**

```bash
cp services/auth-service/.env.example services/auth-service/.env
```

**Nội dung của `services/auth-service/.env` (chỉnh sửa các giá trị):**

```env
PORT=3001
NODE_ENV=development
POSTGRES_URL=postgresql://postgres:postgres@postgres:5432/auth_service
JWT_SECRET=your_secret_key_here_change_in_production
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379

# Email Configuration (SMTP) - Thay bằng email của bạn
MAIL_HOST=smtp.ethereal.email
MAIL_PORT=587
MAIL_USER=your_email@ethereal.email
MAIL_PASS=your_password
```

> **Ghi chú về Email**: Bạn có thể tạo tài khoản email test miễn phí tại [ethereal.email](https://ethereal.email/) để thử nghiệm.

#### 2.3 Tạo file `.env` cho root project (dùng cho Docker Compose)

Tạo file `.env` ở thư mục gốc:

**Trên Windows (PowerShell):**

```powershell
New-Item -Path ".\.env" -ItemType File -Force
Add-Content .env "# Environment variables cho Docker Compose`n"
Add-Content .env "MAIL_HOST=smtp.ethereal.email`n"
Add-Content .env "MAIL_PORT=587`n"
Add-Content .env "MAIL_USER=your_email@ethereal.email`n"
Add-Content .env "MAIL_PASS=your_password`n"
Add-Content .env "AWS_ACCESS_KEY_ID=your_aws_key`n"
Add-Content .env "AWS_SECRET_ACCESS_KEY=your_aws_secret`n"
Add-Content .env "AWS_REGION=us-east-1`n"
Add-Content .env "AWS_S3_BUCKET_NAME=your_bucket_name`n"
```

**Trên Mac/Linux:**

```bash
cat > .env << 'EOF'
# Environment variables cho Docker Compose
MAIL_HOST=smtp.ethereal.email
MAIL_PORT=587
MAIL_USER=your_email@ethereal.email
MAIL_PASS=your_password
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=your_bucket_name
EOF
```

---

### 4. Bước 3: Khởi Chạy Backend & Database với Docker Compose

> **Lưu ý cho AI Assistant**: Trước khi test trợ lý mua sắm, hãy chạy Ollama local và tải model.

```bash
ollama pull qwen3:latest
ollama serve
```

Nếu bạn muốn dùng Gemma3 thì đổi model trong `infra/.env.example` hoặc `infra/.env` sang `gemma3:latest`.

Từ thư mục gốc của dự án, chạy lệnh:

```bash
docker compose -f infra/docker-compose.yml up --build
```

**Lệnh này sẽ:**

- Build Docker images cho tất cả services
- Khởi chạy các container:
  - **API Gateway**: `http://localhost:3000`
  - **Auth Service**: `http://localhost:3001`
  - **Product Service**: `http://localhost:3002`
  - **Chat Service**: `http://localhost:3005`
  - **PostgreSQL**: `localhost:5432` (user: postgres, pass: postgres)
  - **MongoDB**: `localhost:27017`
  - **Redis**: `localhost:6379`

**Chờ cho đến khi thấy log như:**

```
api-gateway    | Server is running on port 3000
auth-service   | Server is running on port 3001
product-service| Server is running on port 3002
chat-service   | Server is running on port 3005
```

> **Lưu ý**: Lần đầu tiên chạy sẽ mất 2-5 phút để download images và build. Các lần sau sẽ nhanh hơn.

---

### 5. Bước 4: Cài Đặt Dependencies và Chạy Frontend

**Mở terminal mới** (giữ terminal Docker Compose ở trên chạy):

```bash
cd frontend
npm install
npm run dev
```

**Output sẽ hiển thị:**

```
VITE v5.x.x  ready in 500 ms

➜  Local:   http://localhost:5173/
➜  press h to show help
```

---

### 6. Bước 5: Truy Cập Ứng Dụng

Mở trình duyệt và truy cập các URL:

| Thành phần               | URL                           | Mô tả                                  |
| :----------------------- | :---------------------------- | :------------------------------------- |
| **Giao diện người dùng** | `http://localhost:5173`       | Trang chủ, danh mục, chi tiết sản phẩm |
| **Quản trị (Admin)**     | `http://localhost:5173/admin` | Dashboard quản lý, thêm/sửa sản phẩm   |
| **API Gateway**          | `http://localhost:3000`       | Endpoint API chính                     |
| **Auth Service**         | `http://localhost:3001`       | Đăng ký, đăng nhập, JWT                |
| **Product Service**      | `http://localhost:3002`       | Danh sách sản phẩm                     |
| **Chat Service**         | `http://localhost:3005`       | Hỗ trợ khách hàng real-time            |

---

### 7. Các Lệnh Hữu Ích

**Dừng tất cả containers:**

```bash
docker compose -f infra/docker-compose.yml down
```

**Xóa volumes (dữ liệu trong database sẽ bị xóa):**

```bash
docker compose -f infra/docker-compose.yml down -v
```

**Xem logs của một service cụ thể:**

```bash
docker compose -f infra/docker-compose.yml logs -f auth-service
```

**Restart một service:**

```bash
docker compose -f infra/docker-compose.yml restart auth-service
```

---

### 8. Khắc Phục Sự Cố

**❌ Port đã được sử dụng:**

```
Error: bind: address already in use
```

**Giải pháp:** Kiểm tra process đang chạy trên port:

- Windows: `netstat -ano | findstr :3000`
- Mac/Linux: `lsof -i :3000`
- Dừng process hoặc thay đổi port trong `docker-compose.yml`

**❌ Docker daemon không chạy:**

```
Cannot connect to Docker daemon
```

**Giải pháp:** Khởi động Docker Desktop

**❌ Dependencies không được cài:**

```bash
npm cache clean --force
npm install
```

**❌ Database lỗi khi khởi động:**

- Xóa volumes cũ: `docker compose -f infra/docker-compose.yml down -v`
- Khởi động lại: `docker compose -f infra/docker-compose.yml up --build`

---

## 📁 Cấu trúc thư mục (Project Structure)

```text
.
├── frontend/               # React Application (Apple UI)
│   ├── src/
│   │   ├── components/     # UI Components (Common, Support, Admin)
│   │   ├── pages/          # Admin & Client Pages
│   │   ├── styles/         # Global CSS & Tailwind Config
│   │   └── services/       # API Clients
├── infra/                  # Docker & Infrastructure Config
└── services/               # Microservices Backend
    ├── api-gateway/        # Central Entry Point
    ├── auth-service/       # Identity Management
    ├── product-service/    # Inventory & Product Logic
    └── chat-service/       # Real-time Communication
```

---

## 📄 Tài liệu dự án

- [Sơ đồ Cơ sở dữ liệu (Database Schema)](./docs/database_schema.md)
- [Kế hoạch Phân công Công việc](./docs/work_assignment.md)

## 👨‍💻 Đội ngũ phát triển (Team 18)

- **Phan Nhật Quang**: Phụ trách Auth Service, API Gateway, Product Service, Chat Service & Admin UI.
- **Thái Bảo**: Phụ trách Cart Service, Order Service & Notification Service.

---

## 📝 Ghi chú & Liên hệ

Dự án đang trong giai đoạn hoàn thiện các tính năng nâng cao như thanh toán online và hệ thống gợi ý sản phẩm. Mọi ý kiến đóng góp vui lòng liên hệ qua email quản trị tại [pnquangcn0406@gmail.com](mailto:pnquangcn0406@gmail.com).
---

_© 2024 ELPPA Project - Nhom 18 KTTKPM - IUH_

Use the built-in continuous integration in GitLab.

* [Get started with GitLab CI/CD](https://docs.gitlab.com/ci/quick_start/)
* [Analyze your code for known vulnerabilities with Static Application Security Testing (SAST)](https://docs.gitlab.com/user/application_security/sast/)
* [Deploy to Kubernetes, Amazon EC2, or Amazon ECS using Auto Deploy](https://docs.gitlab.com/topics/autodevops/requirements/)
* [Use pull-based deployments for improved Kubernetes management](https://docs.gitlab.com/user/clusters/agent/)
* [Set up protected environments](https://docs.gitlab.com/ci/environments/protected_environments/)

***

# Editing this README

When you're ready to make this README your own, just edit this file and use the handy template below (or feel free to structure it however you want - this is just a starting point!). Thanks to [makeareadme.com](https://www.makeareadme.com/) for this template.

## Suggestions for a good README

Every project is different, so consider which of these sections apply to yours. The sections used in the template are suggestions for most open source projects. Also keep in mind that while a README can be too long and detailed, too long is better than too short. If you think your README is too long, consider utilizing another form of documentation rather than cutting out information.

## Name
Choose a self-explaining name for your project.

## Description
Let people know what your project can do specifically. Provide context and add a link to any reference visitors might be unfamiliar with. A list of Features or a Background subsection can also be added here. If there are alternatives to your project, this is a good place to list differentiating factors.

## Badges
On some READMEs, you may see small images that convey metadata, such as whether or not all the tests are passing for the project. You can use Shields to add some to your README. Many services also have instructions for adding a badge.

## Visuals
Depending on what you are making, it can be a good idea to include screenshots or even a video (you'll frequently see GIFs rather than actual videos). Tools like ttygif can help, but check out Asciinema for a more sophisticated method.

## Installation
Within a particular ecosystem, there may be a common way of installing things, such as using Yarn, NuGet, or Homebrew. However, consider the possibility that whoever is reading your README is a novice and would like more guidance. Listing specific steps helps remove ambiguity and gets people to using your project as quickly as possible. If it only runs in a specific context like a particular programming language version or operating system or has dependencies that have to be installed manually, also add a Requirements subsection.

## Usage
Use examples liberally, and show the expected output if you can. It's helpful to have inline the smallest example of usage that you can demonstrate, while providing links to more sophisticated examples if they are too long to reasonably include in the README.

## Support
Tell people where they can go to for help. It can be any combination of an issue tracker, a chat room, an email address, etc.

## Roadmap
If you have ideas for releases in the future, it is a good idea to list them in the README.

## Contributing
State if you are open to contributions and what your requirements are for accepting them.

For people who want to make changes to your project, it's helpful to have some documentation on how to get started. Perhaps there is a script that they should run or some environment variables that they need to set. Make these steps explicit. These instructions could also be useful to your future self.

You can also document commands to lint the code or run tests. These steps help to ensure high code quality and reduce the likelihood that the changes inadvertently break something. Having instructions for running tests is especially helpful if it requires external setup, such as starting a Selenium server for testing in a browser.

## Authors and acknowledgment
Show your appreciation to those who have contributed to the project.

## License
For open source projects, say how it is licensed.

## Project status
If you have run out of energy or time for your project, put a note at the top of the README saying that development has slowed down or stopped completely. Someone may choose to fork your project or volunteer to step in as a maintainer or owner, allowing your project to keep going. You can also make an explicit request for maintainers.
>>>>>>> gitlab/main
