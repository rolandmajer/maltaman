"use client";

import { notFound, useParams } from "next/navigation";
import type { WizardStepKey } from "@/lib/constants";
import { StepZakladneUdaje } from "@/components/wizard/steps/step-zakladne-udaje";
import { StepUcastnici } from "@/components/wizard/steps/step-ucastnici";
import { StepMiestnosti } from "@/components/wizard/steps/step-miestnosti";
import { StepTechnickyStav } from "@/components/wizard/steps/step-technicky-stav";
import { StepZhrnutie } from "@/components/wizard/steps/step-zhrnutie";
import { StepNaklady } from "@/components/wizard/steps/step-naklady";
import { StepOdporucania } from "@/components/wizard/steps/step-odporucania";
import { StepFoto } from "@/components/wizard/steps/step-foto";
import { StepVybavenost } from "@/components/wizard/steps/step-vybavenost";
import { StepVyhlasenie } from "@/components/wizard/steps/step-vyhlasenie";
import { StepExport } from "@/components/wizard/steps/step-export";

const STEP_COMPONENTS: Record<WizardStepKey, React.ComponentType> = {
  "zakladne-udaje": StepZakladneUdaje,
  ucastnici: StepUcastnici,
  miestnosti: StepMiestnosti,
  "technicky-stav": StepTechnickyStav,
  zhrnutie: StepZhrnutie,
  naklady: StepNaklady,
  odporucania: StepOdporucania,
  foto: StepFoto,
  vybavenost: StepVybavenost,
  vyhlasenie: StepVyhlasenie,
  export: StepExport,
};

export default function WizardStepPage() {
  const params = useParams<{ step: string }>();
  const Component = STEP_COMPONENTS[params.step as WizardStepKey];
  if (!Component) notFound();
  return <Component />;
}
