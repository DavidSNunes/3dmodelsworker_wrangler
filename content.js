// Detect which Audi model is being viewed on the configurator
const url = window.location.href;
let modelUrl = "";

if (url.includes("AUDI23/A/model-selection/A61/4A5RCAQ0/T3T3/QH/@/@?variant=RS6")) { 
    modelUrl = "https://3dmodels-7c1.pages.dev/viewer.html?model=AUDI_RS6.glb"; 
} else if (url.includes("AUDI23/A/model-selection/A70/4KA0IGN0/A2A2/MP/7HD/@?variant=Base")) { 
    modelUrl = "https://3dmodels-7c1.pages.dev/viewer.html?model=AUDI_A7.glb"; 
} else {
    console.warn("No matching 3D model found.");
}

// Generate the QR code dynamically
fetch(`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(modelUrl)}`)
    .then(response => response.blob())
    .then(blob => {
        const qrCodeUrl = URL.createObjectURL(blob);
        injectQRCode(qrCodeUrl);
    });

// Function to inject the QR code into the webpage
function injectQRCode(qrCodeUrl) {
    const qrImg = document.createElement("img");
    qrImg.src = qrCodeUrl;
    qrImg.style.position = "fixed";
    qrImg.style.bottom = "20px";
    qrImg.style.right = "20px";
    qrImg.style.zIndex = "300000";
    qrImg.style.width = "150px";
    qrImg.style.height = "150px";
    document.body.appendChild(qrImg);
}
