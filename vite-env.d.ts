interface ViteTypeOptions {
  strictImportMetaEnv: true;
}

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string;
  readonly DEV: boolean;
  readonly BASE_URL: string;
  readonly DISCORD_CLIENT_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*.css";
declare module "*.scss";
declare module "*.module.scss" {
  const classes: { [key: string]: string };
  export default classes;
}
