"use client";

import React from "react";

export function ProfileShell({
  header,
  tabs,
  main,
  rail,
}: {
  header: React.ReactNode;
  tabs: React.ReactNode;
  main: React.ReactNode;
  rail: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-0 pb-24 lg:pb-6">
        <div className="space-y-6">
          {header}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-6">
              {tabs}
              {main}
            </div>
            <div className="lg:col-span-4">
              <div className="lg:sticky lg:top-24 space-y-6">{rail}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


