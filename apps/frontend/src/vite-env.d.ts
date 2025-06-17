/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ENABLE_VOICE: string
  readonly VITE_API_URL: string
  readonly VITE_WEBSOCKET_URL: string
  readonly VITE_ELEVENLABS_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
