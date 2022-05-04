export type BasicInducementModel = {
  name: string;
  id: string;
  price: number | null;
  specialPrices: Array<[string, number]>;
};

export type BiasedRefModel = {
  name: string;
  id: string;
  price: number;
};

export type InfamousCoachingStaffModel = {
  name: string;
  id: string;
  price: number;
};

export type StarPlayerModel = {
  name: string;
  id: string;
};

export type WizardModel = {
  name: string;
  price: string;
};

export type InducementsModel = {
  basic: BasicInducementModel[];
  biasedRefs: BiasedRefModel[];
  infamousCoachingStaff: unknown[];
  starPlayers: unknown[];
  wizards: unknown[];
};
