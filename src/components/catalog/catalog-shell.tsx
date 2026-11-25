import type { ReactNode } from "react";
import type { NavigationNode } from "@/lib/storefront";
import { getPublicContent } from "@/lib/content/data";
import { ContentFooter } from "@/components/content/footer";
import { CatalogChrome } from "./catalog-chrome";
export async function CatalogShell({
  navigation,
  children,
}: {
  navigation: NavigationNode[];
  children: ReactNode;
}) {
  const content = await getPublicContent();
  return (
    <CatalogChrome
      navigation={navigation}
      footer={<ContentFooter content={content} />}
    >
      {children}
    </CatalogChrome>
  );
}
