"use client";

import Home from "@/components/Home";
import AuthGuard from "@/app/(presentation-generator)/components/AuthGuard";

const page = () => {
  return (
    <AuthGuard>
      <Home />
    </AuthGuard>
  );
};

export default page;
