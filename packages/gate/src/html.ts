/* Variant-A gate HTML, server-rendered.
 *
 * Two submission paths supported:
 *   - JS path (default): inline script intercepts form submit, fetches
 *     /__gate/auth as application/json, renders error inline without a
 *     reload, fades out and navigates on success.
 *   - No-JS fallback: native form post to /__gate/auth — server returns
 *     either gate-with-error HTML or the loading interstitial HTML.
 *
 * The `error` flag is only used for the no-JS path (server-rendered with
 * the error visible on first paint). The JS path always boots clean and
 * surfaces errors via the same error element.
 */

const TEMPLATE = (error: boolean): string => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>lewis.health</title>
    <meta name="robots" content="noindex, nofollow" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..600;1,9..144,300..400&family=Inter+Tight:wght@300;400;500&display=swap"
      rel="stylesheet"
    />
    <style>
      :root {
        --paper: #e6e5dd;
        --paper-bright: #fffefb;
        --ink: #1b1814;
        --ink-soft: #5a5448;
        --ink-faint: #8a8576;
        --accent: #2c4a6b;
        --rule: #c2bfae;
        --rule-soft: #e4dcc8;
        --serif: "Fraunces", Georgia, serif;
        --sans: "Inter Tight", -apple-system, system-ui, sans-serif;
        --ease-out: cubic-bezier(0.2, 0.8, 0.2, 1);
      }
      * { box-sizing: border-box; }
      html, body {
        margin: 0;
        padding: 0;
        background: var(--paper);
        color: var(--ink);
        font-family: var(--sans);
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
      body {
        min-height: 100svh;
        display: grid;
        place-items: center;
        padding: 32px;
      }
      .gate {
        width: 100%;
        max-width: 460px;
        text-align: center;
        animation: fadeUp 700ms var(--ease-out) both;
      }
      .wordmark {
        font-family: var(--serif);
        font-weight: 400;
        font-size: 56px;
        letter-spacing: -0.025em;
        line-height: 1;
        color: var(--ink);
        margin: 0;
      }
      .wordmark .tld {
        font-style: italic;
        font-weight: 300;
        color: var(--ink-soft);
      }
      .tagline {
        margin-top: 18px;
        font-family: var(--serif);
        font-style: italic;
        font-weight: 300;
        font-size: 17px;
        line-height: 1.5;
        color: var(--ink-soft);
      }
      .tagline em {
        font-style: italic;
        font-weight: 300;
        color: var(--accent);
      }
      form {
        margin-top: 56px;
        display: flex;
        align-items: center;
        gap: 8px;
        background: var(--paper-bright);
        border: 1px solid var(--rule-soft);
        border-radius: 14px;
        padding: 8px 8px 8px 22px;
        box-shadow:
          0 1px 2px rgba(40, 30, 20, 0.04),
          0 6px 16px rgba(40, 30, 20, 0.08),
          0 24px 48px rgba(40, 30, 20, 0.06);
        transition: box-shadow 220ms var(--ease-out), border-color 220ms var(--ease-out);
      }
      form:focus-within {
        border-color: var(--accent);
        box-shadow:
          0 0 0 3px rgba(44, 74, 107, 0.12),
          0 1px 2px rgba(40, 30, 20, 0.05),
          0 8px 20px rgba(40, 30, 20, 0.1);
      }
      input[type="password"] {
        flex: 1;
        min-width: 0;
        background: transparent;
        border: none;
        outline: none;
        color: var(--ink);
        font-family: var(--sans);
        font-size: 16px;
        letter-spacing: -0.005em;
        padding: 6px 0;
      }
      input::placeholder { color: var(--ink-faint); }
      button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: none;
        background: var(--accent);
        color: var(--paper);
        font-family: var(--sans);
        font-size: 13px;
        font-weight: 500;
        letter-spacing: 0.005em;
        padding: 10px 20px;
        border-radius: 8px;
        cursor: pointer;
        transition: background 160ms var(--ease-out), transform 120ms var(--ease-out);
      }
      button:hover { background: #3a5a7c; }
      button:active { transform: scale(0.98); }
      .footnote {
        margin-top: 36px;
        font-size: 12.5px;
        line-height: 1.5;
        color: var(--ink-faint);
        letter-spacing: 0.01em;
      }
      .footnote em {
        font-family: var(--serif);
        font-style: italic;
        font-weight: 300;
      }
      .gate-error {
        margin-top: 14px;
        font-size: 13px;
        color: #8a3a2a;
        font-family: var(--serif);
        font-style: italic;
        opacity: 0;
        transition: opacity 220ms var(--ease-out);
      }
      .gate-error.show { opacity: 1; }
      form.checking input[type="password"] {
        opacity: 0.55;
      }
      form.checking button {
        opacity: 0.9;
      }
      main.gate {
        transition: opacity 360ms var(--ease-out);
      }
      main.gate.done {
        opacity: 0;
      }
      @keyframes fadeUp {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: none; }
      }
      @media (prefers-reduced-motion: reduce) {
        .gate { animation: none; transition: none; }
        .gate-error { transition: none; }
      }
      @media (max-width: 480px) {
        .wordmark { font-size: 44px; }
        form { padding: 6px 6px 6px 16px; }
        button { padding: 8px 14px; font-size: 12.5px; }
      }
    </style>
  </head>
  <body>
    <main class="gate">
      <h1 class="wordmark">lewis.<span class="tld">health</span></h1>
      <p class="tagline">Some treatments don&rsquo;t exist <em>anywhere else.</em></p>
      <form id="gate-form" action="/__gate/auth" method="POST" autocomplete="off">
        <input
          type="password"
          name="password"
          placeholder="Password"
          aria-label="Access password"
          autofocus
          required
        />
        <button type="submit">Enter</button>
      </form>
      <p class="gate-error${error ? " show" : ""}" id="gate-error" role="alert">${error ? "That isn&rsquo;t it. Try again." : ""}</p>
      <p class="footnote">Coming soon &middot; <em>fall &rsquo;26</em></p>
    </main>
    <script>
      (function () {
        var form = document.getElementById("gate-form");
        var input = form.querySelector('input[name="password"]');
        var button = form.querySelector("button");
        var label = button.textContent;
        var errorEl = document.getElementById("gate-error");
        var gate = document.querySelector("main.gate");

        function showError(msg) {
          errorEl.textContent = msg;
          requestAnimationFrame(function () { errorEl.classList.add("show"); });
        }
        function hideError() { errorEl.classList.remove("show"); }
        function setChecking(on) {
          if (on) {
            form.classList.add("checking");
            button.disabled = true;
            button.textContent = "Checking…";
          } else {
            form.classList.remove("checking");
            button.disabled = false;
            button.textContent = label;
          }
        }

        form.addEventListener("submit", function (e) {
          e.preventDefault();
          hideError();
          setChecking(true);
          fetch("/__gate/auth", {
            method: "POST",
            body: new FormData(form),
            headers: { "Accept": "application/json" },
            credentials: "same-origin",
          }).then(function (res) {
            if (res.ok) {
              gate.classList.add("done");
              setTimeout(function () { window.location.replace("/"); }, 380);
              return;
            }
            setChecking(false);
            input.value = "";
            input.focus();
            showError("That isn’t it. Try again.");
          }).catch(function () {
            setChecking(false);
            showError("Couldn’t reach the server.");
          });
        });
      })();
    </script>
  </body>
</html>`;

export function gateHtml(opts: { error?: boolean } = {}): string {
  return TEMPLATE(opts.error === true);
}

/* Shown for ~700ms between successful password submission and the browser
 * landing on `/`. Bridges the visual gap between the gate (form centered on
 * cream paper) and the SPA shell (different layout, JS still loading) so the
 * transition reads as one smooth motion instead of a layout jolt. */
export function loadingHtml(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>lewis.health</title>
    <meta name="robots" content="noindex, nofollow" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@1,9..144,300..400&display=swap"
      rel="stylesheet"
    />
    <style>
      :root {
        --paper: #e6e5dd;
        --ink-soft: #5a5448;
        --serif: "Fraunces", Georgia, serif;
        --ease-out: cubic-bezier(0.2, 0.8, 0.2, 1);
      }
      * { box-sizing: border-box; }
      html, body {
        margin: 0;
        padding: 0;
        background: var(--paper);
        color: var(--ink-soft);
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
      body {
        min-height: 100svh;
        display: grid;
        place-items: center;
      }
      .loading {
        font-family: var(--serif);
        font-style: italic;
        font-weight: 300;
        font-size: 22px;
        letter-spacing: 0.005em;
        opacity: 0;
        animation: fade 320ms var(--ease-out) forwards;
      }
      @keyframes fade {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @media (prefers-reduced-motion: reduce) {
        .loading { animation: none; opacity: 1; }
      }
    </style>
  </head>
  <body>
    <p class="loading">Loading&hellip;</p>
    <script>setTimeout(function(){window.location.replace("/");},700);</script>
    <noscript><meta http-equiv="refresh" content="1;url=/" /></noscript>
  </body>
</html>`;
}
