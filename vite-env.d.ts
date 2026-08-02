interface ViteTypeOptions {
  strictImportMetaEnv: true;
}

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string;
  readonly DEV: boolean;
  readonly BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*.scss";
declare module "*.module.scss" {
  const classes: { [key: string]: string };
  export default classes;
}
