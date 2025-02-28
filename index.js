// Handle the fetch event
addEventListener("fetch", event => {
    const url = new URL(event.request.url);
    
    // Log the request details
    console.log(`Received request for: ${url.pathname} with method: ${event.request.method}`);
  
    // Check if the path is '/process', and route the request accordingly
    if (url.pathname === "/process") {
      event.respondWith(handleRequest(event.request));  // Handle /process endpoint
    } else {
      event.respondWith(new Response("Not Found", { status: 404 }));
    }
  });
  
  async function handleRequest(req) {
    // Log the HTTP method of the request
    console.log(`Handling request with method: ${req.method}`);
  
    // Handle CORS preflight (OPTIONS request)
    if (req.method === "OPTIONS") {
      console.log("Handling OPTIONS request for CORS");
      return handleCorsPreflight();
    }
  
    // Ensure the request is a POST request
    if (req.method !== "POST") {
      console.log("Method not allowed, returning 405");
      return new Response("Method Not Allowed", { 
        status: 405, 
        headers: corsHeaders() 
      });
    }
  
    try {
      const reqBody = await req.json(); // Parse JSON body
      console.log(`Received body: ${JSON.stringify(reqBody)}`);
  
      const url = reqBody.url; // Get the full URL from the request body
      if (!url) {
        console.log("URL is missing in the request body");
        return new Response("URL is required", { 
          status: 400, 
          headers: corsHeaders() 
        });
      }
  
      // Log the URL extracted from the request
      console.log(`Extracted URL: ${url}`);
  
      // Extract model code from URL
      const modelCode = await findModelCodeFromUrl(url);
  
      if (!modelCode) {
        console.log("No model code found, serving default page");
        const defaultPage = await fetch("https://3dmodelsproject.pages.dev/default");
        return new Response(await defaultPage.text(), {
          headers: {
            "Content-Type": "text/html",
            ...corsHeaders(),
          },
        });
      }
  
      // Log the found model code
      console.log(`Found model code: ${modelCode}`);
  
      // Fetch model file from KV using modelCode
      const modelFile = await getModelFileFromKV(modelCode);
  
      if (!modelFile) {
        console.log("Model file not found in KV");
        return new Response("Model not found", { 
          status: 404, 
          headers: corsHeaders() 
        });
      }
  
      // Log the model file retrieved
      console.log(`Model file found: ${modelFile}`);
  
      // Construct the model viewer link
      const modelLink = `https://3dmodelsproject.pages.dev/viewer.html?modelCode=${modelCode}&file=${modelFile}`;
      console.log(`Generated model link: ${modelLink}`);
  
      // Generate QR Code URL (if you have logic for that)
      const qrCodeUrl = generateQRCodeUrl(modelLink);
      console.log(`Generated QR code URL: ${qrCodeUrl}`);
  
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
    console.log("Handling CORS preflight request");
    return new Response(null, {
        status: 204,
        headers: corsHeaders()
    });
  }
  
  // Extract model code from URL
  async function findModelCodeFromUrl(url) {
    const modelCodes = ['20A', '30A', '40A', '50B']; // Expand list as needed
    console.log("Searching for model code in URL");
    for (let code of modelCodes) {
        if (url.includes(code)) {
            console.log(`Model code ${code} found in URL`);
            return code;
        }
    }
    console.log("No model code found in URL");
    return null;
  }
  
  // Fetch model file from KV database
  async function getModelFileFromKV(modelCode) {
    console.log(`Fetching model file for model code: ${modelCode}`);
    const modelMapping = await binding.get(modelCode);
    if (!modelMapping) {
      console.log("Model mapping not found in KV");
    }
    return modelMapping || null;
  }
  
  // QR Code generation logic (if needed)
  function generateQRCodeUrl(modelLink) {
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
  