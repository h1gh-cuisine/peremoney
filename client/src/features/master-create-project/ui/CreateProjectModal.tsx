"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { PROJECT_TYPE_OPTIONS, type ProjectType } from "@/shared/lib/projectType";
import { useMasterManagersStore } from "@/entities/master-managers";
import { useMasterProjectsStore, type MasterProject } from "@/entities/master-projects";
import { generateCredentials } from "@/shared/lib/credentials";
import styles from "./CreateProjectModal.module.scss";

interface CreateProjectModalProps {
  onClose: () => void;
}

const REGION_OPTIONS = [
  { id: 1, name: "РФ" },
  { id: 77, name: "Москва" },
  { id: 78, name: "Санкт-Петербург" },
  { id: 66, name: "Свердловская область" },
  { id: 23, name: "Краснодарский край" },
];

export function CreateProjectModal({ onClose }: CreateProjectModalProps) {
  const managers = useMasterManagersStore((s) => s.managers);
  const createProject = useMasterProjectsStore((s) => s.createProject);

  const [clientName, setClientName] = useState("");
  const [type, setType] = useState<ProjectType>("quals");
  const [regionId, setRegionId] = useState(REGION_OPTIONS[0].id);
  const region = REGION_OPTIONS.find((item) => item.id === regionId)?.name ?? REGION_OPTIONS[0].name;
  const [sphere, setSphere] = useState("");
  const [managerId, setManagerId] = useState(managers[0]?.id ?? "");
  const [price, setPrice] = useState(1500);
  const [created, setCreated] = useState<MasterProject | null>(null);
  const [creationError, setCreationError] = useState<string | null>(null);
  const idempotencyKeyRef = useRef(crypto.randomUUID());
  const employeeCredentialsRef = useRef(generateCredentials("staff"));
  const clientCredentialsRef = useRef(generateCredentials("client"));
  const submissionLockRef = useRef(false);
  // 2.8.3: ручка создания не идемпотентна — защита от повторной отправки
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = clientName.trim() && sphere.trim() && managerId && price > 0;

  function resetFailedAttempt() {
    if (!creationError) return;
    idempotencyKeyRef.current = crypto.randomUUID();
    employeeCredentialsRef.current = generateCredentials("staff");
    clientCredentialsRef.current = generateCredentials("client");
    setCreationError(null);
  }

  async function handleSubmit() {
    if (!canSubmit || submissionLockRef.current) return;
    submissionLockRef.current = true;
    setSubmitting(true);
    setCreationError(null);
    try {
      const managerName = managers.find((manager) => manager.id === managerId)?.name ?? managerId;
      const project = await createProject({
        clientName: clientName.trim(), type, region, regionId, sphere: sphere.trim(), managerId, managerName, price,
        employeeLogin: employeeCredentialsRef.current.login, clientLogin: clientCredentialsRef.current.login,
        idempotencyKey: idempotencyKeyRef.current,
      });
      setCreated(project);
    } catch (error) {
      setCreationError(error instanceof Error ? error.message : "Не удалось создать проект");
    } finally {
      submissionLockRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.overlay} onMouseDown={onClose}>
      <div className={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
        {!created ? (
          <>
            <h2 className={styles.title}>Создать проект</h2>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>Название клиента</span>
              <input
                type="text"
                className={styles.input}
                placeholder="Имплантсити"
                value={clientName}
                onChange={(e) => { resetFailedAttempt(); setClientName(e.target.value); }}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>Тип</span>
              <select className={styles.select} value={type} onChange={(e) => { resetFailedAttempt(); setType(e.target.value as ProjectType); }}>
                {PROJECT_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>Регион</span>
              <select className={styles.select} value={regionId} onChange={(e) => { resetFailedAttempt(); setRegionId(Number(e.target.value)); }}>
                {REGION_OPTIONS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>Сфера</span>
              <input
                type="text"
                className={styles.input}
                placeholder="Коррекция зрения"
                value={sphere}
                onChange={(e) => { resetFailedAttempt(); setSphere(e.target.value); }}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>Менеджер</span>
              <select className={styles.select} value={managerId} onChange={(e) => { resetFailedAttempt(); setManagerId(e.target.value); }}>
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              <span className={styles.fieldLabel}>Цена</span>
              <input
                type="number"
                min={1}
                className={styles.input}
                value={price}
                onChange={(e) => { resetFailedAttempt(); setPrice(Math.max(1, Number(e.target.value) || 0)); }}
              />
            </label>

            <div className={styles.actions}>
              <button type="button" className={styles.cancelBtn} onClick={onClose}>
                Отмена
              </button>
              <button
                type="button"
                className={styles.submitBtn}
                disabled={!canSubmit || submitting}
                onClick={handleSubmit}
              >
                Создать
              </button>
            </div>
            {creationError && <p role="alert" className={styles.error}>{creationError}</p>}
          </>
        ) : (
          <>
            <h2 className={styles.title}>Проект создан</h2>
            <p className={styles.createdName}>{created.name}</p>

            <div className={styles.credsBlock}>
              <span className={styles.credsLabel}>Логин/пароль сотрудника (общий)</span>
              <div className={styles.credsRow}>
                <code>{created.employeeLogin}</code>
                <code>{created.employeePassword}</code>
              </div>
            </div>

            <div className={styles.credsBlock}>
              <span className={styles.credsLabel}>Логин/пароль клиента (уникальный)</span>
              <div className={styles.credsRow}>
                <code>{created.clientLogin}</code>
                <code>{created.clientPassword}</code>
              </div>
            </div>

            <div className={styles.actions}>
              <button type="button" className={styles.cancelBtn} onClick={onClose}>
                Готово
              </button>
              <Link href="/dashboard" className={styles.submitBtn}>
                Перейти
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
