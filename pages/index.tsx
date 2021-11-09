import React from "react";
import Head from "next/head";

import { LogicGates } from "components/LogicGates";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-stretch">
      <Head>
        <title>Logic Gates</title>
        <meta
          name="description"
          content="Create and simulate Logic Gates in the web"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="flex flex-col items-stretch flex-1">
        <h1 className="p-6 text-xl font-bold">Logic Gates</h1>

        <LogicGates />
      </main>
    </div>
  );
}
