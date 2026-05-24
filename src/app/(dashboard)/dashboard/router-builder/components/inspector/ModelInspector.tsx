"use client";

// Model inspector. A Model node is just the YAML `model:` string — the YAML
// is the source of truth, so the only field is the model itself.

import { Field } from "./primitives";
import { ModelPicker, useConnectedModels } from "./ModelPicker";

export function ModelEditor({
  model,
  onUpdate,
}: {
  model: any;
  onUpdate: (patch: any) => void;
}) {
  const available = useConnectedModels();

  return (
    <Field
      label="Model"
      required
      hint={
        available && available.length === 0
          ? "No providers connected — type a model id manually, or connect a provider first."
          : "Pick from your connected providers, or type a model id."
      }
    >
      <ModelPicker
        value={model.model_id || ""}
        onChange={(v) => onUpdate({ model_id: v })}
      />
    </Field>
  );
}
