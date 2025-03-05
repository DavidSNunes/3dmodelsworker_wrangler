addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(req) {
  if (req.method !== "GET") return new Response("Method Not Allowed", { status: 405 });

  try {
      const url = new URL(req.url);
      const hashbangIndex = url.href.indexOf("#!");

      if (hashbangIndex === -1) return new Response("Invalid request: Missing '#!'", { status: 400 });

      const originalUrl = decodeURIComponent(url.href.substring(hashbangIndex + 2));
      if (!originalUrl.startsWith("http")) return new Response("Invalid URL format", { status: 400 });

      console.log("Extracted URL:", originalUrl);

      const { siteKey, modelCode } = parseUrl(originalUrl);
      if (!siteKey) return new Response("Site not supported", { status: 404 });

      const siteData = await getSiteDataFromKV(siteKey);
      if (!siteData) return new Response("Site configuration not found", { status: 404 });

      const modelFile = modelCode ? siteData.models[modelCode] || null : null;
      console.log("Model Code:", modelCode, "| Model File:", modelFile);

      // Redirect to viewer.html if model exists, otherwise to default page
      const modelPageUrl = modelFile
          ? `https://3dmodelsproject.pages.dev/viewer.html?modelCode=${modelCode}&file=${modelFile}`
          : siteData.default;

      console.log("Redirecting to:", modelPageUrl);
      return Response.redirect(modelPageUrl, 302);

  } catch (error) {
      console.error("Worker Error:", error);
      return new Response("Internal Server Error", { status: 500 });
  }
}

// Extract site key & model code from URL
function parseUrl(url) {
  const sites = {
      "configurador.audi.pt": "configurador.audi.pt",
      "www.worten.pt": "worten.pt/produtos"
  };

  for (const [domain, siteKey] of Object.entries(sites)) {
      if (url.includes(domain)) {
          // Match model codes like A10, 20A, etc., or specific product IDs like 8110317
          const modelCode = url.match(/(A10|20A|30A|40A|50B|8110317|7817350)/)?.[0] || null;
          return { siteKey, modelCode };
      }
  }

  return { siteKey: null, modelCode: null };
}

// Fetch site data from KV
async function getSiteDataFromKV(siteKey) {
  try {
      const rawData = await MODELS_KV.get(siteKey);
      return rawData ? JSON.parse(rawData) : null;
  } catch (error) {
      console.error("KV Fetch Error:", error);
      return null;
  }
}
