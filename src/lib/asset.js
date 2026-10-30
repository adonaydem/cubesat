// Next.js does not prefix raw <video src> or fetch() URLs with the base path,
// so every file under public/ goes through this helper.
export function withBasePath(path) {
  const basePath =
    process.env.NODE_ENV === "production"
      ? process.env.NEXT_PUBLIC_BASE_PATH || ""
      : "";

  return `${basePath}${path}`;
}
