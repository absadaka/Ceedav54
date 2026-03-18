import {
  Document, Page, View, Text, StyleSheet,
} from "@react-pdf/renderer";

const BRAND = "#161aff";
const GREY  = "#6b7280";
const LIGHT = "#f3f4f6";
const DARK  = "#111827";

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: DARK,
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 40,
  },

  /* header */
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  shopName: { fontSize: 16, fontFamily: "Helvetica-Bold", color: BRAND, letterSpacing: 0.5 },
  shopSub:  { fontSize: 8, color: GREY, marginTop: 2 },
  docTitle: { textAlign: "right" },
  docWord:  { fontSize: 20, fontFamily: "Helvetica-Bold", color: GREY, letterSpacing: 2, textTransform: "uppercase" },
  docRef:   { fontSize: 10, color: BRAND, fontFamily: "Helvetica-Bold", marginTop: 3, textAlign: "right" },
  statusPill: {
    marginTop: 5,
    alignSelf: "flex-end",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: LIGHT,
    textAlign: "right",
  },
  statusText: { fontSize: 8, fontFamily: "Helvetica-Bold", color: GREY, textTransform: "uppercase", letterSpacing: 0.8 },

  divider: { height: 1, backgroundColor: BRAND, marginBottom: 16 },

  /* two-column info block */
  infoRow: { flexDirection: "row", gap: 20, marginBottom: 16 },
  infoBox: { flex: 1, padding: 10, backgroundColor: LIGHT, borderRadius: 4 },
  infoLabel: { fontSize: 7, fontFamily: "Helvetica-Bold", color: GREY, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 5 },
  infoLine:  { fontSize: 9, color: DARK, marginBottom: 2 },
  infoMuted: { fontSize: 8, color: GREY },

  /* table */
  tableHeader: { flexDirection: "row", backgroundColor: BRAND, borderRadius: 3, paddingHorizontal: 8, paddingVertical: 5, marginBottom: 2 },
  thText: { color: "#ffffff", fontFamily: "Helvetica-Bold", fontSize: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  tableRow: { flexDirection: "row", paddingHorizontal: 8, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  tableRowAlt: { backgroundColor: LIGHT },
  tdText: { fontSize: 9, color: DARK },
  tdMuted: { fontSize: 8, color: GREY, marginTop: 1 },
  colDesc:  { flex: 1 },
  colQty:   { width: 36, textAlign: "right" },
  colUnit:  { width: 70, textAlign: "right" },
  colTotal: { width: 76, textAlign: "right" },

  /* totals */
  totalsBlock: { marginTop: 10, alignItems: "flex-end" },
  totalsTable: { width: 220 },
  totalRow:    { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2.5 },
  totalLabel:  { color: GREY, fontSize: 9 },
  totalValue:  { fontSize: 9, textAlign: "right", fontFamily: "Helvetica-Bold" },
  totalDivider: { height: 1, backgroundColor: "#e5e7eb", marginVertical: 4 },
  grandLabel:  { fontSize: 11, fontFamily: "Helvetica-Bold", color: DARK },
  grandValue:  { fontSize: 11, fontFamily: "Helvetica-Bold", color: BRAND, textAlign: "right" },
  balanceLabel: { fontSize: 9, fontFamily: "Helvetica-Bold", color: GREY },
  balanceValue: { fontSize: 9, fontFamily: "Helvetica-Bold", color: GREY, textAlign: "right" },
  discountValue: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#d97706", textAlign: "right" },

  /* payments */
  paySection: { marginTop: 14, padding: 10, backgroundColor: "#f0fdf4", borderRadius: 4, borderWidth: 1, borderColor: "#bbf7d0" },
  payLabel:   { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#166534", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 },
  payRow:     { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  payText:    { fontSize: 8, color: "#166534" },
  payAmt:     { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#166534" },

  /* notes */
  notesBlock: { marginTop: 14, padding: 10, backgroundColor: LIGHT, borderRadius: 4 },
  notesLabel: { fontSize: 7, fontFamily: "Helvetica-Bold", color: GREY, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 },
  notesText:  { fontSize: 9, color: DARK, lineHeight: 1.5 },

  /* footer */
  footer:     { position: "absolute", bottom: 24, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 7.5, color: GREY },
});

function fmtAed(val: string | number | null) {
  return `AED ${parseFloat(String(val ?? 0)).toLocaleString("en-US", {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  })}`;
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function cap(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export interface QuotationPDFProps {
  shopName:   string;
  qt:         any;
  lines:      any[];
  advs:       any[];
  totalPaid:  number;
  balance:    number;
}

export default function QuotationPDFDocument({
  shopName, qt, lines, advs, totalPaid, balance,
}: QuotationPDFProps) {
  const positiveLines = lines.filter((l: any) => parseFloat(l.line_total ?? "0") >= 0);
  const discountLines = lines.filter((l: any) => parseFloat(l.line_total ?? "0") < 0);
  const lineDiscount  = discountLines.reduce((s: number, l: any) => s + Math.abs(parseFloat(l.line_total ?? "0")), 0);

  return (
    <Document title={`Quotation ${qt.ref}`} author={shopName}>
      <Page size="A4" style={s.page}>

        {/* ── Header ── */}
        <View style={s.header}>
          <View>
            <Text style={s.shopName}>{shopName}</Text>
            <Text style={s.shopSub}>Automotive Workshop</Text>
          </View>
          <View style={s.docTitle}>
            <Text style={s.docWord}>Quotation</Text>
            <Text style={s.docRef}>{qt.ref}</Text>
            <View style={s.statusPill}>
              <Text style={s.statusText}>{cap(qt.status)}</Text>
            </View>
          </View>
        </View>

        <View style={s.divider} />

        {/* ── Info row ── */}
        <View style={s.infoRow}>
          {/* Customer */}
          <View style={s.infoBox}>
            <Text style={s.infoLabel}>Bill To</Text>
            {qt.client_name
              ? <Text style={s.infoLine}>{qt.client_name}</Text>
              : <Text style={s.infoMuted}>No customer</Text>
            }
            {qt.client_phone && <Text style={s.infoMuted}>{qt.client_phone}</Text>}
          </View>

          {/* Vehicle */}
          <View style={s.infoBox}>
            <Text style={s.infoLabel}>Vehicle</Text>
            {qt.plate_number
              ? <>
                  <Text style={s.infoLine}>{qt.plate_number}</Text>
                  <Text style={s.infoMuted}>
                    {[qt.vehicle_year, qt.vehicle_make, qt.vehicle_model].filter(Boolean).join(" ")}
                  </Text>
                  {qt.vehicle_mileage
                    ? <Text style={s.infoMuted}>{parseInt(qt.vehicle_mileage).toLocaleString()} km</Text>
                    : null
                  }
                </>
              : <Text style={s.infoMuted}>No vehicle</Text>
            }
          </View>

          {/* Dates */}
          <View style={s.infoBox}>
            <Text style={s.infoLabel}>Details</Text>
            <Text style={s.infoLine}>Date: {fmtDate(qt.created_at)}</Text>
            {qt.expires_at && <Text style={s.infoMuted}>Valid until: {fmtDate(qt.expires_at)}</Text>}
            {qt.advisor_name && <Text style={s.infoMuted}>Advisor: {qt.advisor_name}</Text>}
          </View>
        </View>

        {/* ── Line items table ── */}
        <View style={s.tableHeader}>
          <Text style={[s.thText, s.colDesc]}>Description</Text>
          <Text style={[s.thText, s.colQty]}>Qty</Text>
          <Text style={[s.thText, s.colUnit]}>Unit Price</Text>
          <Text style={[s.thText, s.colTotal]}>Total</Text>
        </View>

        {positiveLines.map((l: any, i: number) => (
          <View key={l.id} style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]} wrap={false}>
            <View style={s.colDesc}>
              <Text style={s.tdText}>{l.description}</Text>
              {l.part_number ? <Text style={s.tdMuted}>SKU: {l.part_number}</Text> : null}
            </View>
            <Text style={[s.tdText, s.colQty]}>{parseFloat(l.qty)}</Text>
            <Text style={[s.tdText, s.colUnit]}>{fmtAed(l.unit_price)}</Text>
            <Text style={[s.tdText, s.colTotal]}>{fmtAed(l.line_total)}</Text>
          </View>
        ))}

        {positiveLines.length === 0 && (
          <View style={[s.tableRow]}>
            <Text style={[s.tdText, s.colDesc, { color: GREY }]}>No line items</Text>
          </View>
        )}

        {/* ── Totals ── */}
        <View style={s.totalsBlock}>
          <View style={s.totalsTable}>
            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Subtotal</Text>
              <Text style={s.totalValue}>{fmtAed(qt.subtotal)}</Text>
            </View>

            {lineDiscount > 0 && (
              <View style={s.totalRow}>
                <Text style={s.totalLabel}>Discount</Text>
                <Text style={s.discountValue}>− {fmtAed(lineDiscount.toFixed(2))}</Text>
              </View>
            )}

            <View style={s.totalRow}>
              <Text style={s.totalLabel}>VAT ({qt.tax_rate}%)</Text>
              <Text style={s.totalValue}>{fmtAed(qt.tax_amount)}</Text>
            </View>

            <View style={s.totalDivider} />

            <View style={s.totalRow}>
              <Text style={s.grandLabel}>Total</Text>
              <Text style={s.grandValue}>{fmtAed(qt.total)}</Text>
            </View>

            {totalPaid > 0 && (
              <>
                <View style={s.totalRow}>
                  <Text style={s.totalLabel}>Advance paid</Text>
                  <Text style={[s.totalValue, { color: "#16a34a" }]}>− {fmtAed(totalPaid)}</Text>
                </View>
                <View style={s.totalDivider} />
                <View style={s.totalRow}>
                  <Text style={s.balanceLabel}>Balance due</Text>
                  <Text style={s.balanceValue}>{fmtAed(balance)}</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* ── Advance payments detail ── */}
        {advs.length > 0 && (
          <View style={s.paySection}>
            <Text style={s.payLabel}>Advance payments received</Text>
            {advs.map((a: any) => (
              <View key={a.id} style={s.payRow}>
                <Text style={s.payText}>
                  {fmtDate(a.paid_at ?? a.created_at)} · {cap(a.method ?? "")}
                  {a.reference ? ` · Ref: ${a.reference}` : ""}
                  {a.note      ? ` · ${a.note}` : ""}
                </Text>
                <Text style={s.payAmt}>{fmtAed(a.amount)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Notes ── */}
        {qt.notes && (
          <View style={s.notesBlock}>
            <Text style={s.notesLabel}>Notes</Text>
            <Text style={s.notesText}>{qt.notes}</Text>
          </View>
        )}

        {/* ── Footer ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>{shopName} — {qt.ref}</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>

      </Page>
    </Document>
  );
}
