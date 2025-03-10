export default {
  async fetch(req) {
    const url = new URL(req.url);
    
    // Serve static files from Cloudflare Pages
    if (url.pathname === "/webxr.js") {
      return serveStaticFile("webxr.js", "application/javascript");
    }

    if (url.pathname === "/viewer.html") {
      return serveStaticFile("viewer.html", "text/html");
    }

    // Handle model retrieval logic
    return handleModelRequest(url);
  }
};

// Fetch static files from your Cloudflare Pages (GitHub-hosted files)
async function serveStaticFile(filePath, contentType) {
  const pagesURL = `https://3dmodelsproject.pages.dev/${filePath}`;
  const response = await fetch(pagesURL);

  if (!response.ok) {
    return new Response("File Not Found", { status: 404 });
  }

  return new Response(await response.text(), {
    headers: { "Content-Type": contentType }
  });
}

// Process model requests and return WebXR page with correct model
async function handleModelRequest(url) {
  const params = new URLSearchParams(url.search);
  const modelCode = params.get("model");

  if (!modelCode) {
    return new Response("Model code not provided", { status: 400 });
  }

  // Retrieve the model link from Cloudflare KV
  const modelLink = await getModelFromKV(modelCode);
  
  if (!modelLink) {
    return new Response("Model not found", { status: 404 });
  }

  // Generate the WebXR viewer URL with the correct model
  const viewerURL = `https://3dmodelsproject.pages.dev/viewer.html?model=${modelLink}`;
  
  return Response.redirect(viewerURL, 302);
}

// Lookup model in Cloudflare KV
async function getModelFromKV(modelCode) {
  try {
    const kvValue = await binding.get(modelCode);
    return kvValue ? kvValue : null;
  } catch (err) {
    console.error("KV Fetch Error:", err);
    return null;
  }
}