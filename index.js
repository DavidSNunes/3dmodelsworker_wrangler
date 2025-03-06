addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(req) {
  if (req.method !== "GET") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const url = new URL(req.url);
    console.log("🚀 Full Request URL:", url.href);  // Log the full request URL

    // Extract ?url= parameter
    const originalUrl = url.searchParams.get("url");
    console.log("🔍 Extracted 'url' parameter:", originalUrl); // Log the extracted 'url'

    if (!originalUrl) {
      console.error("❌ Missing 'url' parameter!");
      return new Response("Invalid request: Missing 'url' parameter", { status: 400 });
    }

    if (!originalUrl.startsWith("http")) {
      console.error("❌ Invalid URL format:", originalUrl);
      return new Response("Invalid URL format", { status: 400 });
    }

    // Parse site key & model code from the URL
    const { siteKey, modelCode } = parseUrl(originalUrl);
    console.log("🔍 Extracted Site Key:", siteKey);
    console.log("🔍 Extracted Model Code:", modelCode);

    if (!siteKey) {
      console.error("❌ Site not supported:", originalUrl);
      
      // Fetch and serve the default.html page
      const defaultHtml = await fetch("https://3dmodelsproject.pages.dev/default.html"); 
      return new Response(await defaultHtml.text(), {
        headers: { "Content-Type": "text/html" }
      });
    }

    // Fetch site configuration from KV
    const siteData = await getSiteDataFromKV(siteKey);
    console.log("🔍 Fetched site data:", siteData);

    if (!siteData) {
      console.error("❌ Site configuration not found for:", siteKey);
      return new Response("Site configuration not found", { status: 404 });
    }

    // Retrieve the model file or use the default page
    const modelFile = siteData.models[modelCode] || null;
    const viewerPageUrl = modelFile
      ? `https://3dmodelsproject.pages.dev/viewer.html?modelCode=${modelCode}&file=${modelFile}`
      : siteData.default;

    console.log("🔍 Redirecting to Viewer Page:", viewerPageUrl);
    return Response.redirect(viewerPageUrl, 302);

  } catch (error) {
    console.error("🔥 Worker Error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

// Extracts the site key & model code from a given URL
function parseUrl(url) {
  const sites = {
    "configurador.audi.pt": "configurador.audi.pt",
    "worten.pt": "worten.pt/produtos"
  };

  const hostname = new URL(url).hostname.replace("www.", ""); // Normalize domain

  for (const [domain, siteKey] of Object.entries(sites)) {
    if (hostname.includes(domain)) {
      // Extract model codes (Audi car codes or Worten product IDs)
      const modelCodeMatch = url.match(/(?:20A|30A|40A|50B|\d{7})/);
      const modelCode = modelCodeMatch ? modelCodeMatch[0] : null;
      return { siteKey, modelCode };
    }
  }

  return { siteKey: null, modelCode: null };
}

// Fetches site data from Cloudflare KV
async function getSiteDataFromKV(siteKey) {
  try {
    const rawData = await binding.get(siteKey);
    return rawData ? JSON.parse(rawData) : null;
  } catch (err) {
    console.error("KV Fetch Error:", err);
    return null;
  }
}
