addEventListener("fetch", event => {
  event.respondWith(handleRequest(event));
});

async function handleRequest(event) {
  const req = event.request;
  if (req.method !== "GET") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const url = new URL(req.url);
    const originalUrl = url.searchParams.get("url");

    if (!originalUrl || !originalUrl.startsWith("http")) {
      return new Response("Invalid URL parameter", { status: 400 });
    }

    const { siteKey, modelCode } = parseUrl(originalUrl);
    if (!siteKey) {
      return serveHtmlPage("https://3dmodelsproject.pages.dev/default.html");
    }

    const siteData = await getSiteDataFromKV(siteKey, event);
    if (!siteData) {
      return new Response("Site configuration not found", { status: 404 });
    }

    const modelData = siteData.models[modelCode] || null;
    if (!modelData) {
      return serveHtmlPage("https://3dmodelsproject.pages.dev/default.html");
    }

    return serveWebXRPage(modelData);
  } catch (error) {
    return new Response(`Internal Server Error: ${error.message}`, { status: 500 });
  }
}

function parseUrl(url) {
  const sites = {
    "configurador.audi.pt": "configurador.audi.pt",
    "worten.pt": "worten.pt/produtos"
  };
  const hostname = new URL(url).hostname.replace("www.", "");

  for (const [domain, siteKey] of Object.entries(sites)) {
    if (hostname.includes(domain)) {
      const modelCodeMatch = url.match(/(?:20A|30A|40A|50B|\d{7})/);
      return { siteKey, modelCode: modelCodeMatch ? modelCodeMatch[0] : null };
    }
  }
  return { siteKey: null, modelCode: null };
}

async function getSiteDataFromKV(siteKey, event) {
  try {
    const rawData = await event.env.binding.get(siteKey);
    return rawData ? JSON.parse(rawData) : null;
  } catch {
    return null;
  }
}

async function serveHtmlPage(pageUrl) {
  const response = await fetch(pageUrl);
  return new Response(await response.text(), { headers: { "Content-Type": "text/html" } });
}

async function serveWebXRPage(modelData) {
  const xrHtml = await fetch("https://3dmodelsproject.pages.dev/webxr.html");
  let content = await xrHtml.text();

  const modelJson = encodeURIComponent(JSON.stringify(modelData));

  content = content.replace("</body>", `
    <script>
      const params = new URLSearchParams();
      params.set("model", "${modelJson}");
      window.history.replaceState({}, "", "?" + params.toString());
    </script>
  </body>`);

  return new Response(content, { headers: { "Content-Type": "text/html" } });
}
