// Handle the fetch event
addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  
  // Check if the path is '/process', and route the request accordingly
  if (url.pathname === "/process") {
    event.respondWith(handleRequest(event.request));  // Handle /process endpoint
  } else {
    event.respondWith(new Response("Not Found", { status: 404 }));
  }
});

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
      const url = reqBody.url; // Get the full URL from the request body

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

      // Fetch model file from KV using modelCode
      const modelFile = await getModelFileFromKV(modelCode);

      if (!modelFile) {
          return new Response("Model not found", { 
              status: 404, 
              headers: corsHeaders() 
          });
      }

      // Construct the model viewer link
      const modelLink = `https://3dmodelsproject.pages.dev/viewer.html?modelCode=${modelCode}&file=${modelFile}`;

      // Generate QR Code URL (if you have logic for that)
      const qrCodeUrl = generateQRCodeUrl(modelLink);

      return new Response(JSON.stringify({ qrCodeUrl, modelLink }), {
          headers: {
              "Content-Type": "application/json",
              ...corsHeaders(),
          },
      });

  } catch (error) {
      console.error("Worker Error:", error);
      return new Response("Internal Server Error", {
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
  const modelMapping = await binding.get(modelCode);
  return modelMapping || null;
}

// QR Code generation logic (if needed)
function generateQRCodeUrl(modelLink) {
  // Example using a simple QR code generator service:
  const qrCodeBaseUrl = "https://api.qrserver.com/v1/create-qr-code/";
  return `${qrCodeBaseUrl}?data=${encodeURIComponent(modelLink)}&size=150x150`;
}

// CORS Headers function
function corsHeaders() {
  return {
      "Access-Control-Allow-Origin": "*",  // Allow all origins (or specify the exact domain as needed)
      "Access-Control-Allow-Methods": "POST, OPTIONS", // Allow only POST and OPTIONS
      "Access-Control-Allow-Headers": "Content-Type" // Allow Content-Type header
  };
}
