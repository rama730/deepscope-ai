"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import Button from "@/components/ui-custom/Button";

export default function AccessibilitySettings() {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [highContrast, setHighContrast] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight mb-4">Accessibility</h2>
        <p className="text-slate-500 dark:text-zinc-400">
          Customize your experience to meet your needs.
        </p>
      </div>
      <Separator />
      
      <Card>
        <CardHeader>
          <CardTitle>Display & Motion</CardTitle>
          <CardDescription>Adjust display settings for better visibility and reduced motion.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors">
            <div>
              <div className="font-medium">Reduced Motion</div>
              <div className="text-sm text-slate-500">Minimize animations and transitions throughout the application</div>
            </div>
            <input
              type="checkbox"
              checked={reducedMotion}
              onChange={(e) => setReducedMotion(e.target.checked)}
              className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors">
            <div>
              <div className="font-medium">High Contrast</div>
              <div className="text-sm text-slate-500">Increase contrast for better readability</div>
            </div>
            <input
              type="checkbox"
              checked={highContrast}
              onChange={(e) => setHighContrast(e.target.checked)}
              className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
            />
          </div>
          
          <div className="flex justify-end pt-2">
            <Button onClick={() => alert("Settings saved locally for this session.")}>
              Save Accessibility Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
