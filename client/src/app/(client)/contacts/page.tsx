"use client";

import { useMemo } from "react";
import { Topbar } from "@/widgets/topbar";
import { PageBody } from "@/shared/ui/PageBody";
import { ContactsFilters, useContactsFiltersStore } from "@/features/contacts-filters";
import { ContactsTable } from "@/widgets/contacts-table";
import { useContacts, filterContacts } from "@/entities/contacts";

export default function ContactsPage() {
  const { contacts, loading, error } = useContacts();
  const range = useContactsFiltersStore((s) => s.range);
  const status = useContactsFiltersStore((s) => s.status);

  const filtered = useMemo(
    () => filterContacts(contacts, { range, status }),
    [contacts, range, status],
  );

  return (
    <>
      <Topbar title="Контакты" />
      <PageBody>
        <ContactsFilters />
        {loading && <p>Загрузка контактов…</p>}
        {error && <p role="alert">{error}</p>}
        <ContactsTable contacts={filtered} />
      </PageBody>
    </>
  );
}
