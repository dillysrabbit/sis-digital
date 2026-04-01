import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Save, Sparkles, Loader2, ClipboardCheck } from "lucide-react";
import { TextBlockButton } from "./TextBlockButton";

type RiskCheckboxes = { tf1?: { ja: boolean; weitere: boolean }; tf2?: { ja: boolean; weitere: boolean }; tf3?: { ja: boolean; weitere: boolean }; tf4?: { ja: boolean; weitere: boolean }; tf5?: { ja: boolean; weitere: boolean } };

export interface RiskMatrixData {
  dekubitus?: RiskCheckboxes;
  sturz?: RiskCheckboxes;
  inkontinenz?: RiskCheckboxes;
  schmerz?: RiskCheckboxes;
  ernaehrung?: RiskCheckboxes;
  sonstiges?: { title?: string } & RiskCheckboxes;
}

export interface SISFormData {
  patientName: string;
  birthDate: string;
  conversationDate: string;
  nurseSignature: string;
  relativeOrCaregiver: string;
  diagnosen: Array<{ diagnose: string; auswirkungen: string }>;
  oTon: string;
  themenfeld1: string;
  themenfeld2: string;
  themenfeld3: string;
  themenfeld4: string;
  themenfeld5: string;
  themenfeld6: string;
  riskMatrix: RiskMatrixData;
}

interface SISFormProps {
  initialData?: Partial<SISFormData>;
  onSave: (data: SISFormData) => void;
  onGeneratePlan: () => void;
  onCheckSis?: () => void;
  isSaving?: boolean;
  isGenerating?: boolean;
  isChecking?: boolean;
}

const defaultRiskMatrix: RiskMatrixData = {
  dekubitus: { tf1: { ja: false, weitere: false }, tf2: { ja: false, weitere: false }, tf3: { ja: false, weitere: false }, tf4: { ja: false, weitere: false }, tf5: { ja: false, weitere: false } },
  sturz: { tf1: { ja: false, weitere: false }, tf2: { ja: false, weitere: false }, tf3: { ja: false, weitere: false }, tf4: { ja: false, weitere: false }, tf5: { ja: false, weitere: false } },
  inkontinenz: { tf1: { ja: false, weitere: false }, tf2: { ja: false, weitere: false }, tf3: { ja: false, weitere: false }, tf4: { ja: false, weitere: false }, tf5: { ja: false, weitere: false } },
  schmerz: { tf1: { ja: false, weitere: false }, tf2: { ja: false, weitere: false }, tf3: { ja: false, weitere: false }, tf4: { ja: false, weitere: false }, tf5: { ja: false, weitere: false } },
  ernaehrung: { tf1: { ja: false, weitere: false }, tf2: { ja: false, weitere: false }, tf3: { ja: false, weitere: false }, tf4: { ja: false, weitere: false }, tf5: { ja: false, weitere: false } },
  sonstiges: { title: "Sonstiges", tf1: { ja: false, weitere: false }, tf2: { ja: false, weitere: false }, tf3: { ja: false, weitere: false }, tf4: { ja: false, weitere: false }, tf5: { ja: false, weitere: false } },
};

export function SISForm({ initialData, onSave, onGeneratePlan, onCheckSis, isSaving, isGenerating, isChecking }: SISFormProps) {
  // Track if initial data has been loaded to prevent overwriting user edits
  const hasInitializedRef = useRef(false);
  const initialDataIdRef = useRef<string | undefined>(undefined);
  
  // Create a stable ID from initialData to detect when we're loading a different entry
  const currentDataId = initialData?.patientName ? `${initialData.patientName}-${initialData.birthDate || ''}` : undefined;

  const [formData, setFormData] = useState<SISFormData>({
    patientName: initialData?.patientName || "",
    birthDate: initialData?.birthDate || "",
    conversationDate: initialData?.conversationDate || new Date().toISOString().split("T")[0],
    nurseSignature: initialData?.nurseSignature || "",
    relativeOrCaregiver: initialData?.relativeOrCaregiver || "",
    diagnosen: initialData?.diagnosen || [],
    oTon: initialData?.oTon || "",
    themenfeld1: initialData?.themenfeld1 || "",
    themenfeld2: initialData?.themenfeld2 || "",
    themenfeld3: initialData?.themenfeld3 || "",
    themenfeld4: initialData?.themenfeld4 || "",
    themenfeld5: initialData?.themenfeld5 || "",
    themenfeld6: initialData?.themenfeld6 || "",
    riskMatrix: initialData?.riskMatrix || defaultRiskMatrix,
  });

  // Only update form data on initial load OR when loading a completely different entry
  useEffect(() => {
    if (initialData) {
      // Only initialize if:
      // 1. We haven't initialized yet, OR
      // 2. We're loading a different entry (different patient)
      const isNewEntry = initialDataIdRef.current !== currentDataId;
      
      if (!hasInitializedRef.current || isNewEntry) {
        setFormData({
          patientName: initialData.patientName || "",
          birthDate: initialData.birthDate || "",
          conversationDate: initialData.conversationDate || new Date().toISOString().split("T")[0],
          nurseSignature: initialData.nurseSignature || "",
          relativeOrCaregiver: initialData.relativeOrCaregiver || "",
          diagnosen: initialData.diagnosen || [],
          oTon: initialData.oTon || "",
          themenfeld1: initialData.themenfeld1 || "",
          themenfeld2: initialData.themenfeld2 || "",
          themenfeld3: initialData.themenfeld3 || "",
          themenfeld4: initialData.themenfeld4 || "",
          themenfeld5: initialData.themenfeld5 || "",
          themenfeld6: initialData.themenfeld6 || "",
          riskMatrix: initialData.riskMatrix || defaultRiskMatrix,
        });
        
        hasInitializedRef.current = true;
        initialDataIdRef.current = currentDataId;
      }
    }
  }, [initialData, currentDataId]);

  const updateField = (field: keyof SISFormData, value: string | Array<{ diagnose: string; auswirkungen: string }>) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateRiskMatrix = (risk: keyof RiskMatrixData, tf: "tf1" | "tf2" | "tf3" | "tf4" | "tf5", field: "ja" | "weitere", value: boolean) => {
    setFormData((prev) => {
      const currentRisk = prev.riskMatrix[risk];
      
      return {
        ...prev,
        riskMatrix: {
          ...prev.riskMatrix,
          [risk]: {
            ...currentRisk,
            [tf]: {
              ...(currentRisk as any)?.[tf],
              [field]: value,
            },
          },
        },
      };
    });
  };

  const updateSonstigesTitle = (title: string) => {
    setFormData((prev) => ({
      ...prev,
      riskMatrix: {
        ...prev.riskMatrix,
        sonstiges: {
          ...prev.riskMatrix.sonstiges,
          title,
        },
      },
    }));
  };

  const handleSave = () => {
    onSave(formData);
  };

  const themenfelder = [
    { key: "themenfeld1", label: "Themenfeld 1 – Kognitive und kommunikative Fähigkeiten", color: "sis-tf1", textColor: "text-gray-900" },
    { key: "themenfeld2", label: "Themenfeld 2 – Mobilität und Beweglichkeit", color: "sis-tf2", textColor: "text-gray-900" },
    { key: "themenfeld3", label: "Themenfeld 3 – Krankheitsbezogene Anforderungen und Belastungen", color: "sis-tf3", textColor: "text-white" },
    { key: "themenfeld4", label: "Themenfeld 4 – Selbstversorgung", color: "sis-tf4", textColor: "text-white" },
    { key: "themenfeld5", label: "Themenfeld 5 – Leben in sozialen Beziehungen", color: "sis-tf5", textColor: "text-white" },
    { key: "themenfeld6", label: "Themenfeld 6 – Wohnen/Häuslichkeit", color: "sis-tf6", textColor: "text-white" },
  ];

  const risks = [
    { key: "dekubitus", label: "Dekubitus", bgColor: "bg-pink-100" },
    { key: "sturz", label: "Sturz", bgColor: "bg-purple-100" },
    { key: "inkontinenz", label: "Inkontinenz", bgColor: "bg-blue-100" },
    { key: "schmerz", label: "Schmerz", bgColor: "bg-green-100" },
    { key: "ernaehrung", label: "Ernährung", bgColor: "bg-yellow-100" },
    { key: "sonstiges", label: formData.riskMatrix.sonstiges?.title || "Sonstiges", bgColor: "bg-gray-100", editable: true },
  ];

  const tfLabels = [
    "1. Kognitive und kommunikative Fähigkeiten",
    "2. Mobilität und Beweglichkeit",
    "3. Krankheitsbezogene Anforderungen und Belastungen",
    "4. Selbstversorgung",
    "5. Leben in sozialen Beziehungen",
  ];

  return (
    <div className="space-y-6">
      {/* Kopfbereich - Stammdaten */}
      <Card>
        <CardHeader className="bg-gray-100 rounded-t-lg">
          <CardTitle className="text-base font-semibold">Stammdaten</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="patientName">Name der pflegebedürftigen Person *</Label>
              <Input
                id="patientName"
                value={formData.patientName}
                onChange={(e) => updateField("patientName", e.target.value)}
                placeholder="Vollständiger Name"
                required
              />
            </div>
            <div>
              <Label htmlFor="birthDate">Geburtsdatum</Label>
              <Input
                id="birthDate"
                type="date"
                value={formData.birthDate}
                onChange={(e) => updateField("birthDate", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="conversationDate">Gespräch am</Label>
              <Input
                id="conversationDate"
                type="date"
                value={formData.conversationDate}
                onChange={(e) => updateField("conversationDate", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="nurseSignature">Handzeichen Pflegefachkraft</Label>
              <Input
                id="nurseSignature"
                value={formData.nurseSignature}
                onChange={(e) => updateField("nurseSignature", e.target.value)}
                placeholder="Kürzel/Name"
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="relativeOrCaregiver">Pflegebedürftige Person/Angehöriger/Betreuer</Label>
              <Input
                id="relativeOrCaregiver"
                value={formData.relativeOrCaregiver}
                onChange={(e) => updateField("relativeOrCaregiver", e.target.value)}
                placeholder="Name des Angehörigen oder Betreuers"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pflegerelevante Diagnosen */}
      <div className="rounded-xl border border-l-4 border-l-blue-500 shadow-sm bg-card text-card-foreground overflow-hidden">
        <div className="bg-blue-500 text-white py-3 px-6">
          <div className="text-base font-semibold flex items-center justify-between">
            <span>Pflegerelevante Diagnosen</span>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                const newDiagnosen = [...formData.diagnosen, { diagnose: "", auswirkungen: "" }];
                updateField("diagnosen", newDiagnosen);
              }}
              className="bg-white/20 hover:bg-white/30 text-white border-white/30"
            >
              + Diagnose hinzufügen
            </Button>
          </div>
        </div>
        <div className="px-6 py-4 space-y-4">
          {formData.diagnosen.length === 0 ? (
            <p className="text-muted-foreground text-sm italic">
              Keine Diagnosen erfasst. Klicken Sie auf "+ Diagnose hinzufügen", um eine neue Diagnose hinzuzufügen.
            </p>
          ) : (
            formData.diagnosen.map((diagnose, index) => (
              <Card key={index} className="border border-gray-200">
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-3">
                      <div>
                        <Label htmlFor={`diagnose-${index}`} className="text-sm font-medium">
                          Diagnose {index + 1}
                        </Label>
                        <Input
                          id={`diagnose-${index}`}
                          value={diagnose.diagnose}
                          onChange={(e) => {
                            const newDiagnosen = [...formData.diagnosen];
                            newDiagnosen[index].diagnose = e.target.value;
                            updateField("diagnosen", newDiagnosen);
                          }}
                          placeholder="z.B. Diabetes mellitus Typ 2, Demenz, Herzinsuffizienz..."
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`auswirkungen-${index}`} className="text-sm font-medium">
                          Auswirkungen auf die Themenfelder
                        </Label>
                        <Textarea
                          id={`auswirkungen-${index}`}
                          value={diagnose.auswirkungen}
                          onChange={(e) => {
                            const newDiagnosen = [...formData.diagnosen];
                            newDiagnosen[index].auswirkungen = e.target.value;
                            updateField("diagnosen", newDiagnosen);
                          }}
                          placeholder="Beschreiben Sie, wie sich diese Diagnose auf Mobilität, Kognition, Selbstversorgung etc. auswirkt..."
                          className="min-h-[100px] mt-1"
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const newDiagnosen = formData.diagnosen.filter((_, i) => i !== index);
                        updateField("diagnosen", newDiagnosen);
                      }}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      Entfernen
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Feld A - O-Ton */}
      <div className="rounded-xl border border-l-4 border-l-[var(--sis-oton)] shadow-sm bg-card text-card-foreground overflow-hidden">
        <div className="sis-oton text-white py-3 px-6">
          <div className="text-base font-semibold">
            Was bewegt Sie im Augenblick? Was brauchen Sie? Was können wir für Sie tun?
          </div>
        </div>
        <div className="px-6 py-4 space-y-2">
          <div className="flex justify-end">
            <TextBlockButton
              category="oTon"
              onSelect={(content) => updateField("oTon", formData.oTon + (formData.oTon ? "\n\n" : "") + content)}
            />
          </div>
          <Textarea
            value={formData.oTon}
            onChange={(e) => updateField("oTon", e.target.value)}
            placeholder="Erfassen Sie hier die Perspektive und Wünsche der pflegebedürftigen Person in deren eigenen Worten..."
            className="min-h-[150px]"
          />
        </div>
      </div>

      {/* Themenfelder */}
      {themenfelder.map((tf) => (
        <div key={tf.key} className="rounded-xl border border-l-4 shadow-sm bg-card text-card-foreground overflow-hidden" style={{ borderLeftColor: `var(--${tf.color.replace("sis-", "sis-")})` }}>
          <div className={`${tf.color} ${tf.textColor} py-3 px-6`}>
            <div className="text-base font-semibold">{tf.label}</div>
          </div>
          <div className="px-6 py-4 space-y-2">
            <div className="flex justify-end">
              <TextBlockButton
                category={tf.key}
                onSelect={(content) => {
                  const currentValue = formData[tf.key as keyof SISFormData] as string;
                  updateField(tf.key as keyof SISFormData, currentValue + (currentValue ? "\n\n" : "") + content);
                }}
              />
            </div>
            <Textarea
              value={formData[tf.key as keyof SISFormData] as string}
              onChange={(e) => updateField(tf.key as keyof SISFormData, e.target.value)}
              placeholder={`Pflegefachliche Einschätzung zu ${tf.label}...`}
              className="min-h-[120px]"
            />
          </div>
        </div>
      ))}

      {/* Risikomatrix */}
      <Card>
        <CardHeader className="bg-gray-100 rounded-t-lg">
          <CardTitle className="text-base font-semibold">
            Erste fachliche Einschätzung der für die Pflege und Betreuung relevanten Risiken und Phänomene
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border border-gray-300 p-2 bg-gray-50 text-left"></th>
                {risks.map((risk) => (
                  <th key={risk.key} colSpan={2} className={`border border-gray-300 p-2 ${risk.bgColor} text-center`}>
                    {risk.editable ? (
                      <Input
                        value={formData.riskMatrix.sonstiges?.title || ""}
                        onChange={(e) => updateSonstigesTitle(e.target.value)}
                        placeholder="Risiko-Titel"
                        className="font-semibold text-center bg-transparent border-none shadow-none h-6 px-1"
                      />
                    ) : (
                      <span className="font-semibold">{risk.label}</span>
                    )}
                    <div className="text-xs text-gray-600 mt-1">
                      <span className="inline-block w-12">ja/nein</span>
                      <span className="inline-block w-16">weitere Einsch.</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tfLabels.map((label, index) => {
                const tfKey = `tf${index + 1}` as "tf1" | "tf2" | "tf3" | "tf4" | "tf5";
                return (
                  <tr key={tfKey} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="border border-gray-300 p-2 font-medium text-sm">{label}</td>
                    {risks.map((risk) => {
                      const riskData = formData.riskMatrix[risk.key as keyof RiskMatrixData];
                      return (
                        <React.Fragment key={`${risk.key}-${tfKey}`}>
                          <td className="border border-gray-300 p-2 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Checkbox
                                checked={riskData?.[tfKey]?.ja || false}
                                onCheckedChange={(checked) =>
                                  updateRiskMatrix(risk.key as keyof RiskMatrixData, tfKey, "ja", checked as boolean)
                                }
                              />
                              <span className="text-xs">ja</span>
                            </div>
                          </td>
                          <td key={`${risk.key}-${tfKey}-weitere`} className="border border-gray-300 p-2 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Checkbox
                                checked={riskData?.[tfKey]?.weitere || false}
                                onCheckedChange={(checked) =>
                                  updateRiskMatrix(risk.key as keyof RiskMatrixData, tfKey, "weitere", checked as boolean)
                                }
                              />
                              <span className="text-xs">ja</span>
                            </div>
                          </td>
                        </React.Fragment>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 justify-end">
        <Button onClick={handleSave} disabled={isSaving || !formData.patientName} className="bg-blue-600 hover:bg-blue-700">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          <span className="ml-2">Speichern</span>
        </Button>
        {onCheckSis && (
          <Button onClick={onCheckSis} disabled={isChecking || !formData.patientName} className="bg-orange-600 hover:bg-orange-700">
            {isChecking ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}
            <span className="ml-2">SIS prüfen</span>
          </Button>
        )}
        <Button onClick={onGeneratePlan} disabled={isGenerating || !formData.patientName} className="bg-green-600 hover:bg-green-700">
          {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          <span className="ml-2">Maßnahmenplan generieren</span>
        </Button>
      </div>
    </div>
  );
}
