addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(req) {
  if (req.method !== "GET") {
      return new Response("Method Not Allowed", { status: 405 });
  }

  try {
      const url = new URL(req.url);
      const originalUrl = url.searchParams.get("url");

      if (!originalUrl || !originalUrl.startsWith("http")) {
          return new Response("Invalid request: Missing 'url' parameter", { status: 400 });
      }

      const { siteKey, modelCode } = parseUrl(originalUrl);
      if (!siteKey) {
          return serveHtmlPage("https://3dmodelsproject.pages.dev/default.html");
      }

      const siteData = await getSiteDataFromKV(siteKey);
      if (!siteData || !siteData.models[modelCode]) {
          return serveHtmlPage("https://3dmodelsproject.pages.dev/default.html");
      }

      return serveWebXRPage(modelCode, siteData.models[modelCode]);

  } catch (error) {
      console.error("🔥 Worker Error:", error);
      return new Response("Internal Server Error", { status: 500 });
  }
}

function parseUrl(url) {
  const sites = { "worten.pt": "worten.pt/produtos" };
  const hostname = new URL(url).hostname.replace("www.", "");

  for (const [domain, siteKey] of Object.entries(sites)) {
      if (hostname.includes(domain)) {
          const modelCodeMatch = url.match(/\d{7}/);
          return { siteKey, modelCode: modelCodeMatch ? modelCodeMatch[0] : null };
      }
  }
  return { siteKey: null, modelCode: null };
}

async function getSiteDataFromKV(siteKey) {
  try {
      const rawData = await binding.get(siteKey);
      return rawData ? JSON.parse(rawData) : null;
  } catch (err) {
      console.error("KV Fetch Error:", err);
      return null;
  }
}

async function serveHtmlPage(pageUrl) {
  const response = await fetch(pageUrl);
  return new Response(await response.text(), { headers: { "Content-Type": "text/html" } });
}

async function serveWebXRPage(modelCode, modelData) {
  const viewerHtml = await fetch("https://3dmodelsproject.pages.dev/webxr.html");
  let content = await viewerHtml.text();

  const modelDataEncoded = encodeURIComponent(JSON.stringify(modelData));
  content = content.replace("</body>", `
      <script>
          const params = new URLSearchParams(window.location.search);
          params.set("model", "${modelCode}");
          params.set("data", "${modelDataEncoded}");
          window.history.replaceState({}, "", "?" + params.toString());
      </script>
  </body>`);

  return new Response(content, { headers: { "Content-Type": "text/html" } });
}
