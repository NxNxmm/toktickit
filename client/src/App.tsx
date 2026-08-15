import { useState } from "react";
import { checkSystem, Category } from "./api.js";

// UI states you must handle for Issue 4: idle, loading, success, error.
type UiState = "idle" | "loading" | "success" | "error";

export default function App() {
  const [state, setState] = useState<UiState>("idle");
  const [categories, setCategories] = useState<Category[]>([]);
  void categories;

  async function handleCheck() {
    // TODO(Issue 4): set loading, call checkSystem(), then either
    //   - success: store categories and show Online + the list, or
    //   - error: show Offline + a useful message.
    setState("loading");
    try {
      const res = await checkSystem();
      if (res.online) {
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

      {/* TODO(Issue 4): render loading / success (Online + categories) / error (Offline) states. */}
      {state === "loading" && <p>Loading categories…</p>}
      {state === "error" && (
        <div className="mt-2">
          <p className="fw-bold mb-0">
            System Status: <span className="text-danger">Offline</span>
          </p>
          <p className="text-danger">Unable to connect to TokTickIT API</p>
        </div>
      )}
      {state === "success" && (
        <div className="mt-2">
          <p className="fw-bold mb-0">
            System Status: <span className="text-success">Online</span>
          </p>
          <p className="text-success">TokTickIT API is running normally</p>
        </div>
      )}

    </div>
  );
}
