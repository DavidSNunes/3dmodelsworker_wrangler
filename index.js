// Cloudflare Worker: Handles model fetching with proper CORS headers
async function handleRequest(req) {
  // Handle CORS preflight (OPTIONS request)
  if (req.method === "OPTIONS") {
      return handleCorsPreflight();
  }

  // Ensure the request is a POST request
  if (req.method !== "POST") {
      return new Response("Method Not Allowed", { 
          status: 405, 
          headers: corsHeaders() 
      });
  }

  try {
      const reqBody = await req.json(); // Parse JSON body
      const url = reqBody.url;

      if (!url) {
          return new Response("URL is required", { 
              status: 400, 
              headers: corsHeaders() 
          });
      }

      // Extract model code from URL
      const modelCode = await findModelCodeFromUrl(url);

      if (!modelCode) {
          // No model code found → Serve default page
          const defaultPage = await fetch("https://3dmodelsproject.pages.dev/default");
          return new Response(await defaultPage.text(), {
              headers: {
                  "Content-Type": "text/html",
                  ...corsHeaders(),
              },
          });
      }

      // Fetch model data from KV
      const modelFile = await getModelFileFromKV(modelCode);

      if (!modelFile) {
          return new Response("Model not found", { 
              status: 404, 
              headers: corsHeaders() 
          });
      }

      // Construct the model viewer link
      const modelLink = `https://3dmodelsproject.pages.dev/viewer.html?modelCode=${modelCode}&file=${modelFile}`;

      return new Response(JSON.stringify({ modelLink }), {
          headers: {
              "Content-Type": "application/json",
              ...corsHeaders(),
          },
      });

  } catch (error) {
      return new Response(`Error: ${error.message}`, {
          status: 500,
          headers: corsHeaders(),
      });
  }
}

// Handle CORS preflight requests
function handleCorsPreflight() {
  return new Response(null, {
      status: 204,
      headers: corsHeaders()
  });
}

// Extract model code from URL
async function findModelCodeFromUrl(url) {
  const modelCodes = ['20A', '30A', '40A', '50B']; // Expand list as needed
  for (let code of modelCodes) {
      if (url.includes(code)) {
          return code;
      }
  }
  return null;
}

// Fetch model file from KV database
async function getModelFileFromKV(modelCode) {
  const modelMapping = await DB.get(modelCode);
  return modelMapping || null;
}

// CORS Headers function
function corsHeaders() {
  return {
      "Access-Control-Allow-Origin": "*",  // Allow all origins
      "Access-Control-Allow-Methods": "POST, OPTIONS", // Allow only POST and OPTIONS
      "Access-Control-Allow-Headers": "Content-Type" // Allow Content-Type header
  };
}

// Register the fetch event listener
addEventListener("fetch", event => {
  event.respondWith(handleRequest(event.request));
});
