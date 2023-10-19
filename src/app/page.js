"use client";
import dynamic from "next/dynamic";

const DynamicComponentWithNoSSR = dynamic(() => import("./home"), {
  ssr: false,
});

export default () => <DynamicComponentWithNoSSR />;
