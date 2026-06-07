import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { Socket } from 'socket.io';
import fs from 'fs';

export class BrowserSession {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private screenshotInterval: NodeJS.Timeout | null = null;
  private socket: Socket;
  private width: number = 1280;
  private height: number = 720;
  private isProcessingScreenshot: boolean = false;

  constructor(socket: Socket) {
    this.socket = socket;
  }

  /**
   * Starts the Playwright browser session
   */
  async start(initialUrl: string = 'https://www.google.com') {
    if (this.browser) {
      await this.stop();
    }

    try {
      console.log(`[Session ${this.socket.id}] Starting browser...`);
      
      // Auto-detect system Google Chrome or Chromium if Playwright browser is not installed/supported
      let executablePath: string | undefined = undefined;
      const commonChromePaths = [
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/chromium-browser',
        '/usr/bin/chromium',
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
      ];

      for (const path of commonChromePaths) {
        if (fs.existsSync(path)) {
          console.log(`[Session ${this.socket.id}] Found system browser at: ${path}. Using as fallback.`);
          executablePath = path;
          break;
        }
      }

      // Launch Chromium / Chrome. --no-sandbox is required in Docker.
      this.browser = await chromium.launch({
        headless: true,
        executablePath,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process', // helps resource usage in container
          '--disable-gpu'
        ]
      });

      // Create browser context with defined viewport and typical user-agent
      this.context = await this.browser.newContext({
        viewport: { width: this.width, height: this.height },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        deviceScaleFactor: 1
      });

      this.page = await this.context.newPage();
      
      // Navigate to initial page
      const formattedUrl = this.formatUrl(initialUrl);
      console.log(`[Session ${this.socket.id}] Navigating to ${formattedUrl}`);
      await this.page.goto(formattedUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

      // Start screenshot streaming loop
      this.startStreaming();
      
      // Notify client that browser is ready
      this.socket.emit('browser-started', {
        url: this.page.url(),
        title: await this.page.title()
      });

      // Register page navigation listener to update URL on the client automatically
      this.page.on('framenavigated', async (frame) => {
        if (frame === this.page?.mainFrame()) {
          const url = this.page.url();
          const title = await this.page.title().catch(() => '');
          this.socket.emit('browser-navigated', { url, title });
        }
      });

    } catch (error: any) {
      console.error(`[Session ${this.socket.id}] Error starting browser:`, error);
      this.socket.emit('browser-error', { message: error.message || 'Failed to start browser' });
      await this.stop();
    }
  }

  /**
   * Formats string to valid URL
   */
  private formatUrl(url: string): string {
    let cleanUrl = url.trim();
    if (!cleanUrl) return 'https://www.google.com';
    if (!/^https?:\/\//i.test(cleanUrl)) {
      cleanUrl = 'https://' + cleanUrl;
    }
    return cleanUrl;
  }

  /**
   * Starts the screenshot streaming loop (JPEG compression)
   */
  private startStreaming() {
    if (this.screenshotInterval) {
      clearInterval(this.screenshotInterval);
    }

    // Capture screenshots every 150ms (approx 6.6 FPS)
    this.screenshotInterval = setInterval(async () => {
      if (!this.page || this.isProcessingScreenshot) return;

      this.isProcessingScreenshot = true;
      try {
        // Capture screenshot as JPEG with 50% quality to optimize network throughput and rendering speed
        const screenshotBuffer = await this.page.screenshot({
          type: 'jpeg',
          quality: 50,
        });

        if (this.page) {
          const url = this.page.url();
          const title = await this.page.title().catch(() => '');
          
          this.socket.emit('browser-frame', {
            image: screenshotBuffer.toString('base64'),
            url,
            title
          });
        }
      } catch (error) {
        // Ignore screenshot errors when page is navigating or closing
        // console.error('Screenshot error:', error);
      } finally {
        this.isProcessingScreenshot = false;
      }
    }, 150);
  }

  /**
   * Navigates the browser to a URL
   */
  async navigate(url: string) {
    if (!this.page) return;
    try {
      const formattedUrl = this.formatUrl(url);
      console.log(`[Session ${this.socket.id}] Navigating to: ${formattedUrl}`);
      await this.page.goto(formattedUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    } catch (error: any) {
      console.error(`[Session ${this.socket.id}] Navigation error:`, error.message);
      this.socket.emit('browser-error', { message: `Failed to load page: ${error.message}` });
    }
  }

  /**
   * Processes clicks
   */
  async click(x: number, y: number, button: 'left' | 'right' | 'middle' = 'left') {
    if (!this.page) return;
    try {
      // Scale incoming coordinates dynamically based on viewport size
      await this.page.mouse.click(x, y, { button, delay: 50 });
    } catch (error) {
      console.error('Click action error:', error);
    }
  }

  /**
   * Processes mouse move
   */
  async mouseMove(x: number, y: number) {
    if (!this.page) return;
    try {
      await this.page.mouse.move(x, y);
    } catch (error) {
      console.error('Mouse move action error:', error);
    }
  }

  /**
   * Processes mouse down
   */
  async mouseDown(x: number, y: number, button: 'left' | 'right' | 'middle' = 'left') {
    if (!this.page) return;
    try {
      await this.page.mouse.move(x, y);
      await this.page.mouse.down({ button });
    } catch (error) {
      console.error('Mouse down action error:', error);
    }
  }

  /**
   * Processes mouse up
   */
  async mouseUp(x: number, y: number, button: 'left' | 'right' | 'middle' = 'left') {
    if (!this.page) return;
    try {
      await this.page.mouse.move(x, y);
      await this.page.mouse.up({ button });
    } catch (error) {
      console.error('Mouse up action error:', error);
    }
  }

  /**
   * Processes text typing
   */
  async type(text: string) {
    if (!this.page) return;
    try {
      await this.page.keyboard.type(text, { delay: 30 });
    } catch (error) {
      console.error('Type action error:', error);
    }
  }

  /**
   * Processes specific key presses (e.g. Enter, Backspace, Arrow keys)
   */
  async keyPress(key: string) {
    if (!this.page) return;
    try {
      await this.page.keyboard.press(key);
    } catch (error) {
      console.error(`Key press action error (${key}):`, error);
    }
  }

  /**
   * Processes scrolling
   */
  async scroll(deltaX: number, deltaY: number) {
    if (!this.page) return;
    try {
      // Try native mouse wheel scroll first
      await this.page.mouse.wheel(deltaX, deltaY);
    } catch (error) {
      // Fallback: evaluate scroll on the page context if mouse wheel fails
      try {
        await this.page.evaluate(({ dx, dy }) => {
          window.scrollBy(dx, dy);
        }, { dx: deltaX, dy: deltaY });
      } catch (innerError) {
        console.error('Scroll fallback action error:', innerError);
      }
    }
  }

  /**
   * Navigates back in browser history
   */
  async goBack() {
    if (!this.page) return;
    try {
      await this.page.goBack({ waitUntil: 'domcontentloaded' });
    } catch (error) {
      console.warn('Go back action warning:', error);
    }
  }

  /**
   * Navigates forward in browser history
   */
  async goForward() {
    if (!this.page) return;
    try {
      await this.page.goForward({ waitUntil: 'domcontentloaded' });
    } catch (error) {
      console.warn('Go forward action warning:', error);
    }
  }

  /**
   * Reloads current page
   */
  async reload() {
    if (!this.page) return;
    try {
      await this.page.reload({ waitUntil: 'domcontentloaded' });
    } catch (error) {
      console.error('Reload action error:', error);
    }
  }

  /**
   * Resizes viewport size
   */
  async resize(width: number, height: number) {
    if (width <= 0 || height <= 0) return;
    this.width = width;
    this.height = height;
    if (this.page) {
      try {
        console.log(`[Session ${this.socket.id}] Resizing viewport to ${width}x${height}`);
        await this.page.setViewportSize({ width, height });
      } catch (error) {
        console.error('Resize viewport error:', error);
      }
    }
  }

  /**
   * Stops the browser session and cleans up resources
   */
  async stop() {
    console.log(`[Session ${this.socket.id}] Cleaning up session resources...`);
    
    if (this.screenshotInterval) {
      clearInterval(this.screenshotInterval);
      this.screenshotInterval = null;
    }

    try {
      if (this.page) {
        await this.page.close().catch(() => {});
        this.page = null;
      }
      if (this.context) {
        await this.context.close().catch(() => {});
        this.context = null;
      }
      if (this.browser) {
        await this.browser.close().catch(() => {});
        this.browser = null;
      }
    } catch (error) {
      console.error(`[Session ${this.socket.id}] Error cleaning up session:`, error);
    }
  }
}
