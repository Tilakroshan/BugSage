import { useState } from "react";
import axios from "axios";

function App() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!code.trim()) {
      setResult("Please enter code to analyze.");
      return;
    }

    try {
      setLoading(true);
      setResult("");

      const response = await axios.post("http://localhost:5000/analyze", {
        code,
      });

      setResult(response.data.result || "No result returned.");
    } catch (error) {
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Something went wrong while analyzing.";
      setResult(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <div className="card">
        <h1>BugSage {"\uD83D\uDC1E"}</h1>
        <p className="subtitle">AI-powered bug detection for your code.</p>

        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Paste your code here..."
          rows={12}
        />

        <button onClick={handleAnalyze} disabled={loading}>
          {loading ? "Analyzing..." : "Analyze"}
        </button>

        <div className="output">
          <h2>Analysis Result</h2>
          <pre>{result || "Your analysis output will appear here."}</pre>
        </div>
      </div>
    </div>
  );
}

export default App;
