"use client";

import { Plus } from "lucide-react";
import { useInspectionContext } from "@/lib/inspection-context";
import { apiPatch, apiPost, apiDelete } from "@/lib/offline/api-client";
import { StepPageHeader, StepSection } from "@/components/wizard/step-section";
import { InlineTextAreaField } from "@/components/wizard/inline-field";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { Button } from "@/components/ui/button";
import { RECOMMENDATION_CATEGORY_LABELS } from "@/lib/constants";
import type { FullRecommendation } from "@/types/inspection";

const CATEGORY_ORDER = Object.keys(RECOMMENDATION_CATEGORY_LABELS);

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

  async function addRecommendation(category: string) {
    const order = inspection.recommendations.filter((r) => r.category === category).length;
    await create(
      () =>
        apiPost<FullRecommendation>(
          `/api/inspections/${inspection.id}/recommendations`,
          { category, text: "", order },
          "Nové odporúčanie"
        ),
      (prev, created) => ({ ...prev, recommendations: [...prev.recommendations, created] })
    );
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
              <Button size="sm" variant="outline" onClick={() => void addRecommendation(category)}>
                <Plus /> Pridať
              </Button>
            }
          >
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
