import React from "react";
import Head from "next/head";
import Script from "next/script";
import type { AppProps } from "next/app";

import "styles/globals.scss";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Logic Gates</title>
        <meta
          name="description"
          content="Create and simulate Logic Gates in the web"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      {process.env.NODE_ENV === "production" && (
        <Script
          data-website-id="4df3a72a-387e-4526-ab91-2a83c23aceeb"
          src="https://sip-umami.vercel.app/sip.js"
        />
      )}
      <Component {...pageProps} />
    </>
  );
}
