import { render } from "preact";
import { useEffect, useState } from "preact/hooks";
import { loadState, saveNow } from "./store";
import { Boot } from "./App";
import "./styles.css";

(window as unknown as { __flushSaves?: () => Promise<boolean> }).__flushSaves = () => saveNow();

function Root() {
  const [ready, setReady] = useState(false);
  useEffect(() => { loadState().then(() => setReady(true)); }, []);
  return <Boot ready={ready} />;
}
render(<Root />, document.getElementById("root")!);
