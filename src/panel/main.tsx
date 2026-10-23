import { render } from "preact";
import { App } from "./App";
import "./styles.css";

document.documentElement.dataset.theme =
  chrome.devtools.panels.themeName === "dark" ? "dark" : "light";

render(<App />, document.getElementById("app")!);
