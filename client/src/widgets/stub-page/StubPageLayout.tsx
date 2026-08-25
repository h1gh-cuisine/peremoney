import { Topbar } from "@/widgets/topbar";
import { PageBody } from "@/shared/ui/PageBody";
import { EmptyState } from "@/shared/ui/EmptyState";

interface StubPageLayoutProps {
  title: string;
  description: string;
}

export function StubPageLayout({ title, description }: StubPageLayoutProps) {
  return (
    <>
      <Topbar title={title} />
      <PageBody>
        <EmptyState description={description} />
      </PageBody>
    </>
  );
}
