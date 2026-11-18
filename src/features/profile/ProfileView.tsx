import React, { useMemo } from "react";
import { useAuth } from "@clerk/react";
import { PersonalProfilePage, type PersonalProfilePageProps } from "./PersonalProfilePage";
import { OnboardingApiClient } from "../../services/onboardingApiClient";
import type { HouseholdRecord } from "../../server/database/repositories/household.repository";

export interface UserFoodProfile {
  avoidAllergens: string[];
  avoidIngredients: string[];
  calmMode: boolean;
  dietaryPattern: string;
}

export interface ProfileViewProps {
  apiClient?: OnboardingApiClient;
  currentHousehold?: HouseholdRecord | null;
  onNavigateToDashboard?: () => void;
  onNavigateToHousehold?: () => void;
  onNavigateToPrivacy?: () => void;
  onProfileChange?: (profile: UserFoodProfile) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  apiClient: injectedApiClient,
  currentHousehold,
  onNavigateToDashboard = () => {},
  onNavigateToHousehold = () => {},
  onNavigateToPrivacy = () => {},
  onProfileChange: _onProfileChange
}) => {
  const { getToken } = useAuth();

  const defaultApiClient = useMemo(() => {
    return new OnboardingApiClient(async () => {
      try {
        return (await getToken()) ?? null;
      } catch {
        return null;
      }
    });
  }, [getToken]);

  const apiClient = injectedApiClient || defaultApiClient;

  return (
    <PersonalProfilePage
      apiClient={apiClient}
      currentHousehold={currentHousehold}
      onNavigateToDashboard={onNavigateToDashboard}
      onNavigateToHousehold={onNavigateToHousehold}
      onNavigateToPrivacy={onNavigateToPrivacy}
    />
  );
};

export { PersonalProfilePage };
export type { PersonalProfilePageProps };
