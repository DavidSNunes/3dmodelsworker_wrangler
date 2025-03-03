addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(req) {
  if (req.method === "OPTIONS") return handleCorsPreflight();
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: corsHeaders() });

  try {
      const { url } = await req.json();
      if (!url) return new Response("URL is required", { status: 400, headers: corsHeaders() });

      const { siteKey, modelCode } = parseUrl(url);
      if (!siteKey) return new Response("Site not supported", { status: 404, headers: corsHeaders() });

      const siteData = await getSiteDataFromKV(siteKey);
      if (!siteData) return new Response("Site configuration not found", { status: 404, headers: corsHeaders() });

      const modelFile = siteData.models[modelCode] || null;
      const modelPageUrl = modelFile
          ? `https://3dmodelsproject.pages.dev/viewer.html?modelCode=${modelCode}&file=${modelFile}`
          : siteData.default;

      return new Response(JSON.stringify({ qrCodeUrl: generateQRCodeUrl(modelPageUrl) }), {
          headers: { "Content-Type": "application/json", ...corsHeaders() }
      });

  } catch (error) {
      console.error("Worker Error:", error);
      return new Response("Internal Server Error", { status: 500, headers: corsHeaders() });
  }
}

// Parse URL and extract site key & model code
function parseUrl(url) {
  const sites = {
      "configurador.audi.pt": "configurador.audi.pt",
      "www.worten.pt": "worten.pt/produtos"
  };

  for (const [domain, siteKey] of Object.entries(sites)) {
      if (url.includes(domain)) {
          const modelCode = url.match(/(20A|30A|40A|50B|8110317|8110317)/)?.[0] || null;
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

// Generate QR code URL
function generateQRCodeUrl(link) {
  return `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(link)}&size=150x150`;
}

// Handle CORS preflight
function handleCorsPreflight() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

// CORS Headers
function corsHeaders() {
  return { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
}
