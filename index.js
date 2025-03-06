addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(req) {
  if (req.method !== "GET") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const url = new URL(req.url);
    
    console.log("Incoming Request URL:", url.href);

    // Ensure URL contains "#!"
    const separator = "#!";
    if (!url.href.includes(separator)) {
      return new Response("Invalid request: Missing '#!'", { status: 400 });
    }

    // Extract the original website URL after "#!"
    const splitUrl = url.href.split(separator);
    if (splitUrl.length < 2 || !splitUrl[1].startsWith("http")) {
      return new Response("Invalid URL format", { status: 400 });
    }
    
    const originalUrl = decodeURIComponent(splitUrl[1]);
    console.log("Extracted Original URL:", originalUrl);

    // Parse the site key & model code
    const { siteKey, modelCode } = parseUrl(originalUrl);
    if (!siteKey) {
      return new Response("Site not supported", { status: 404 });
    }

    // Fetch site configuration from KV
    const siteData = await getSiteDataFromKV(siteKey);
    if (!siteData) {
      return new Response("Site configuration not found", { status: 404 });
    }

    // Retrieve the model file or default page
    const modelFile = siteData.models[modelCode] || null;
    const viewerPageUrl = modelFile
      ? `https://3dmodelsproject.pages.dev/viewer.html?modelCode=${modelCode}&file=${modelFile}`
      : siteData.default;

    console.log("Redirecting to Viewer Page:", viewerPageUrl);
    return Response.redirect(viewerPageUrl, 302);

  } catch (error) {
    console.error("Worker Error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

// Extracts the site key & model code from a given URL
function parseUrl(url) {
  const sites = {
    "configurador.audi.pt": "configurador.audi.pt",
    "www.worten.pt": "worten.pt/produtos"
  };

  for (const [domain, siteKey] of Object.entries(sites)) {
    if (url.includes(domain)) {
      // Extract model codes (Audi car codes or Worten product IDs)
      const modelCode = url.match(/(20A|30A|40A|50B|8110317|7817350)/)?.[0] || null;
      return { siteKey, modelCode };
    }
  }

  return { siteKey: null, modelCode: null };
}

// Fetches site data from Cloudflare KV
async function getSiteDataFromKV(siteKey) {
  try {
    const rawData = await MODELS_KV.get(siteKey);
    return rawData ? JSON.parse(rawData) : null;
  } catch (err) {
    console.error("KV Fetch Error:", err);
    return null;
  }
}
