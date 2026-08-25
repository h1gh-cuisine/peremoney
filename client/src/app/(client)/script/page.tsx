"use client";

import { Topbar } from "@/widgets/topbar";
import { PageBody } from "@/shared/ui/PageBody";
import { ScriptViewer } from "@/widgets/script-viewer";
import { useScript } from "@/entities/script";

export default function ScriptPage() {
  const { data: script, error } = useScript();

  return (
    <>
      <Topbar title="Скрипт" />
      <PageBody>
        {error && <p role="alert">{error}</p>}
        {!script && !error && <p>Загрузка скрипта…</p>}
        {script && <ScriptViewer data={script} />}
      </PageBody>
    </>
  );
}
