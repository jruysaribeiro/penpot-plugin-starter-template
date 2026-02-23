<script lang="ts">
  import { page } from "$app/stores";
  $: manifestUrl = `${$page.url.origin}/manifest.json`;
</script>

<main>
  <h1>Matilha Collective Tools</h1>
  <p>Penpot AI Plugin - Development Server</p>

  <div class="instructions">
    <h2>How to use:</h2>
    <ol>
      <li>Open Penpot</li>
      <li>Go to Plugins → Install Plugin</li>
      <li>Enter this URL: <code>{manifestUrl}</code></li>
    </ol>
  </div>

  <div class="links">
    <a href="/manifest.json">📄 manifest.json</a>
    <a href="/plugin.js">⚙️ plugin.js</a>
    <a href="/index.html">🎨 index.html</a>
    <a href="/api/gemini">🤖 API endpoint</a>
  </div>
</main>

<style>
  main {
    max-width: 600px;
    margin: 2rem auto;
    padding: 2rem;
    font-family:
      system-ui,
      -apple-system,
      sans-serif;
  }

  h1 {
    color: #333;
    margin-bottom: 0.5rem;
  }

  p {
    color: #666;
    margin-bottom: 2rem;
  }

  .instructions {
    background: #f5f5f5;
    padding: 1.5rem;
    border-radius: 8px;
    margin-bottom: 2rem;
  }

  .instructions h2 {
    margin-top: 0;
    font-size: 1.25rem;
  }

  code {
    background: #e0e0e0;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-family: monospace;
    word-break: break-all;
  }

  .links {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .links a {
    padding: 0.75rem 1.25rem;
    background: #007bff;
    color: white;
    text-decoration: none;
    border-radius: 6px;
    font-size: 0.9rem;
  }

  .links a:hover {
    background: #0056b3;
  }

  ol {
    line-height: 1.8;
  }
</style>
