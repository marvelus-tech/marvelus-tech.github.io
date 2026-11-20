Play page. The microphone is the first path. The 1992 debate loads when you open it.

Regenerate baked JSON, HTML, and audio from marvelus-tech/contxt:

  PAGES_PLAY_DIR=/path/to/marvelus-tech.github.io/contxt/play npm run bake:play

UI source of truth: contxt repo web/play/. The baked debate uses fixture research plus offline keyword context (0 Tavily requests). Leave mic-config.json tokenUrl empty until a token server is deployed, then set it to that server's /api/mic/token URL. The permanent Deepgram key never belongs in this folder.
