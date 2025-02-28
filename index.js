// Access Cloudflare KV
async function handleRequest(req) {
  if (req.method === "OPTIONS") {
      return handleCorsPreflight();
  }

  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');

  if (!url) {
      return new Response('URL is required', { 
          status: 400, 
          headers: corsHeaders() 
      });
  }

  // Check URL for model code
  const modelCode = await findModelCodeFromUrl(url);
  
  if (!modelCode) {
      // No model code found in URL → Redirect to default page
      const defaultPage = await fetch('https://3dmodels-7c1.pages.dev/default.html');
      return new Response(await defaultPage.text(), {
          headers: {
              'Content-Type': 'text/html',
              ...corsHeaders()
          }
      });
  }

  // Fetch model data from KV
  const modelFile = await getModelFileFromKV(modelCode);
  
  if (!modelFile) {
      return new Response('Model not found', { 
          status: 404, 
          headers: corsHeaders() 
      });
  }

  // Return the model viewer URL if model code matches
  const modelLink = `https://3dmodels-7c1.pages.dev/viewer.html?modelCode=${modelCode}&file=${modelFile}`;

  return new Response(JSON.stringify({ modelLink }), {
      headers: {
          'Content-Type': 'application/json',
          ...corsHeaders()
      }
  });
}

// Handle CORS preflight requests
function handleCorsPreflight() {
  return new Response(null, {
      status: 204,
      headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
      }
  });
}

// Function to find model code in URL
async function findModelCodeFromUrl(url) {
  const modelCodes = ['20A', '30A', '40A', '50B']; // List of model codes (add more as needed)
  for (let code of modelCodes) {
      if (url.includes(code)) {
          return code;
      }
  }
  return null;
}

// Fetch model file from KV
async function getModelFileFromKV(modelCode) {
  const modelMapping = await DB.get(modelCode);
  return modelMapping || null;
}

// CORS Headers function
function corsHeaders() {
  return {
      "Access-Control-Allow-Origin": "*"
  };
}

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});
