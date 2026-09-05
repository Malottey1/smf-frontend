/**
 * pagedjs ships no type declarations and no @types/pagedjs package exists.
 * This covers only the surface ExportPreview.tsx actually uses.
 */
declare module "pagedjs" {
  export interface PagedFlow {
    total: number;
    pages: unknown[];
    performance: number;
    size: unknown;
  }

  export class Previewer {
    preview(
      content?: string,
      stylesheets?: Array<string | Record<string, string>>,
      renderTo?: Element,
    ): Promise<PagedFlow>;
  }
}
