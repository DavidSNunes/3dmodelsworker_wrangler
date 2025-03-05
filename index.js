addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(req) {
  if (req.method !== "GET") return new Response("Method Not Allowed", { status: 405 });

  try {
      const url = new URL(req.url);

      // Extract the original URL after the '#!' fragment
      const hashbangIndex = url.href.indexOf("#!");
      if (hashbangIndex === -1) {
          return new Response("Invalid request: Missing '#!'", { status: 400 });
      }

      const originalUrl = decodeURIComponent(url.href.substring(hashbangIndex + 2));

      if (!originalUrl.startsWith("http")) {
          return new Response("Invalid URL format", { status: 400 });
      }

      console.log("Original URL: ", originalUrl); // Debugging log

      const { siteKey, modelCode } = parseUrl(originalUrl);
      if (!siteKey) return new Response("Site not supported", { status: 404 });

      const siteData = await getSiteDataFromKV(siteKey);
      if (!siteData) return new Response("Site configuration not found", { status: 404 });

      // Get the model file or fallback to the default page
      const modelFile = siteData.models[modelCode] || null;
      const modelPageUrl = modelFile
          ? `https://3dmodelsproject.pages.dev/viewer.html?modelCode=${modelCode}&file=${modelFile}`
          : siteData.default;

      // Redirect to the appropriate page based on the model data
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
          const modelCode = url.match(/(20A|30A|40A|50B|8110317|7817350)/)?.[0] || null;
          return { siteKey, modelCode };
      }
  }

  return { siteKey: null, modelCode: null };
}

// Fetch site data from KV
async function getSiteDataFromKV(siteKey) {
  const rawData = await binding.get(siteKey);
  return rawData ? JSON.parse(rawData) : null;
}
