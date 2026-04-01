import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/_core/hooks/useAuth";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

function CaritasLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} xmlns="http://www.w3.org/2000/svg">
      {/* Red square background */}
      <rect x="0" y="0" width="100" height="100" rx="4" fill="#E2001A" />
      {/* White cross */}
      <rect x="30" y="8" width="40" height="84" fill="white" />
      <rect x="8" y="30" width="84" height="40" fill="white" />
      {/* Top-left flame */}
      <path d="M28 28C28 28 20 20 14 22C14 22 18 14 28 10C28 10 22 18 28 28Z" fill="#E2001A" />
      <path d="M28 10C28 10 24 18 26 24C26 24 20 16 18 12C18 12 22 8 28 10Z" fill="#E2001A" />
      <path d="M10 28C10 28 18 24 24 26C24 26 16 20 12 18C12 18 8 22 10 28Z" fill="#E2001A" />
      {/* Top-right flame */}
      <path d="M72 28C72 28 80 20 86 22C86 22 82 14 72 10C72 10 78 18 72 28Z" fill="#E2001A" />
      <path d="M72 10C72 10 76 18 74 24C74 24 80 16 82 12C82 12 78 8 72 10Z" fill="#E2001A" />
      <path d="M90 28C90 28 82 24 76 26C76 26 84 20 88 18C88 18 92 22 90 28Z" fill="#E2001A" />
      {/* Bottom-left flame */}
      <path d="M28 72C28 72 20 80 14 78C14 78 18 86 28 90C28 90 22 82 28 72Z" fill="#E2001A" />
      <path d="M28 90C28 90 24 82 26 76C26 76 20 84 18 88C18 88 22 92 28 90Z" fill="#E2001A" />
      <path d="M10 72C10 72 18 76 24 74C24 74 16 80 12 82C12 82 8 78 10 72Z" fill="#E2001A" />
      {/* Bottom-right flame */}
      <path d="M72 72C72 72 80 80 86 78C86 78 82 86 72 90C72 90 78 82 72 72Z" fill="#E2001A" />
      <path d="M72 90C72 90 76 82 74 76C74 76 80 84 82 88C82 88 78 92 72 90Z" fill="#E2001A" />
      <path d="M90 72C90 72 82 76 76 74C76 74 84 80 88 82C88 82 92 78 90 72Z" fill="#E2001A" />
      {/* "caritas" text at bottom */}
      <text x="50" y="115" textAnchor="middle" fill="#E2001A" fontSize="14" fontWeight="bold" fontFamily="serif" fontStyle="italic">
        caritas
      </text>
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
    </svg>
  );
}

export default function Login() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [providers, setProviders] = useState<{ google: boolean; github: boolean } | null>(null);

  const searchParams = new URLSearchParams(window.location.search);
  const error = searchParams.get("error");

  useEffect(() => {
    if (isAuthenticated) setLocation("/");
  }, [isAuthenticated, setLocation]);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((data) => setProviders({ google: !!data.google, github: !!data.github }))
      .catch(() => setProviders({ google: false, github: false }));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-orange-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-orange-50 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <CaritasLogo className="h-20 w-20" />
          </div>
          <div>
            <CardTitle className="text-2xl">Caritas SIS Digital</CardTitle>
            <CardDescription className="mt-2">
              Melden Sie sich an, um fortzufahren
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              Anmeldung fehlgeschlagen. Bitte versuchen Sie es erneut.
            </div>
          )}

          {providers?.google && (
            <Button
              variant="outline"
              className="w-full h-12 gap-3 text-base"
              onClick={() => { window.location.href = "/api/auth/google"; }}
            >
              <GoogleIcon />
              Mit Google anmelden
            </Button>
          )}

          {providers?.github && (
            <Button
              variant="outline"
              className="w-full h-12 gap-3 text-base"
              onClick={() => { window.location.href = "/api/auth/github"; }}
            >
              <GitHubIcon />
              Mit GitHub anmelden
            </Button>
          )}

          {providers && !providers.google && !providers.github && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
              <p className="font-medium mb-1">Keine Anmelde-Provider konfiguriert</p>
              <p>Bitte setzen Sie GOOGLE_CLIENT_ID/SECRET oder GITHUB_CLIENT_ID/SECRET in den Umgebungsvariablen.</p>
            </div>
          )}

          {!providers && (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
