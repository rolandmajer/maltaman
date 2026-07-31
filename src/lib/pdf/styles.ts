import { StyleSheet } from "@react-pdf/renderer";

/**
 * Palette from the protocol design. Warm neutrals rather than blue-greys, so the paper stock and
 * the brand red sit together; the red is the only saturated colour and is reserved for section
 * numbers, defects and the figures the client is meant to act on.
 */
export const colors = {
  brand: "#c53835",
  brandDark: "#9e2b28",
  brandWash: "#fbeceb",
  brandWashBorder: "#e6b3af",
  /** Divider on the red cover. The design uses rgba white; react-pdf does not parse rgba() and
   *  rendered it as a stray green, so this is the same value flattened against the brand red. */
  brandHairline: "#d1615e",
  /** The two decorative rings bleeding off the cover's top-right corner — the design's
   *  rgba(255,255,255,.16) and .14 over the brand red, flattened for the same reason. */
  coverRingOuter: "#ce5855",
  coverRingInner: "#cd5451",

  ink: "#201d1b",
  body: "#3a3330",
  muted: "#6f6862",
  faint: "#a49d96",
  fainter: "#8b847d",

  border: "#e7e2dc",
  line: "#efeae4",
  lineSoft: "#f1ece6",
  surface: "#faf7f3",
  surfaceAlt: "#f6f3ef",

  // Evaluation chips — text / fill / edge per status.
  okText: "#2f7a4f",
  okFill: "#e7f2ea",
  okEdge: "#bfe0cd",
  okBar: "#3f8f5f",

  vText: "#c53835",
  vFill: "#fbe9e8",
  vEdge: "#f0c4c1",

  rText: "#b07d1f",
  rFill: "#f8efdb",
  rEdge: "#ecd9a8",

  nText: "#7c756e",
  nFill: "#f0edea",
  nEdge: "#ddd7d0",
  nBar: "#9a938c",

  naText: "#a49d96",
  naFill: "#f4f1ed",
  naEdge: "#e4ded7",

  // On the dark appendix headers the chips have to lift off near-black instead of off-white.
  onDarkOk: "#7ee0a8",
  onDarkV: "#f3a9a5",
  onDarkMuted: "#c9c3bc",

  amber: "#c98a2b",
  white: "#ffffff",
};

/** Chip colours for an element/finding status code. */
export function statusChip(status: string) {
  if (status === "OK") return { color: colors.okText, backgroundColor: colors.okFill, borderColor: colors.okEdge };
  if (status === "V") return { color: colors.vText, backgroundColor: colors.vFill, borderColor: colors.vEdge };
  if (status === "R") return { color: colors.rText, backgroundColor: colors.rFill, borderColor: colors.rEdge };
  if (status === "NEVZTAHUJE_SA" || status === "N/A")
    return { color: colors.naText, backgroundColor: colors.naFill, borderColor: colors.naEdge };
  return { color: colors.nText, backgroundColor: colors.nFill, borderColor: colors.nEdge };
}

/** Kept for callers that only need the ink colour of a status. */
export function statusColor(status: string) {
  return statusChip(status).color;
}

export const styles = StyleSheet.create({
  page: {
    fontFamily: "Plex",
    fontSize: 9,
    lineHeight: 1.5,
    color: colors.ink,
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 43,
  },
  coverPage: {
    fontFamily: "Plex",
    color: colors.ink,
    padding: 0,
  },

  footer: {
    position: "absolute",
    bottom: 20,
    left: 43,
    right: 43,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: 7.5,
    fontFamily: "PlexMono",
    color: colors.faint,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 6,
  },

  // ---- section heading rule ------------------------------------------------
  sectionHead: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderBottomWidth: 2,
    borderBottomColor: colors.ink,
    paddingBottom: 7,
    marginBottom: 14,
  },
  sectionNumber: {
    fontFamily: "Archivo",
    fontWeight: 900,
    fontSize: 14,
    color: colors.brand,
    marginRight: 9,
  },
  sectionTitle: {
    fontFamily: "Archivo",
    fontWeight: 800,
    fontSize: 14.5,
    color: colors.ink,
  },
  sectionAside: {
    marginLeft: "auto",
    fontSize: 8,
    color: colors.muted,
  },

  // ---- generic type --------------------------------------------------------
  eyebrow: {
    fontFamily: "PlexMono",
    fontWeight: 700,
    fontSize: 7.5,
    letterSpacing: 0.7,
    color: colors.brand,
    marginBottom: 7,
  },
  eyebrowMuted: {
    fontFamily: "PlexMono",
    fontWeight: 700,
    fontSize: 7.5,
    letterSpacing: 0.7,
    color: colors.muted,
    marginBottom: 7,
  },
  paragraph: {
    fontSize: 8.8,
    color: colors.body,
    lineHeight: 1.5,
  },
  note: {
    fontSize: 8,
    color: colors.muted,
    lineHeight: 1.45,
  },
  mono: {
    fontFamily: "PlexMono",
  },

  // ---- cards ---------------------------------------------------------------
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 9,
    padding: 12,
  },
  cardSurface: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 9,
    padding: 12,
    backgroundColor: colors.surface,
  },

  // ---- chips ---------------------------------------------------------------
  chip: {
    fontFamily: "PlexMono",
    fontWeight: 700,
    fontSize: 6.6,
    borderWidth: 1,
    borderRadius: 3,
    paddingVertical: 1.5,
    paddingHorizontal: 3.5,
    textAlign: "center",
  },

  // ---- key/value rows ------------------------------------------------------
  kvRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingVertical: 4,
  },
  kvRowLast: {
    flexDirection: "row",
    paddingVertical: 4,
  },
  kvLabel: {
    width: "47%",
    fontSize: 8.5,
    color: colors.muted,
  },
  kvValue: {
    width: "53%",
    fontSize: 8.5,
    fontWeight: 600,
    color: colors.ink,
  },

  // ---- tables --------------------------------------------------------------
  th: {
    fontFamily: "PlexMono",
    fontWeight: 700,
    fontSize: 6.8,
    letterSpacing: 0.5,
    color: colors.white,
    paddingVertical: 6,
    paddingHorizontal: 7,
  },
  td: {
    fontSize: 8.3,
    color: colors.ink,
    paddingVertical: 6,
    paddingHorizontal: 7,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },

  // ---- photos --------------------------------------------------------------
  photoCard: {
    width: "31.7%",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    overflow: "hidden",
  },
  photoImage: {
    width: "100%",
    height: 104,
    objectFit: "cover",
  },
});
