import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Shield, Loader2, CheckCircle } from "lucide-react";
import { useState } from "react";

export default function PromoteAdmin() {
  const { user, loading: authLoading } = useAuth();
  const [done, setDone] = useState(false);

  const promote = trpc.admin.promoteToAdmin.useMutation({
    onSuccess: () => setDone(true),
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Nicht angemeldet</CardTitle>
            <CardDescription>Bitte zuerst einloggen.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <CardTitle>Fertig!</CardTitle>
            <CardDescription>
              Sie sind jetzt Administrator. Klicken Sie auf den Button um zum Admin-Bereich zu gelangen.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <a href="/admin">
              <Button className="w-full">
                <Shield className="mr-2 h-4 w-4" />
                Zum Admin-Bereich
              </Button>
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Shield className="h-12 w-12 text-blue-500 mx-auto mb-4" />
          <CardTitle>Admin-Rechte aktivieren</CardTitle>
          <CardDescription>
            Eingeloggt als <strong>{user.name}</strong>. Klicken Sie auf den Button um sich zum Administrator zu machen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            className="w-full"
            onClick={() => promote.mutate()}
            disabled={promote.isPending}
          >
            {promote.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Shield className="mr-2 h-4 w-4" />
            )}
            Zum Admin machen
          </Button>
          {promote.isError && (
            <p className="text-red-500 text-sm mt-2 text-center">
              Fehler: {promote.error.message}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
