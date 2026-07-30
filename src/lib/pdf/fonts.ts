import path from "node:path";
import { Font } from "@react-pdf/renderer";

let registered = false;

/**
 * Registers the embedded report fonts once per process.
 *
 * Three families, matching the protocol design: Archivo for headings, IBM Plex Sans for body copy,
 * IBM Plex Mono for the labels, codes and figures. All three carry the full Latin Extended-A range,
 * so Slovak diacritics render rather than dropping to tofu.
 *
 * The Archivo and Plex Sans files here are static instances cut from the upstream variable fonts —
 * react-pdf renders a variable font at its default weight only, so a registered "900" would have
 * silently come out at Archivo's 600 default.
 */
export function ensureFontsRegistered() {
  if (registered) return;
  const dir = path.join(process.cwd(), "src/fonts");
  const at = (file: string) => path.join(dir, file);

  Font.register({
    family: "Archivo",
    fonts: [
      { src: at("Archivo-Bold.ttf"), fontWeight: 700 },
      { src: at("Archivo-ExtraBold.ttf"), fontWeight: 800 },
      { src: at("Archivo-Black.ttf"), fontWeight: 900 },
    ],
  });

  Font.register({
    family: "Plex",
    fonts: [
      { src: at("IBMPlexSans-Regular.ttf"), fontWeight: 400 },
      { src: at("IBMPlexSans-Medium.ttf"), fontWeight: 500 },
      { src: at("IBMPlexSans-SemiBold.ttf"), fontWeight: 600 },
      { src: at("IBMPlexSans-Bold.ttf"), fontWeight: 700 },
    ],
  });

  Font.register({
    family: "PlexMono",
    fonts: [
      { src: at("IBMPlexMono-Regular.ttf"), fontWeight: 400 },
      { src: at("IBMPlexMono-SemiBold.ttf"), fontWeight: 600 },
      { src: at("IBMPlexMono-Bold.ttf"), fontWeight: 700 },
    ],
  });

  // Returning the word unsplit turns hyphenation off. react-pdf's default callback applies English
  // hyphenation patterns, which cut Slovak words at points the language does not allow — a report
  // full of "elektroin-štalácia" reads as a typesetting error to the client. Slovak words now wrap
  // whole to the next line instead.
  Font.registerHyphenationCallback((word) => [word]);

  registered = true;
}
