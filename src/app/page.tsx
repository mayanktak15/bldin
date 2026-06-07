'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRemoteBrowser } from '../hooks/useRemoteBrowser';
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  ChevronRight,
  Info
} from 'lucide-react';

export default function Home() {
  const {
    isConnected,
    isBrowserRunning,
    browserState,
    latency,
    error,
    startBrowser,
    stopBrowser,
    navigate,
    goBack,
    goForward,
    reload,
    sendMouseMove,
    sendMouseDown,
    sendMouseUp,
    sendType,
    sendKeyPress,
    sendScroll,
    sendResize,
  } = useRemoteBrowser();

  const [inputUrl, setInputUrl] = useState('https://www.google.com');
  const [viewportWidth, setViewportWidth] = useState(1280);
  const [viewportHeight, setViewportHeight] = useState(720);
  const [isStarting, setIsStarting] = useState(false);
  
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  // Monitor loading state
  useEffect(() => {
    if (browserState.image) {
      setIsStarting(false);
    }
  }, [browserState.image]);

  // Sync url bar input when remote browser navigates
  useEffect(() => {
    if (browserState.url) {
      setInputUrl(browserState.url);
    }
  }, [browserState.url]);

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) return;
    setIsStarting(true);
    startBrowser(inputUrl, viewportWidth, viewportHeight);
  };

  const handleStop = () => {
    stopBrowser();
    setIsStarting(false);
  };

  const handleNavigate = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputUrl.trim()) {
      navigate(inputUrl);
    }
  };

  // Coordinates mapping
  const getCoordinates = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!imgRef.current) return { x: 0, y: 0 };
    const rect = imgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Scale coordinates proportionally
    const scaledX = Math.round((x / rect.width) * viewportWidth);
    const scaledY = Math.round((y / rect.height) * viewportHeight);
    
    return { x: scaledX, y: scaledY };
  };

  // Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!isBrowserRunning) return;
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    
    let button: 'left' | 'right' | 'middle' = 'left';
    if (e.button === 1) button = 'middle';
    if (e.button === 2) button = 'right';

    containerRef.current?.focus();
    isDraggingRef.current = true;
    sendMouseDown(x, y, button);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!isBrowserRunning || !isDraggingRef.current) return;
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    sendMouseMove(x, y);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!isBrowserRunning) return;
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    
    let button: 'left' | 'right' | 'middle' = 'left';
    if (e.button === 1) button = 'middle';
    if (e.button === 2) button = 'right';

    isDraggingRef.current = false;
    sendMouseUp(x, y, button);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  const handleWheel = (e: React.WheelEvent<HTMLImageElement>) => {
    if (!isBrowserRunning) return;
    sendScroll(e.deltaX, e.deltaY);
  };

  // Keyboard Handler
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isBrowserRunning) return;

    const systemKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Backspace', 'Tab', 'Space', ' ', 'PageUp', 'PageDown', 'End', 'Home', 'Escape', 'Enter'];
    if (systemKeys.includes(e.key)) {
      e.preventDefault();
    }

    if (e.key.length === 1) {
      sendType(e.key);
    } else {
      sendKeyPress(e.key);
    }
  };

  // Preset Handlers
  const loadPreset = (url: string) => {
    setInputUrl(url);
    if (isBrowserRunning) {
      navigate(url);
    } else {
      setIsStarting(true);
      startBrowser(url, viewportWidth, viewportHeight);
    }
  };

  const handleResizePreset = (w: number, h: number) => {
    setViewportWidth(w);
    setViewportHeight(h);
    if (isBrowserRunning) {
      sendResize(w, h);
    }
  };

  return (
    <div className="min-h-screen flex flex-col p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Title Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">
            bldin assignment
          </h1>
          <p className="text-xs text-slate-400">Remote Browser Control Panel</p>
        </div>

        {/* Status badges */}
        <div className="flex items-center gap-3 text-xs flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-900 rounded-full border border-slate-800">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
            <span className="text-slate-300">{isConnected ? 'Server Connected' : 'Server Disconnected'}</span>
          </div>

          {isBrowserRunning && (
            <div className="flex items-center gap-2 px-3 py-1 bg-indigo-950/40 text-indigo-300 rounded-full border border-indigo-800/40">
              <span>Latency: {latency}ms</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1">
        
        {/* Left Side: Simple Controller Panel */}
        <section className="lg:col-span-1 flex flex-col gap-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-slate-200">Control Panel</h2>

            {/* Launch Browser Section */}
            {!isBrowserRunning ? (
              <form onSubmit={handleStart} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400">Target URL</label>
                  <input
                    type="text"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    placeholder="google.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                {/* Viewport size config */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-slate-400">Resolution</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleResizePreset(1280, 720)}
                      className={`py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                        viewportWidth === 1280
                          ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/50'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      720p (1280x720)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleResizePreset(1920, 1080)}
                      className={`py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                        viewportWidth === 1920
                          ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/50'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      1080p (1920x1080)
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!isConnected || isStarting}
                  className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isStarting ? 'Launching...' : 'Start Browser'}
                </button>
              </form>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Active Session Running</span>
                </div>
                <button
                  onClick={handleStop}
                  className="w-full bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 font-medium py-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  Stop Browser
                </button>
              </div>
            )}

            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 rounded-lg">
                {error}
              </div>
            )}
          </div>

          {/* Quick Presets */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col gap-2">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Preset Sites</h3>
            {[
              { name: 'Google', url: 'https://www.google.com' },
              { name: 'Hacker News', url: 'https://news.ycombinator.com' },
              { name: 'GitHub', url: 'https://github.com' },
              { name: 'Wikipedia', url: 'https://wikipedia.org' },
            ].map((site) => (
              <button
                key={site.name}
                onClick={() => loadPreset(site.url)}
                className="w-full text-left bg-slate-950 hover:bg-slate-800 border border-slate-800/80 rounded-lg px-3 py-2 text-xs text-slate-300 transition-colors flex justify-between items-center group cursor-pointer"
              >
                <span>{site.name}</span>
                <ChevronRight size={12} className="text-slate-500 group-hover:text-slate-300 transition-transform group-hover:translate-x-0.5" />
              </button>
            ))}
          </div>
        </section>

        {/* Right Side: Virtual Browser Viewport */}
        <section className="lg:col-span-3 flex flex-col gap-4">
          
          {/* Address Navigation Bar (renders when browser is active) */}
          {isBrowserRunning && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex items-center gap-3">
              <div className="flex gap-1 bg-slate-950 border border-slate-800 rounded-lg p-1">
                <button
                  onClick={goBack}
                  className="p-1.5 hover:bg-slate-800 text-slate-300 rounded-md transition-colors cursor-pointer"
                  title="Back"
                >
                  <ArrowLeft size={16} />
                </button>
                <button
                  onClick={goForward}
                  className="p-1.5 hover:bg-slate-800 text-slate-300 rounded-md transition-colors cursor-pointer"
                  title="Forward"
                >
                  <ArrowRight size={16} />
                </button>
                <button
                  onClick={reload}
                  className="p-1.5 hover:bg-slate-800 text-slate-300 rounded-md transition-colors cursor-pointer"
                  title="Reload"
                >
                  <RotateCw size={16} />
                </button>
              </div>

              {/* Address bar input */}
              <form onSubmit={handleNavigate} className="flex-1 flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-mono select-none">HTTP</span>
                  <input
                    type="text"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-14 pr-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                >
                  Go
                </button>
              </form>
            </div>
          )}

          {/* Dynamic Stream Canvas Card */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl flex-1 flex flex-col overflow-hidden">
            
            {/* Viewport header */}
            <div className="bg-slate-950 border-b border-slate-800 px-4 py-2 flex items-center justify-between text-xs text-slate-500 font-mono">
              <span className="flex items-center gap-1">
                🖥️ REMOTE STREAM ({viewportWidth}x{viewportHeight})
              </span>
              <span>
                {browserState.title || 'Blank Page'}
              </span>
            </div>

            {/* Viewport content */}
            <div
              ref={containerRef}
              tabIndex={isBrowserRunning ? 0 : -1}
              onKeyDown={handleKeyDown}
              className="flex-1 flex items-center justify-center bg-slate-950 focus:outline-none relative"
              style={{ minHeight: '480px' }}
            >
              {!isBrowserRunning ? (
                /* Offline state */
                <div className="flex flex-col items-center justify-center p-8 text-center max-w-sm">
                  <div className="text-3xl mb-3">🌐</div>
                  <h3 className="text-sm font-bold text-slate-200 mb-1">Browser offline</h3>
                  <p className="text-xs text-slate-400 mb-4">
                    Press start button to launch a headless browser inside Docker and begin control session.
                  </p>
                  <button
                    onClick={() => startBrowser(inputUrl, viewportWidth, viewportHeight)}
                    disabled={!isConnected || isStarting}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2 rounded-lg text-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isStarting ? 'Launching...' : 'Start Session'}
                  </button>
                </div>
              ) : isStarting && !browserState.image ? (
                /* Loading state */
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                  <p className="text-xs text-slate-400">Spawning remote chromium...</p>
                </div>
              ) : (
                /* Stream state */
                <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                  {/* Focus border visual cue */}
                  <div className="absolute inset-0 border border-indigo-500/0 focus-within:border-indigo-500/30 pointer-events-none transition-colors z-10"></div>
                  
                  {browserState.image ? (
                    <img
                      ref={imgRef}
                      src={browserState.image}
                      alt="Remote Browser Frame"
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onContextMenu={handleContextMenu}
                      onWheel={handleWheel}
                      className="w-full h-auto max-h-full object-contain cursor-crosshair border border-slate-900 select-none"
                    />
                  ) : (
                    <span className="text-xs text-slate-600">Waiting for first frame...</span>
                  )}

                  {/* Interaction note */}
                  <div className="absolute bottom-3 right-3 bg-slate-900/90 border border-slate-800 text-[10px] text-slate-400 px-2 py-1 rounded shadow pointer-events-none opacity-80 flex items-center gap-1.5">
                    <Info size={12} className="text-indigo-400" />
                    <span>Click image and type or scroll</span>
                  </div>
                </div>
              )}
            </div>

          </div>
        </section>

      </main>
    </div>
  );
}
