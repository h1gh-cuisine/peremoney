import { Topbar } from "@/widgets/topbar";
import { PageBody } from "@/shared/ui/PageBody";
import { SettingsForm } from "@/features/settings-form";

export default function SettingsPage() {
  return (
    <>
      <Topbar title="Настройки" />
      <PageBody>
        <SettingsForm />
      </PageBody>
    </>
  );
}
