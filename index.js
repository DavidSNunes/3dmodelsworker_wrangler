//access cloudflare KV 
async function handleRequest(req) {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url');
    if (!url) {
      return new Response('URL is required', { status: 400 });
    }
  
    //check URL for model code
    const modelCode = await findModelCodeFromUrl(url);
    
    if (!modelCode) {
      //no model code found in URL ---> go to default page
      return new Response(await fetch('https://3dmodels-7c1.pages.dev/default.html').then(res => res.text()), {
        headers: { 'Content-Type': 'text/html' },
      });
    }
  
    //fetch model data from KV
    const modelFile = await getModelFileFromKV(modelCode);
    
    if (!modelFile) {
      return new Response('Model not found', { status: 404 });
    }
  
    //return the model viewer URL if model code matches
    const modelLink = `https://3dmodels-7c1.pages.dev/viewer.html?modelCode=${modelCode}&file=${modelFile}`;
  
    return new Response(JSON.stringify({ modelLink }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  //function to find model code in URL
  async function findModelCodeFromUrl(url) {
    const modelCodes = ['20A', '30A', '40A', '50B']; // List of model codes (add more as needed)
    for (let code of modelCodes) {
      if (url.includes(code)) {
        return code;
      }
    }
    return null;
  }
  
  //fetch model file from KV
  async function getModelFileFromKV(modelCode) {
    
    const modelMapping = await DB.get(modelCode);
    
    if (!modelMapping) {
      return null;
    }
    
    
    return modelMapping;
  }
  
  addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request));
  });
  