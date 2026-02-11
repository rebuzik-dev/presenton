import React from "react";

import { LayoutProvider } from "../(presentation-generator)/context/LayoutContext";

const SchemaLayout = ({ children }: { children: React.ReactNode }) => {
  return <LayoutProvider>{children}</LayoutProvider>;
};

export default SchemaLayout;
