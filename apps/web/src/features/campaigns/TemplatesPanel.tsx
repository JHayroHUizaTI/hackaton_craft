"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { confirmDialog } from "@/lib/confirm";
import type { CreateTemplateInput, TemplateDto } from "@crm/shared";
import {
  createTemplate,
  deleteTemplate,
  fetchTemplates,
} from "@/lib/bff";
import { badge, box, ghostBtn, input, label, primaryBtn } from "./styles";

// Extrae los índices {{1}}, {{2}}… del cuerpo.
function extractVars(body: string): number[] {
  const set = new Set<number>();
  for (const m of body.matchAll(/\{\{\s*(\d+)\s*\}\}/g)) set.add(Number(m[1]));
  return [...set].sort((a, b) => a - b);
}

export function TemplatesPanel() {
  const queryClient = useQueryClient();
  const { data: templates, isPending } = useQuery({
    queryKey: ["templates"],
    queryFn: fetchTemplates,
  });
  const [creating, setCreating] = useState(false);

  const remove = useMutation({
    mutationFn: deleteTemplate,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["templates"] }),
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ color: "var(--muted)", margin: 0, fontSize: 14 }}>
          Plantillas de mensaje para enviar fuera de la ventana de 24h. Usa{" "}
          <code>{"{{1}}"}</code>, <code>{"{{2}}"}</code>… para variables.
        </p>
        <button onClick={() => setCreating(true)} style={primaryBtn}>
          + Nueva plantilla
        </button>
      </div>

      {creating && (
        <TemplateForm
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            queryClient.invalidateQueries({ queryKey: ["templates"] });
          }}
        />
      )}

      {isPending && <p style={{ color: "var(--muted)" }}>Cargando…</p>}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {(templates ?? []).map((t) => (
          <TemplateRow key={t.id} template={t} onDelete={() => remove.mutate(t.id)} />
        ))}
        {templates && templates.length === 0 && !creating && (
          <p style={{ color: "var(--muted)" }}>Aún no hay plantillas.</p>
        )}
      </div>
    </div>
  );
}

function TemplateRow({
  template,
  onDelete,
}: {
  template: TemplateDto;
  onDelete: () => void;
}) {
  return (
    <div style={{ ...box, display: "flex", gap: 12, alignItems: "flex-start" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <strong>{template.name}</strong>
          <span style={badge("#43506a")}>{template.language}</span>
          <span style={badge(template.status === "APPROVED" ? "#1f6f46" : "#caa14a")}>
            {template.status}
          </span>
        </div>
        <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 6, whiteSpace: "pre-wrap" }}>
          {template.body}
        </div>
      </div>
      <button
        onClick={() => {
          void confirmDialog({
            message: `¿Eliminar la plantilla "${template.name}"?`,
            danger: true,
          }).then((ok) => ok && onDelete());
        }}
        style={{ ...ghostBtn, color: "#e08a8a", borderColor: "#5a2a2a" }}
      >
        Eliminar
      </button>
    </div>
  );
}

function TemplateForm({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [language, setLanguage] = useState("es");
  const [body, setBody] = useState("");
  const vars = useMemo(() => extractVars(body), [body]);

  const save = useMutation({
    mutationFn: () => {
      const input: CreateTemplateInput = {
        name,
        language,
        body,
        status: "APPROVED",
        variables: vars.map((index) => ({ index, label: `Variable ${index}` })),
      };
      return createTemplate(input);
    },
    onSuccess: onSaved,
  });

  return (
    <div style={{ ...box, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={label}>Nombre (minúsculas y _)</div>
          <input
            style={input}
            value={name}
            placeholder="promo_septiembre"
            onChange={(e) =>
              setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"))
            }
          />
        </div>
        <div style={{ width: 120 }}>
          <div style={label}>Idioma</div>
          <input style={input} value={language} onChange={(e) => setLanguage(e.target.value)} />
        </div>
      </div>
      <div>
        <div style={label}>Cuerpo del mensaje</div>
        <textarea
          style={{ ...input, minHeight: 110, resize: "vertical", fontFamily: "inherit" }}
          value={body}
          placeholder="Hola {{1}}, tenemos una promo para ti 🎉"
          onChange={(e) => setBody(e.target.value)}
        />
      </div>
      {vars.length > 0 && (
        <div style={{ color: "var(--muted)", fontSize: 13 }}>
          Variables detectadas: {vars.map((v) => `{{${v}}}`).join(", ")}
        </div>
      )}
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        {save.isError && (
          <span style={{ color: "#ff6b6b", fontSize: 13, alignSelf: "center" }}>
            {(save.error as Error).message}
          </span>
        )}
        <button onClick={onClose} style={ghostBtn}>
          Cancelar
        </button>
        <button
          onClick={() => save.mutate()}
          disabled={save.isPending || !name || !body}
          style={primaryBtn}
        >
          {save.isPending ? "Guardando…" : "Crear plantilla"}
        </button>
      </div>
    </div>
  );
}
