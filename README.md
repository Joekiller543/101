# 101: Web-To-Epub Ultimate

A robust, full-stack monorepo designed to crawl, sanitize, and convert web novels into strictly compliant EPUB files. This project leverages a Node.js backend for high-performance crawling and a React-based frontend for client-side EPUB generation and progress tracking.

---

## 🚀 Features

-   **Deep Crawling Engine:** Built with `cheerio` and `axios` to navigate Table of Contents (TOC) and extract content reliably.
-   **Strict Sanitization:** Custom parser converts messy web HTML into strict XHTML, ensuring EPUB 3.0 compatibility.
-   **Real-time Updates:** Integrated with `Socket.io` to provide live progress logs and chapter counts during the crawling process.
-   **Client-Side Generation:** Uses Web Workers and `JSZip` to bundle the EPUB in the browser, reducing server load.
-   **Resilient Storage:** Utilizes IndexedDB via `idb` to store chapter data, preventing data loss on page refreshes.
-   **Performance Optimized:** Implements `p-limit` for controlled concurrency and `react-window` for virtualized rendering of large chapter lists.

---

## 📂 Project Structure

This repository is organized as a monorepo using **npm workspaces**:

```text
101/
├── client/          # React (Vite) frontend application
│   ├── src/lib/     # EPUB generation & IndexedDB logic
│   └── src/store/   # Zustand state management
├── server/          # Node.js Express & Socket.io backend
│   ├── src/services/# Crawler and HTML parsing logic
│   └── src/utils/   # Network validation and DNS safety
└── package.json     # Monorepo configuration and scripts
```

---

## 🛠️ Local Development

### Prerequisites
-   Node.js (v18 or higher)
-   npm (v7 or higher)

### Setup
1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/101.git
    cd 101
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Run the project:**
    You can run both the client and server concurrently:
    ```bash
    npm run dev
    ```
    -   **Frontend:** `http://localhost:5173`
    -   **Backend:** `http://localhost:3000`

---

## 🌐 Netlify Deployment Guide

This project is optimized for deployment on Netlify. Due to the monorepo structure, follow these specific settings to ensure the React client builds correctly.

### 1. Client Deployment (Netlify Sites)

To deploy the **Frontend**:

1.  Log in to the [Netlify Dashboard](https://app.netlify.com/).
2.  Select **Add new site** > **Import an existing project**.
3.  Connect your GitHub repository.
4.  Configure the **Build settings**:
    *   **Base directory:** `client`
    *   **Build command:** `npm run build`
    *   **Publish directory:** `dist`
5.  **Environment Variables:**
    Add the following under **Site configuration > Environment variables**:
    | Key | Value | Description |
    | :--- | :--- | :--- |
    | `VITE_API_BASE_URL` | `https://your-api-url.com` | The URL of your deployed server (see below). |

### 2. Server Deployment (Notes)

The backend uses **Socket.io**, which requires a persistent connection. 
-   **Netlify Functions:** Standard serverless functions do not support WebSockets. 
-   **Recommended:** Deploy the `server` folder to a platform like **Render**, **Railway**, or **Fly.io**.
-   Ensure you set the `PORT` environment variable and point the Client's `VITE_API_BASE_URL` to this deployment.

---

## ⚙️ Environment Variables

### Client (`/client/.env`)
| Variable | Description | Default |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | The URL of the backend API | `http://localhost:3000` |

### Server (`/server/.env`)
| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | The port the server runs on | `3000` |

---

## 🧪 Tech Stack

**Frontend:**
-   **Framework:** React 18 (Vite)
-   **State Management:** Zustand
-   **Styling:** Tailwind-ready CSS / Lucide React Icons
-   **Storage:** IndexedDB (idb)
-   **Generation:** JSZip + Web Workers

**Backend:**
-   **Runtime:** Node.js (ES Modules)
-   **Framework:** Express
-   **Real-time:** Socket.io
-   **Scraping:** Cheerio, Axios
-   **Security:** DNS validation (isIpSafe) to prevent SSRF

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---
**Senior Technical Writer Note:** *Ensure that the Backend API allows CORS requests from your Netlify domain. You can configure this in `server/src/socket.js` and the Express CORS middleware.*