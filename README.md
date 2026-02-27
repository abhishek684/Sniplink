<!-- 
  ✨ Sniplink README ✨
  You can render this file using GitHub's markdown renderer or view it directly on GitHub
-->

<div align="center">
  <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Link.png" alt="Link" width="100" />

  # ⚡ Sniplink

  **Shorten Links. <span style="color: #6c5ce7;">Track Everything.</span>**

  [![React](https://img.shields.io/badge/React-18.2.0-blue.svg?style=for-the-badge&logo=react)](https://reactjs.org/)
  [![Vite](https://img.shields.io/badge/Vite-5.0.8-646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
  [![Express](https://img.shields.io/badge/Express-4.18.2-000000.svg?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
  [![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E.svg?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)

  *A Modern, Fast, and Feature-Rich URL Shortener SaaS Application built with the PERN (Postgres, Express, React, Node) stack.*

</div>

<br/>

## ✨ Explore The Features

<div align="center">
  <table>
    <tr>
      <td align="center" width="33%">
        <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Link.png" width="50" /><br/>
        <b>Instant Short Links</b><br/>Create clean, shareable short URLs in one click.
      </td>
      <td align="center" width="33%">
        <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Bar%20Chart.png" width="50" /><br/>
        <b>Click Analytics</b><br/>Track clicks, referrers, and browsers in real-time.
      </td>
      <td align="center" width="33%">
        <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Activities/Artist%20Palette.png" width="50" /><br/>
        <b>Custom Aliases</b><br/>Personalize your short links with custom slugs.
      </td>
    </tr>
    <tr>
      <td align="center" width="33%">
        <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Mobile%20Phone.png" width="50" /><br/>
        <b>QR Codes</b><br/>Generate scannable QR codes for any link.
      </td>
      <td align="center" width="33%">
        <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Travel%20and%20places/Alarm%20Clock.png" width="50" /><br/>
        <b>Link Expiry</b><br/>Set expiration dates on any link automatically.
      </td>
      <td align="center" width="33%">
        <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Pencil.png" width="50" /><br/>
        <b>Link Editor</b><br/>Edit your links anytime — update settings easily.
      </td>
    </tr>
  </table>
</div>

<br/>

## 🛠️ Tech Stack

### Frontend 🎨
- **React.js** (v18)
- **Vite** (Next Generation Frontend Tooling)
- **React Router v6**
- **Context API** (Auth & Theme State Management)

### Backend ⚙️
- **Node.js & Express.js**
- **Supabase** (PostgreSQL Database & BaaS)
- **JWT** (JSON Web Tokens Authentication)
- **Resend** (OTP Email Delivery)
- Instamojo (Payment Gateway Integration)

<img width="1888" height="894" alt="image" src="https://github.com/user-attachments/assets/2872c4c7-0ff6-44ed-92d6-3859c71926e0" />
<br/>
<img width="1918" height="905" alt="image" src="https://github.com/user-attachments/assets/eb9a62ea-1e7f-47ae-a7f5-341e0c3eff16" />
<br/>
<img width="1906" height="884" alt="image" src="https://github.com/user-attachments/assets/3869513c-f8bc-4b73-9f56-fb684f84d453" />
<br/>
<img width="1886" height="878" alt="image" src="https://github.com/user-attachments/assets/927a4ec3-5f3a-409a-831c-40e51efe50eb" />
<br/>
<img width="1919" height="875" alt="image" src="https://github.com/user-attachments/assets/f98a8768-594e-412f-ad07-84751577b8d9" />

 

<br/>

## 🚀 Quick Start Guide

Follow these steps to get a local copy up and running safely.

### 1️⃣ Clone the repository
```bash
git clone https://github.com/your-username/sniplink.git
cd sniplink
```

### 2️⃣ Backend Setup
```bash
# Navigate to the server directory
cd server

# Install dependencies
npm install

# Create a .env file based on the environment variables mentioned below
# Setup your Supabase, Resend, and Payment Gateway credentials

# Start the development server
npm run dev
```

### 3️⃣ Frontend Setup
```bash
# Open a new terminal and navigate to the client directory
cd client

# Install dependencies
npm install

# Create a .env file inside client directory
# Add: VITE_API_URL=http://localhost:5000/api
# Add: VITE_BASE_URL=http://localhost:5000

# Start the Vite development server
npm run dev
```

<br/>

## 🔐 Environment Variables

You need to set up the `.env` file in the **server** directory with the following variables:

```env
PORT=5000
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_service_role_key
JWT_SECRET=your_super_secret_jwt_key
RESEND_API_KEY=your_resend_api_key

# Payment Gateway (Instamojo/Razorpay params)
PAYMENT_API_KEY=your_api_key
PAYMENT_AUTH_TOKEN=your_auth_token
```

<br/>

## 💎 Pricing Tiers

Sniplink uses a simple Freemium model:

| Features | Free (₹0) | Premium (₹9 One-time) |
| :--- | :---: | :---: |
| Short Links | Up to 5 | **Unlimited** |
| Analytics Dashboard | ✅ | ✅ |
| Click Tracking | ✅ | ✅ |
| Custom Aliases | ❌ | ✅ |
| QR Code Generation | ❌ | ✅ |
| Link Expiry & Editor | ❌ | ✅ |

<br/>

## 🌟 Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**! ❤️

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

<br/>

## 🛡️ License

Distributed under the MIT License. See `LICENSE` for more information.

---
<div align="center">
  <p>Built with ❤️ and ⚡ by Abhi</p>
  <p>
    <a href="https://www.instagram.com/st_abhi_/"><img src="https://img.shields.io/badge/Instagram-E4405F?style=for-the-badge&logo=instagram&logoColor=white" alt="Instagram" /></a>
  </p>
</div>
