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

    // Extract ?url= parameter
    const originalUrl = url.searchParams.get("url");
    if (!originalUrl) {
      console.error("Missing 'url' parameter in query");
      return new Response("Invalid request: Missing 'url' parameter", { status: 400 });
    }

    console.log("Extracted Original URL:", originalUrl);

    if (!originalUrl.startsWith("http")) {
      console.error("Invalid URL format:", originalUrl);
      return new Response("Invalid URL format", { status: 400 });
    }

    // Parse site key & model code
    const { siteKey, modelCode } = parseUrl(originalUrl);
    console.log("Extracted Site Key:", siteKey);
    console.log("Extracted Model Code:", modelCode);

    if (!siteKey) {
      console.error("Site not supported:", originalUrl);
      return new Response("Site not supported", { status: 404 });
    }

    // Fetch site configuration from KV
    const siteData = await getSiteDataFromKV(siteKey);
    if (!siteData) {
      console.error("Site configuration not found for:", siteKey);
      return new Response("Site configuration not found", { status: 404 });
    }

    // Retrieve the model file or use the default page
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
