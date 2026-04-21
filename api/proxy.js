export default async function handler(req, res) {
  const { path, ...queryParams } = req.query;

  if (!path) {
    return res.status(400).json({ erro: "End-point path is required" });
  }

  // Construct query string from the remaining parameters
  const queryString = new URLSearchParams(queryParams).toString();
  const targetUrl = `http://apisbrasilpro.site/api/${path}?${queryString}`;

  try {
    const response = await fetch(targetUrl);
    
    // Some responses might not be JSON (unlikely, but safe practice)
    const data = await response.text();
    
    // Forward the headers appropriately
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    return res.status(response.status).send(data);
  } catch (error) {
    console.error("Proxy fetch error:", error);
    return res.status(500).json({ error: "Erro interno no proxy", details: error.message });
  }
}
