import React from "react";

import { LogicGates } from "components/LogicGates";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-stretch">
      <main className="flex flex-col items-stretch flex-1">
        <h1 className="p-6 text-xl font-bold">Logic Gates</h1>

        <LogicGates />
      </main>
    </div>
  );
}
