import { useState } from "react";
import { checkSystem, Category } from "./api.js";

type UiState = "idle" | "loading" | "success" | "error";

export default function App() {
  const [state, setState] = useState<UiState>("idle");
  const [categories, setCategories] = useState<Category[]>([]);

  async function handleCheck() {
    setState("loading");
    try {
      const res = await checkSystem();
      if (res.online) {
        setCategories(res.categories || []);
        setState("success");
      } else {
        setState("error");
      }
    } catch (error) {
      setState("error");
    }
  }

  return (
    <div className="container py-5" style={{ maxWidth: 640 }}>
      <h1 className="h3 mb-4">
        TokTickIT <span className="text-success">IT Service Desk</span>
      </h1>

      <button className="btn btn-success" onClick={handleCheck} disabled={state === "loading"}>
        {state === "loading" ? "Loading…" : "Check System"}
      </button>

      {state === "loading" && <p className="mt-3">Loading categories…</p>}

      {state === "error" && (
        <div className="mt-3">
          <p className="fw-bold mb-0">
            System Status: <span className="text-danger">Offline</span>
          </p>
          <p className="text-danger">Unable to connect to TokTickIT API</p>
        </div>
      )}

      {state === "success" && (
        <div className="mt-3">
          <p className="fw-bold mb-0">
            System Status: <span className="text-success">Online</span>
          </p>
          <p className="text-success mb-3">TokTickIT API is running normally</p>

          <h2 className="h5">Categories</h2>
          <ul className="list-group mt-2">
            {categories.map((cat) => (
              <li key={cat.id} className="list-group-item">
                {cat.name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}