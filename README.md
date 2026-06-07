# BLD — SDE Intern Assignment: Remote Browser Control System

A high-performance, real-time remote browser control system (mini TeamViewer for a browser) built for the BLD SDE Intern Assignment. It enables starting a containerized Chromium browser locally, streaming its screen back to a web interface in real time, and fully interacting with it (clicks, typing, scrolling, history navigation).

---

## Architecture Overview

The system is structured as a client-server application optimized for ultra-low latency and smooth interactivity:

```mermaid
graph TD
    subgraph Frontend [Host Machine - Next.js 15]
        UI[Web Interface] <--> SC[Socket.IO Client]
        UI -->|Scales Mouse Coordinates| UI
    end
    
    subgraph Backend [Docker Container / Local Host - Node.js]
        SS[Socket.IO Server] <--> BM[Browser Session Manager]
        BM <-->|Playwright API| CR[Headless Chromium]
        BM -->|Screenshot Loop 150ms JPEG 50%| SS
    end

    SC <===[WebSockets / Socket.IO Protocol]===> SS
```

### 1. Frontend: Next.js 15 (App Router + TS + Tailwind CSS)
- Renders the dashboard and the interactive streaming viewport.
- Maps user inputs (clicks, drags, keyboard inputs, scroll wheels) to coordinates relative to the remote browser's viewport.
- Receives JPEG frames at ~6-7 FPS over WebSockets and renders them instantly.

### 2. Backend: Node.js (Express + TypeScript + Socket.IO + Playwright)
- Spawns Playwright Chromium instances on demand.
- Captures snapshots as optimized JPEG buffers (50% quality) to drastically cut down bandwidth usage.
- Listens to socket events and calls corresponding native Playwright APIs (`page.mouse.click`, `page.keyboard.type`, `page.mouse.wheel`, etc.) to control Chromium.
- Automatically handles process cleanup (`SIGINT`/`SIGTERM`) and socket disconnects to prevent zombie headless browser processes.

---

## Setup & Installation

### Option A: Running via Docker (Recommended)
This approach encapsulates the browser and its dependencies inside a Docker container using the official Playwright base image. No browser installations are required on your host machine.

1. **Start the backend server**:
   ```bash
   # From the project root (where docker-compose.yml is located)
   docker compose up --build
   ```
   The backend server will launch and listen on `http://localhost:5000`.

2. **Start the frontend client**:
   In a separate terminal tab at the root of the project:
   ```bash
   npm install
   npm run dev
   ```
   Open `http://localhost:3000` in your web browser.

---

### Option B: Running Locally (Host Fallback)
If you do not have Docker installed, the application is designed to fall back to running on your host machine.

1. **Start the backend server**:
   ```bash
   cd backend
   npm install
   # Ensure playwright chromium browser is installed on the host
   npx playwright install chromium
   npm run dev
   ```
   The backend will run on `http://localhost:5000`.

2. **Start the frontend client**:
   In another terminal tab at the root of the project:
   ```bash
   npm install
   npm run dev
   ```
   Open `http://localhost:3000` in your web browser.

---

## Design Decisions & Trade-Offs

### 1. Playwright vs Puppeteer vs Selenium
- **Decision**: Playwright.
- **Reason**: Playwright provides the fastest cold-start times for headless browsers, robust multi-platform drivers, out-of-the-box support for modern Web APIs, and a very clean mouse wheel scrolling API (`page.mouse.wheel`).

### 2. Socket.IO vs Raw WebSockets
- **Decision**: Socket.IO.
- **Reason**: Next.js App Router and Node.js require a robust transport protocol. Socket.IO brings built-in connection monitoring, auto-reconnection, binary data chunking, and namespace support.

### 3. Screenshot Streaming vs VNC/WebRTC
- **Decision**: Optimized JPEG Screenshot Loop (150ms interval, 50% Quality).
- **Reason**: Writing a full WebRTC pipeline or VNC frame buffer stream from scratch is too heavy for a 48-hour take-home test. Repeated JPEG screenshot capture provides an excellent balance:
  - **Size**: A 50% quality JPEG of a 1280x720 page is typically only **15KB - 30KB** (compared to **450KB+** for PNG).
  - **Compatibility**: Simply sets the `src` attribute of a standard `<img>` tag, avoiding DOM overhead or canvas canvas-draw delays.
  - **Latency**: Under 150ms round-trip time on localhost.

---

## Features & Interactivity

- **Scale-Adaptive Pointer**: Click coordinates are calculated relative to the displayed image size and scaled proportionally to the remote browser's logical resolution (`1280x720`).
- **Drag & Drop Support**: Tracks `mousedown`, `mousemove`, and `mouseup` to enable dragging sliders, scrollbars, and text selection.
- **Touch/Wheel Scroll**: Integrates standard scroll wheel support via `wheel` event handler, triggering native remote scroll.
- **Real-Time Latency Meter**: Calculates RTT (Round Trip Time) between frame requests to display real-time network latency.
- **Keyboard Redirects**: Captures control keys (e.g. Enter, Backspace, Tab, Arrows) and stops default host actions to redirect them to Chromium.
- **Memory Safety**: Disconnecting the browser page triggers a complete tear-down of the playwright page, context, and browser instance.

---

## Limitations & Future Improvements

- **Audio Streaming**: Headless browser screens do not stream audio out-of-the-box. Future work could run Chromium with Virtual Audio Cables (ALSA/PulseAudio) inside Docker and stream audio via WebRTC.
- **Frame Rate**: Screenshot streaming is capped at ~7 FPS to save bandwidth. Implementing H.264 video encoding using `ffmpeg` inside the container and streaming via WebRTC would support 30 FPS.
- **Co-browsing**: The current setup supports 1 browser instance per WebSocket client. It can be extended to support shared multiplayer sessions (co-browsing) by sharing the same browser context across multiple sockets.

---

## Screen Recording Demonstration Checklist

Use this list as a guide for your submission video:
- [ ] **Step 1**: Start the docker container (`docker compose up`) and the frontend app (`npm run dev`).
- [ ] **Step 2**: Open `http://localhost:3000` and verify the server status is **Connected** (emerald dot).
- [ ] **Step 3**: Click **Start Browser** (defaults to Google). Verify the chromium instance launches and frames stream back.
- [ ] **Step 4**: Click on the search input box, type `"BLD teambld.in"` and press `Enter`.
- [ ] **Step 5**: Click on the first search result to navigate.
- [ ] **Step 6**: Scroll down and up using your mouse wheel / trackpad to verify smooth scrolling.
- [ ] **Step 7**: Click **Stop Browser** and verify it cleans up cleanly.
