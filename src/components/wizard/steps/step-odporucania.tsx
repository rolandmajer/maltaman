"use client";

import { useMemo } from "react";
import { Plus, Sparkles } from "lucide-react";
import { useInspectionContext } from "@/lib/inspection-context";
import { apiPatch, apiPost, apiDelete } from "@/lib/offline/api-client";
import { StepPageHeader, StepSection } from "@/components/wizard/step-section";
import { InlineTextAreaField } from "@/components/wizard/inline-field";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { Button } from "@/components/ui/button";
import { RECOMMENDATION_CATEGORY_LABELS } from "@/lib/constants";
import { computeCostItem, computeCostTotals, type CostItemForTotals } from "@/lib/calculations";
import {
  generateNegotiationBasis,
  generateConclusion,
  type RecommendationInput,
} from "@/lib/recommendation-generator";
import type { FullRecommendation } from "@/types/inspection";

const CATEGORY_ORDER = Object.keys(RECOMMENDATION_CATEGORY_LABELS);

/** The two narrative sections that can be drafted from the rest of the protocol. */
const GENERATORS: Record<string, (input: RecommendationInput) => string> = {
  NEGOTIATION: generateNegotiationBasis,
  CONCLUSION: generateConclusion,
};

export function StepOdporucania() {
  const { inspection, applyAndSave, create } = useInspectionContext();

  function updateRecommendation(id: string, patch: Partial<FullRecommendation>) {
    void applyAndSave(
      (prev) => ({ ...prev, recommendations: prev.recommendations.map((r) => (r.id === id ? { ...r, ...patch } : r)) }),
      () => apiPatch(`/api/inspections/${inspection.id}/recommendations/${id}`, patch, "Odporúčanie")
    );
  }

  function deleteRecommendation(id: string) {
    void applyAndSave(
      (prev) => ({ ...prev, recommendations: prev.recommendations.filter((r) => r.id !== id) }),
      () => apiDelete(`/api/inspections/${inspection.id}/recommendations/${id}`, "Odstránenie odporúčania")
    );
  }

  async function addRecommendation(category: string, text = "") {
    const order = inspection.recommendations.filter((r) => r.category === category).length;
    await create(
      () =>
        apiPost<FullRecommendation>(
          `/api/inspections/${inspection.id}/recommendations`,
          { category, text, order },
          "Nové odporúčanie"
        ),
      (prev, created) => ({ ...prev, recommendations: [...prev.recommendations, created] })
    );
  }

  // Everything the generators need, gathered from both defect sources and the cost module.
  const generatorInput = useMemo<RecommendationInput>(() => {
    const roomNameById = new Map(inspection.rooms.map((r) => [r.id, r.name]));

    const findingDefects = inspection.findings
      .filter((f) => f.status === "V" || f.status === "R")
      .map((f) => ({
        severity: f.severity,
        label: f.label,
        location: f.roomId ? (roomNameById.get(f.roomId) ?? "") : f.location,
      }));

    const roomDefects = inspection.rooms.flatMap((room) =>
      room.elements
        .filter((el) => el.status === "V" || el.status === "R")
        .flatMap((el) =>
          el.conditions.map((c) => ({
            severity: c.severity,
            label: el.label,
            location: [room.name, c.location].filter(Boolean).join(" · "),
          }))
        )
    );

    const categoryNameById = new Map(inspection.costCategories.map((c) => [c.id, c.name]));
    const totalsInput: CostItemForTotals[] = inspection.costItems.map((item) => ({
      id: item.id,
      categoryId: item.categoryId,
      categoryName: categoryNameById.get(item.categoryId) ?? "",
      roomId: item.roomId,
      roomName: item.roomId ? (roomNameById.get(item.roomId) ?? null) : null,
      priority: item.priority,
      included: item.included,
      ...computeCostItem(item, inspection.costsEnteredInclVat),
    }));
    const totals = computeCostTotals(totalsInput, inspection.contingencyPercent);

    return {
      defects: [...findingDefects, ...roomDefects],
      overallConditionRating: inspection.overallConditionRating,
      overallVerdict: inspection.overallVerdict,
      mainRisks: inspection.mainRisks,
      immediateActions: inspection.immediateActions,
      totalCost: totals.finalTotalWithContingency,
      costByPriority: totals.byPriority,
      recommendedDiscountAmount: inspection.recommendedDiscountAmount,
    };
  }, [inspection]);

  /** Writes a fresh draft into the section's first card, creating it if the section is empty. */
  async function generateInto(category: string) {
    const text = GENERATORS[category](generatorInput);
    const existing = inspection.recommendations
      .filter((r) => r.category === category)
      .sort((a, b) => a.order - b.order)[0];

    if (existing) updateRecommendation(existing.id, { text });
    else await addRecommendation(category, text);
  }

  return (
    <div>
      <StepPageHeader title="Odporúčania" description="Štruktúrované odporúčania poradcu podľa kategórií." />

      {CATEGORY_ORDER.map((category) => {
        const items = inspection.recommendations
          .filter((r) => r.category === category)
          .sort((a, b) => a.order - b.order);
        return (
          <StepSection
            key={category}
            title={RECOMMENDATION_CATEGORY_LABELS[category]}
            actions={
              <div className="flex gap-2">
                {GENERATORS[category] && (
                  <Button size="sm" variant="outline" onClick={() => void generateInto(category)}>
                    <Sparkles /> Vygenerovať
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => void addRecommendation(category)}>
                  <Plus /> Pridať
                </Button>
              </div>
            }
          >
            {GENERATORS[category] && (
              <p className="text-xs text-slate-400">
                Text sa vytvorí z údajov v protokole (zistenia, náklady, riziká). Po vygenerovaní ho môžete
                ľubovoľne upraviť — vaše úpravy sa samé neprepíšu.
              </p>
            )}
            {items.length === 0 && <p className="text-sm text-slate-400">Zatiaľ žiadne odporúčania v tejto kategórii.</p>}
            <div className="flex flex-col gap-2">
              {items.map((rec) => (
                <div key={rec.id} className="flex items-start gap-2">
                  <InlineTextAreaField
                    value={rec.text}
                    onCommit={(v) => updateRecommendation(rec.id, { text: v })}
                    className="flex-1"
                  />
                  <ConfirmDeleteButton onConfirm={() => deleteRecommendation(rec.id)} title="Odstrániť odporúčanie?" />
                </div>
              ))}
            </div>
          </StepSection>
        );
      })}
    </div>
  );
}
