import path from "node:path";
import { Font } from "@react-pdf/renderer";

let registered = false;

/** Registers the embedded Noto Sans fonts once per process so Slovak diacritics render correctly. */
export function ensureFontsRegistered() {
  if (registered) return;
  const dir = path.join(process.cwd(), "src/fonts");
  Font.register({
    family: "Noto Sans",
    fonts: [
      { src: path.join(dir, "NotoSans-Regular.ttf"), fontWeight: "normal" },
      { src: path.join(dir, "NotoSans-Bold.ttf"), fontWeight: "bold" },
    ],
  });
  registered = true;
}
