const express = require("express");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

const API_KEY = "AIzaSyA3aSvO4iNZFc8Y2s_m7JpzL8JG-ZPEzVU";  
const API_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

app.post("/gemini", async (req, res) => {
  const query = req.body.query;
  try {
    const result = await fetch(`${API_ENDPOINT}?key=${API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: query }]
          }
        ]
      })
    });

    if (!result.ok) {
      const errorText = await result.text();
      console.error("Gemini API error:", errorText);
      return res.status(result.status).send(errorText);
    }

    const data = await result.json();
    res.json(data);

  } catch (err) {
    console.error("Backend call error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(5000, () => console.log("Proxy running at http://localhost:5000"));
