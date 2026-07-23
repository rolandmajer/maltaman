import { StyleSheet } from "@react-pdf/renderer";

// Grayscale-safe palette: headings/borders stay legible printed in black & white.
export const colors = {
  ink: "#101828",
  muted: "#475467",
  faint: "#98A2B3",
  border: "#D0D5DD",
  headerBg: "#EEF2F1",
  brand: "#1C473E",
  ok: "#1C7A3B",
  v: "#B45309",
  r: "#B91C1C",
  n: "#667085",
};

export const styles = StyleSheet.create({
  page: {
    fontFamily: "Noto Sans",
    fontSize: 9,
    color: colors.ink,
    paddingTop: 56,
    paddingBottom: 40,
    paddingHorizontal: 36,
  },
  coverPage: {
    fontFamily: "Noto Sans",
    color: colors.ink,
    padding: 48,
    display: "flex",
    flexDirection: "column",
    height: "100%",
  },
  header: {
    position: "absolute",
    top: 16,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: colors.muted,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 6,
  },
  footer: {
    position: "absolute",
    bottom: 16,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: colors.muted,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 6,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: colors.brand,
    marginBottom: 8,
    marginTop: 14,
  },
  subTitle: {
    fontSize: 10.5,
    fontWeight: "bold",
    color: colors.ink,
    marginBottom: 4,
    marginTop: 8,
  },
  paragraph: {
    fontSize: 9,
    color: colors.ink,
    lineHeight: 1.4,
    marginBottom: 4,
  },
  muted: {
    color: colors.muted,
  },
  table: {
    width: "100%",
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableRowLast: {
    flexDirection: "row",
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: colors.headerBg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  th: {
    padding: 4,
    fontSize: 8,
    fontWeight: "bold",
    color: colors.ink,
  },
  td: {
    padding: 4,
    fontSize: 8.5,
    color: colors.ink,
  },
  labelCell: {
    width: "34%",
    padding: 4,
    fontSize: 8.5,
    color: colors.muted,
    backgroundColor: colors.headerBg,
  },
  valueCell: {
    width: "66%",
    padding: 4,
    fontSize: 8.5,
    color: colors.ink,
  },
  kvRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  badge: {
    fontSize: 7.5,
    fontWeight: "bold",
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderWidth: 1,
    borderRadius: 2,
    textAlign: "center",
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
    gap: 6,
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  photoCard: {
    width: "31%",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  photoImage: {
    width: "100%",
    height: 110,
    objectFit: "cover",
  },
  photoCaption: {
    fontSize: 7.5,
    padding: 4,
    color: colors.ink,
  },
  signatureBlock: {
    width: "48%",
    borderTopWidth: 1,
    borderTopColor: colors.ink,
    marginTop: 40,
    paddingTop: 4,
  },
  coverTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: colors.brand,
    marginTop: 24,
  },
  coverSubtitle: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 4,
  },
});

export function statusColor(status: string) {
  if (status === "OK") return colors.ok;
  if (status === "V") return colors.v;
  if (status === "R") return colors.r;
  return colors.n;
}
