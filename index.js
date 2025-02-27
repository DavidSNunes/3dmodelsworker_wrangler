export default {
    async fetch(request, env) {
        try {
            const url = new URL(request.url);
            const modelCode = url.searchParams.get("model");

            if (!modelCode) {
                return new Response("Model code is required", {
                    status: 400,
                    headers: { "Access-Control-Allow-Origin": "*" }
                });
            }


            console.log(`Looking up model: ${modelCode}`);

            //query the database for the model path by using the model code found in the URL
            const { results } = await env.DB.prepare(
                "SELECT model_path FROM car_models WHERE model_code = ?"
            )
            .bind(modelCode)
            .all();

            if (!results || results.length === 0) {
                return new Response("Model not found", {
                    status: 404,
                    headers: { "Access-Control-Allow-Origin": "*" }
                });
            }

			//retrieve the model path from the database
            const modelPath = results[0].model_path;

            return new Response(
                JSON.stringify({
                    modelPath: modelPath
                }),
                {
                    headers: {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": "*",
                        "Access-Control-Allow-Methods": "GET, OPTIONS",
                        "Access-Control-Allow-Headers": "Content-Type"
                    }
                }
            );
        } catch (error) {
            console.error("Worker Error:", error);
            return new Response("Internal Server Error", {
                status: 500,
                headers: { "Access-Control-Allow-Origin": "*" }
            });
        }
    }
};
