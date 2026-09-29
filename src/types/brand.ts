export interface LogoItem {
  id: string;
  name: string;
  url?: string;
  isCustom?: boolean;
  type: 'donor' | 'ach' | 'partner';
  variant?: 'color' | 'white' | 'dark' | 'monochrome';
}

export type CoverStyle = 'monitoring' | 'identity-box' | 'editorial-split' | 'presentation';

export type CoverBgColor = 'blue' | 'green' | 'orange' | 'darkBlue' | 'white' | 'charcoal' | 'custom';
export type CreditsBgColor = 'gradient-blue' | 'gradient-green' | 'gradient-orange' | 'dark-slate' | 'pure-white' | 'custom';

export interface CoverData {
  style: CoverStyle;
  categoryPill: string;
  title: string;
  subtitle: string;
  projectCode: string;
  internalCode: string;
  location: string;
  date: string;
  authorName: string;
  authorRole: string;
  authorBase: string;
  photoUrl: string;
  logos: LogoItem[];
  themeColor: CoverBgColor;
  headerBgCustom?: string;
  bannerBgCustom?: string;
  logoColorMode: 'auto' | 'white' | 'color' | 'monochrome';
  // Switches de visibilidad de elementos (configurables con botón switch)
  showCategoryPill?: boolean;
  showSubtitle?: boolean;
  showProjectCode?: boolean;
  showInternalCode?: boolean;
  showLocation?: boolean;
  showDate?: boolean;
  showAuthorBlock?: boolean;
  showLogos?: boolean;
  showPhoto?: boolean;
}

export interface TeamContributor {
  id: string;
  name: string;
  role?: string;
  department?: string;
}

export interface CreditsData {
  topBanner: string;
  subBanner: string;
  mainTitle: string;
  missionSubtitle: string;
  donorAttribution: string;
  disclaimer: string;
  countrySelection: 'guatemala_only' | 'honduras_only' | 'guatemala_honduras';
  officeGuatemalaTitle: string;
  officeGuatemalaAddress: string;
  officeHondurasTitle: string;
  officeHondurasAddress: string;
  pqrTitle: string;
  pqrEmail: string;
  commsEmail: string;
  webUrl: string;
  contributorsTitle?: string;
  showPersonCredits?: boolean;
  personCreditsColumns?: 1 | 2;
  contributors: TeamContributor[];
  logos: LogoItem[];
  bgTheme: CreditsBgColor;
  bgCustom?: string;
  logoColorMode: 'auto' | 'white' | 'color' | 'monochrome';
  // Switches de visibilidad opcionales para contraportada
  showTopBanner?: boolean;
  showLogo?: boolean;
  showDonorDisclaimer?: boolean;
  showOffices?: boolean;
  showPqr?: boolean;
  showWebUrl?: boolean;
}
