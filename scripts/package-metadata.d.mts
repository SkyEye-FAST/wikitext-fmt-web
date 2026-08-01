export interface PackageVersions {
  webVersion: string;
  formatterVersion: string;
}

export function getPackageVersions(packageUrl?: URL): PackageVersions;
