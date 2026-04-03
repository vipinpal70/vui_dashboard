# VUI Dashboard

A premium, modern, and highly functional administration dashboard built with **Next.js 15**, **Prisma**, and **Tailwind CSS**. Designed for high performance and seamless team collaboration.

## 🚀 Features

- **Full-featured RBAC**: Robust Role-Based Access Control using Prisma and custom role definitions.
- **Team Management**: Effortless creation and management of teams, including membership roles and permissions.
- **User Authentication**: Secure authentication system with integrated signup/signin flows.
- **Background Tasks**: Powerful job processing with **BullMQ** and **Redis** for emails and long-running operations.
- **Modern UI/UX**: Aesthetic design with **Tailwind CSS**, including responsive layouts and interactive components.
- **Integration Ready**: Pre-built hooks for services like **Resend** for transactional emails and **WhatsApp** for notifications.

## 🛠 Tech Stack

- **Framework**: [Next.js 15+](https://nextjs.org/)
- **Database**: [Prisma ORM](https://www.prisma.io/) with MongoDB/PostgreSQL
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Job Queue**: [BullMQ](https://docs.bullmq.io/) & [Redis](https://redis.io/)
- **Authentication**: Custom Next.js Auth
- **Emails**: [Resend](https://resend.com/)

## 🏁 Getting Started

### Prerequisites

- Node.js 18.x or later
- Redis server (for BullMQ)
- Database (MongoDB or PostgreSQL)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/vipinpal70/vui_dashboard.git
   cd vui_dashboard
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory and add your database URL, Redis host/port, and other service credentials.
   (Refer to `.env.example` if available).

4. Initialize the database:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. Run the development server:
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 📄 License

Individual/Company Proprietary - [vipinpal70](https://github.com/vipinpal70)
