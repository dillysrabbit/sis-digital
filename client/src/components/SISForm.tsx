import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Save, Sparkles, Loader2, ClipboardCheck } from "lucide-react";

export interface RiskMatrixData {
  dekubitus?: { tf1?: { ja: boolean; weitere: boolean }; tf2?: { ja: boolean; weitere: boolean }; tf3?: { ja: boolean; weitere: boolean }; tf4?: { ja: boolean; weitere: boolean }; tf5?: { ja: boolean; weitere: boolean } };
  sturz?: { tf1?: { ja: boolean; weitere: boolean }; tf2?: { ja: boolean; weitere: boolean }; tf3?: { ja: boolean; weitere: boolean }; tf4?: { ja: boolean; weitere: boolean }; tf5?: { ja: boolean; weitere: boolean } };
  inkontinenz?: { tf1?: { ja: boolean; weitere: boolean }; tf2?: { ja: boolean; weitere: boolean }; tf3?: { ja: boolean; weitere: boolean }; tf4?: { ja: boolean; weitere: boolean }; tf5?: { ja: boolean; weitere: boolean } };
  schmerz?: { tf1?: { ja: boolean; weitere: boolean }; tf2?: { ja: boolean; weitere: boolean }; tf3?: { ja: boolean; weitere: boolean }; tf4?: { ja: boolean; weitere: boolean }; tf5?: { ja: boolean; weitere: boolean } };
  ernaehrung?: { tf1?: { ja: boolean; weitere: boolean }; tf2?: { ja: boolean; weitere: boolean }; tf3?: { ja: boolean; weitere: boolean }; tf4?: { ja: boolean; weitere: boolean }; tf5?: { ja: boolean; weitere: boolean } };
  sonstiges?: { tf1?: { ja: boolean; weitere: boolean }; tf2?: { ja: boolean; weitere: boolean }; tf3?: { ja: boolean; weitere: boolean }; tf4?: { ja: boolean; weitere: boolean }; tf5?: { ja: boolean; weitere: boolean } };
}

export interface SISFormData {
  patientName: string;
  birthDate: string;
  conversationDate: string;
  nurseSignature: string;
  relativeOrCaregiver: string;
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
  sonstiges: { tf1: { ja: false, weitere: false }, tf2: { ja: false, weitere: false }, tf3: { ja: false, weitere: false }, tf4: { ja: false, weitere: false }, tf5: { ja: false, weitere: false } },
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

  const updateField = (field: keyof SISFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateRiskMatrix = (
    risk: keyof RiskMatrixData,
    tf: "tf1" | "tf2" | "tf3" | "tf4" | "tf5",
    field: "ja" | "weitere",
    value: boolean
  ) => {
    setFormData((prev) => ({
      ...prev,
      riskMatrix: {
        ...prev.riskMatrix,
        [risk]: {
          ...prev.riskMatrix[risk],
          [tf]: {
            ...prev.riskMatrix[risk]?.[tf],
            [field]: value,
          },
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
    { key: "sonstiges", label: "Sonstiges", bgColor: "bg-gray-100" },
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
      {/* Header */}
      <Card>
        <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
          <CardTitle className="text-xl font-bold">
            SIS® – stationär – Strukturierte Informationssammlung
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="patientName">Name der pflegebedürftigen Person *</Label>
              <Input
                id="patientName"
                value={formData.patientName}
                onChange={(e) => updateField("patientName", e.target.value)}
                placeholder="Vor- und Nachname"
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

      {/* Feld A - O-Ton */}
      <Card className="border-l-4 border-l-[var(--sis-oton)]">
        <CardHeader className="sis-oton text-white rounded-t-lg py-3">
          <CardTitle className="text-base font-semibold">
            Was bewegt Sie im Augenblick? Was brauchen Sie? Was können wir für Sie tun?
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <Textarea
            value={formData.oTon}
            onChange={(e) => updateField("oTon", e.target.value)}
            placeholder="Erfassen Sie hier die Perspektive und Wünsche der pflegebedürftigen Person in deren eigenen Worten..."
            className="min-h-[150px]"
          />
        </CardContent>
      </Card>

      {/* Themenfelder */}
      {themenfelder.map((tf) => (
        <Card key={tf.key} className={`border-l-4`} style={{ borderLeftColor: `var(--${tf.color.replace("sis-", "sis-")})` }}>
          <CardHeader className={`${tf.color} ${tf.textColor} rounded-t-lg py-3`}>
            <CardTitle className="text-base font-semibold">{tf.label}</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <Textarea
              value={formData[tf.key as keyof SISFormData] as string}
              onChange={(e) => updateField(tf.key as keyof SISFormData, e.target.value)}
              placeholder={`Pflegefachliche Einschätzung zu ${tf.label}...`}
              className="min-h-[120px]"
            />
          </CardContent>
        </Card>
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
                    <span className="font-semibold">{risk.label}</span>
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
                    {risks.map((risk) => (
                      <>
                        <td key={`${risk.key}-${tfKey}-ja`} className="border border-gray-300 p-2 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Checkbox
                              checked={formData.riskMatrix[risk.key as keyof RiskMatrixData]?.[tfKey]?.ja || false}
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
                              checked={formData.riskMatrix[risk.key as keyof RiskMatrixData]?.[tfKey]?.weitere || false}
                              onCheckedChange={(checked) =>
                                updateRiskMatrix(risk.key as keyof RiskMatrixData, tfKey, "weitere", checked as boolean)
                              }
                            />
                            <span className="text-xs">ja</span>
                          </div>
                        </td>
                      </>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4 justify-end sticky bottom-4 bg-white/90 backdrop-blur-sm p-4 rounded-lg shadow-lg border">
        <Button onClick={handleSave} disabled={isSaving || !formData.patientName} className="gap-2">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Speichern
        </Button>
        {onCheckSis && (
          <Button onClick={onCheckSis} disabled={isChecking || !formData.patientName} variant="outline" className="gap-2 border-orange-500 text-orange-600 hover:bg-orange-50">
            {isChecking ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}
            SIS prüfen
          </Button>
        )}
        <Button onClick={onGeneratePlan} disabled={isGenerating || !formData.patientName} variant="default" className="gap-2 bg-green-600 hover:bg-green-700">
          {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Maßnahmenplan generieren
        </Button>
      </div>
    </div>
  );
}
