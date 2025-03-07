addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(req) {
  if (req.method !== "GET") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const url = new URL(req.url);
    console.log("🚀 Full Request URL:", url.href);  

    //extract ?url= parameter
    const originalUrl = url.searchParams.get("url");
    console.log("🔍 Extracted 'url' parameter:", originalUrl); 

    if (!originalUrl) {
      console.error("❌ Missing 'url' parameter!");
      return new Response("Invalid request: Missing 'url' parameter", { status: 400 });
    }

    if (!originalUrl.startsWith("http")) {
      console.error("❌ Invalid URL format:", originalUrl);
      return new Response("Invalid URL format", { status: 400 });
    }

    //get site key & model code from the URL
    const { siteKey, modelCode } = parseUrl(originalUrl);
    console.log("🔍 Extracted Site Key:", siteKey);
    console.log("🔍 Extracted Model Code:", modelCode);

    if (!siteKey) {
      console.error("❌ Site not supported:", originalUrl);
      return serveHtmlPage("https://3dmodelsproject.pages.dev/default.html");
    }

    //fetch site configuration from database
    const siteData = await getSiteDataFromKV(siteKey);
    console.log("🔍 Fetched site data:", siteData);

    if (!siteData) {
      console.error("❌ Site configuration not found for:", siteKey);
      return new Response("Site configuration not found", { status: 404 });
    }

    //retrieve the model file or use the default page
    const modelFile = siteData.models[modelCode] || null;
    if (!modelFile) {
      return serveHtmlPage("https://3dmodelsproject.pages.dev/default.html");
    }

    return serveViewerPage(modelCode, modelFile);

  } catch (error) {
    console.error("🔥 Worker Error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

//extracts the site key & model code from the URL
function parseUrl(url) {
  const sites = {
    "configurador.audi.pt": "configurador.audi.pt",
    "worten.pt": "worten.pt/produtos"
  };

  const hostname = new URL(url).hostname.replace("www.", ""); 

  for (const [domain, siteKey] of Object.entries(sites)) {
    if (hostname.includes(domain)) {
      //extract model codes 
      const modelCodeMatch = url.match(/(?:20A|30A|40A|50B|\d{7})/);
      const modelCode = modelCodeMatch ? modelCodeMatch[0] : null;
      return { siteKey, modelCode };
    }
  }

  return { siteKey: null, modelCode: null };
}

//fetches site data from the database
async function getSiteDataFromKV(siteKey) {
  try {
    const rawData = await binding.get(siteKey);
    return rawData ? JSON.parse(rawData) : null;
  } catch (err) {
    console.error("KV Fetch Error:", err);
    return null;
  }
}

//serves an html page while keeping the URL intact
async function serveHtmlPage(pageUrl) {
  const response = await fetch(pageUrl);
  return new Response(await response.text(), {
    headers: { "Content-Type": "text/html" }
  });
}

//serves viewer.html with dynamically injected model parameters
async function serveViewerPage(modelCode, modelFile) {
  const viewerHtml = await fetch("https://3dmodelsproject.pages.dev/viewer.html");
  let content = await viewerHtml.text();

  //inject modelcode & file parameters into the page dynamically
  content = content.replace("</body>", `
    <script>
      const params = new URLSearchParams(window.location.search);
      params.set("modelCode", "${modelCode}");
      params.set("file", "${modelFile}");
      window.history.replaceState({}, "", "?" + params.toString());
    </script>
  </body>`);

  return new Response(content, {
    headers: { "Content-Type": "text/html" }
  });
}
