import { createContext, useContext, useMemo, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

export type FirstUnitGuideStep = "map" | "story" | "messenger" | "call";

const FirstUnitGuideContext = createContext<{
  enabled: boolean;
  dismissed: readonly FirstUnitGuideStep[];
  dismiss: (step: FirstUnitGuideStep) => void;
}>({ enabled: false, dismissed: [], dismiss: () => {} });

/** Route changes retain dismissed hints; persisted journey progress excludes returning learners. */
export function FirstUnitGuideProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  const [dismissed, setDismissed] = useState<readonly FirstUnitGuideStep[]>([]);
  const value = useMemo(
    () => ({
      enabled,
      dismissed,
      dismiss: (step: FirstUnitGuideStep) => {
        "background only";
        setDismissed((steps) => (steps.includes(step) ? steps : [...steps, step]));
      },
    }),
    [enabled, dismissed],
  );
  return <FirstUnitGuideContext.Provider value={value}>{children}</FirstUnitGuideContext.Provider>;
}

export function useFirstUnitGuide(step: FirstUnitGuideStep, eligible = true) {
  const guide = useContext(FirstUnitGuideContext);
  return {
    visible: eligible && guide.enabled && !guide.dismissed.includes(step),
    dismiss: () => {
      "background only";
      guide.dismiss(step);
    },
  };
}
