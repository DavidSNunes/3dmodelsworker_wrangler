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
      console.log("🚨 Invalid URL parameter:", originalUrl);
      return new Response("Invalid URL parameter", { status: 400 });
    }

    console.log("🌐 Received URL:", originalUrl);
    const { siteKey, modelCode } = parseUrl(originalUrl);
    
    console.log(`🔎 Parsed URL -> siteKey: ${siteKey}, modelCode: ${modelCode}`);

    if (!siteKey) {
      console.log("❌ SiteKey not found, serving default page.");
      return serveHtmlPage("https://3dmodelsproject.pages.dev/default.html");
    }

    const siteData = await getSiteDataFromKV(siteKey);
    console.log("📦 Retrieved KV Data:", siteData);

    if (!siteData) {
      console.log("❌ Site configuration not found in KV, serving default page.");
      return serveHtmlPage("https://3dmodelsproject.pages.dev/default.html");
    }

    if (!modelCode || !siteData.models[modelCode]) {
      console.log("⚠️ Model code missing or not found in KV, serving default page.");
      return serveHtmlPage(siteData.default || "https://3dmodelsproject.pages.dev/default.html");
    }

    console.log("✅ Model found! Serving WebXR page for model:", modelCode);
    return serveWebXRPage(siteData.models[modelCode]);
  } catch (error) {
    console.log("🔥 Internal Server Error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

function parseUrl(url) {
  const siteMappings = {
    "configurador.audi.pt": "configurador.audi.pt",
    "worten.pt": "worten.pt/produtos"
  };

  const parsedUrl = new URL(url);
  const hostname = parsedUrl.hostname.replace("www.", "");
  const siteKey = siteMappings[hostname] || null;

  // Extract modelCode from the URL
  const modelCodeMatch = url.match(/(?:20A|30A|40A|50B|\d{7})/);
  const modelCode = modelCodeMatch ? modelCodeMatch[0] : null;

  return { siteKey, modelCode };
}

async function getSiteDataFromKV(siteKey) {
  try {
    const rawData = await binding.get(siteKey);
    if (!rawData) {
      console.log(`⚠️ No data found in KV for key: ${siteKey}`);
      return null;
    }
    console.log(`✅ Data found in KV for key: ${siteKey}`);
    return JSON.parse(rawData);
  } catch (error) {
    console.log(`❌ KV Fetch Error for key ${siteKey}:`, error);
    return null;
  }
}

async function serveHtmlPage(pageUrl) {
  console.log("📄 Serving HTML Page:", pageUrl);
  const response = await fetch(pageUrl);
  return new Response(await response.text(), { headers: { "Content-Type": "text/html" } });
}

async function serveWebXRPage(modelData) {
  console.log("🕶️ Serving WebXR Page with model:", modelData);
  const xrHtml = await fetch("https://3dmodelsproject.pages.dev/webxr.html");
  let content = await xrHtml.text();

  content = content.replace("</body>", `
    <script>
      const modelData = ${JSON.stringify(modelData)};
      const params = new URLSearchParams(window.location.search);
      params.set("model", encodeURIComponent(JSON.stringify(modelData)));
      window.history.replaceState({}, "", "?" + params.toString());
    </script>
  </body>`);

  return new Response(content, { headers: { "Content-Type": "text/html" } });
}
