"use client";

import { ROOM_ELEMENT_ADDITIONAL_CONFIG } from "@/lib/constants";
import { parseJsonStringArray, stringifyJsonArray } from "@/lib/element-description";
import { SearchableSelect, SearchableMultiSelect } from "@/components/wizard/searchable-select";
import type { FullElementAttribute } from "@/types/inspection";

/**
 * Config-driven form for one element's informational dropdowns (Typ/Materiál/Konštrukcia/...).
 * Replaces what would otherwise be ~21 bespoke components — every element is just a different
 * ROOM_ELEMENT_ADDITIONAL_CONFIG entry rendered through this single component.
 */
export function ElementAttributesForm({
  elementKey,
  attributes,
  onAttributeChange,
}: {
  elementKey: string;
  attributes: FullElementAttribute[];
  onAttributeChange: (attributeKey: string, value: string) => void;
}) {
  const config = ROOM_ELEMENT_ADDITIONAL_CONFIG[elementKey];
  if (!config || config.attributes.length === 0) return null;

  const getValue = (key: string) => attributes.find((a) => a.attributeKey === key)?.value ?? "";

  const visibleFields = config.attributes.filter((field) => {
    if (!field.conditionalOn) return true;
    const controllingValue = getValue(field.conditionalOn.attributeKey);
    return field.conditionalOn.showWhenValueIn.includes(controllingValue);
  });

  if (visibleFields.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {visibleFields.map((field) =>
        field.multiSelect ? (
          <SearchableMultiSelect
            key={field.key}
            label={field.label}
            values={parseJsonStringArray(getValue(field.key) || "[]")}
            onChange={(values) => onAttributeChange(field.key, stringifyJsonArray(values))}
            options={field.options}
            category={`element-attribute:${elementKey}:${field.key}`}
          />
        ) : (
          <SearchableSelect
            key={field.key}
            label={field.label}
            value={getValue(field.key)}
            onChange={(value) => onAttributeChange(field.key, value)}
            options={field.options}
            category={`element-attribute:${elementKey}:${field.key}`}
          />
        )
      )}
    </div>
  );
}
