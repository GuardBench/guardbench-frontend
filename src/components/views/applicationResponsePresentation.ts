export type ApplicationResponsePresentation = {
  available: boolean;
  displayText: string | null;
};

export const presentApplicationResponse = (
  applicationResponse: string | null,
): ApplicationResponsePresentation => {
  if (applicationResponse === null) {
    return {
      available: false,
      displayText: null,
    };
  }

  return {
    available: true,
    displayText: applicationResponse.length === 0 ? '(빈 응답)' : applicationResponse,
  };
};
