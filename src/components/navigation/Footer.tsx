import React from "react";
import { useUser } from "@clerk/react";
import type { ActiveTab } from "../../app/App";
import { PublicFooter } from "./PublicFooter";
import { AuthenticatedFooter } from "./AuthenticatedFooter";

interface FooterProps {
  onSelectTab: (tab: ActiveTab) => void;
}

export const Footer: React.FC<FooterProps> = ({ onSelectTab }) => {
  const { isSignedIn } = useUser();

  if (isSignedIn) {
    return <AuthenticatedFooter onSelectTab={onSelectTab} />;
  }

  return <PublicFooter onSelectTab={onSelectTab} />;
};
