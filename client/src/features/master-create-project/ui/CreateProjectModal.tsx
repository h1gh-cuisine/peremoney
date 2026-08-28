"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PROJECT_TYPE_OPTIONS, type ProjectType } from "@/shared/lib/projectType";
import { useMasterManagersStore } from "@/entities/master-managers";
import { fetchProviderRegions, useMasterProjectsStore, type MasterProject, type ProviderRegion } from "@/entities/master-projects";
import { type LoginResponse, sessionFromLogin, useSessionStore } from "@/entities/session";
import { ApiError, createApiClient } from "@/shared/api";
import { generateProjectLogins } from "@/shared/lib/credentials";
import styles from "./CreateProjectModal.module.scss";

interface CreateProjectModalProps {
  onClose: () => void;
}

export function CreateProjectModal({ onClose }: CreateProjectModalProps) {
  const router = useRouter();
  const managers = useMasterManagersStore((s) => s.managers);
  const createProject = useMasterProjectsStore((s) => s.createProject);
  const setSession = useSessionStore((s) => s.setSession);

  const [clientName, setClientName] = useState("");
  const [type, setType] = useState<ProjectType>("quals");
  const [regions, setRegions] = useState<ProviderRegion[]>([]);
  const [regionsError, setRegionsError] = useState("");
  const [regionsLoading, setRegionsLoading] = useState(true);
  const [regionIds, setRegionIds] = useState<number[]>([]);
  const [regionPickerOpen, setRegionPickerOpen] = useState(false);
  const [regionSearch, setRegionSearch] = useState("");
  const [regionDraft, setRegionDraft] = useState<number[]>([]);
  const allRussiaSelected = regions.length > 0 && regionIds.length === regions.length;
  const region = allRussiaSelected
    ? "Вся Россия"
    : regions.filter((item) => regionIds.includes(item.id)).map((item) => item.name).join(", ");
  const [sphere, setSphere] = useState("");
  const [managerId, setManagerId] = useState(managers[0]?.id ?? "");
  const [price, setPrice] = useState(1500);
  const [created, setCreated] = useState<MasterProject | null>(null);
  const [creationError, setCreationError] = useState<string | null>(null);
  const [projectLoginError, setProjectLoginError] = useState<string | null>(null);
  const [openingProject, setOpeningProject] = useState(false);
  const idempotencyKeyRef = useRef(crypto.randomUUID());
  const submissionLockRef = useRef(false);
  // 2.8.3: ручка создания не идемпотентна — защита от повторной отправки
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = clientName.trim() && sphere.trim() && managerId && regionIds.length > 0 && price > 0;

  useEffect(() => {
    let active = true;
    setRegionsLoading(true);
    fetchProviderRegions().then((values) => {
      if (!active) return;
      setRegions(values);
      setRegionIds((current) => current.length ? current : values[0] ? [values[0].id] : []);
      setRegionsError(values.length ? "" : "Leads Factory не вернул доступные регионы");
    }).catch((error: unknown) => {
      if (active) setRegionsError(error instanceof Error ? error.message : "Не удалось загрузить регионы");
    }).finally(() => { if (active) setRegionsLoading(false); });
    return () => { active = false; };
  }, []);

  function resetFailedAttempt() {
    if (!creationError) return;
    idempotencyKeyRef.current = crypto.randomUUID();
    setCreationError(null);
  }

  async function handleSubmit() {
    if (!canSubmit || submissionLockRef.current) return;
    submissionLockRef.current = true;
    setSubmitting(true);
    setCreationError(null);
    try {
      const managerName = managers.find((manager) => manager.id === managerId)?.name ?? managerId;
      const logins = generateProjectLogins(clientName.trim(), idempotencyKeyRef.current);
      const project = await createProject({
        clientName: clientName.trim(), type, region, regionId: regionIds[0], regionIds, sphere: sphere.trim(), managerId, managerName, price,
        employeeLogin: logins.employeeLogin, clientLogin: logins.clientLogin,
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

  async function openCreatedProject() {
    if (!created || openingProject) return;
    setOpeningProject(true);
    setProjectLoginError(null);
    try {
      const api = createApiClient({
        baseUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4010/api",
        getToken: () => null,
      });
      const response = await api.post<LoginResponse>("/auth/login", {
        login: created.employeeLogin,
        password: created.employeePassword,
      });
      if (response.user.role === "MASTER" || response.user.cabinetId !== created.id) {
        throw new Error("Сервер вернул сессию другого проекта");
      }
      setSession(sessionFromLogin(response));
      router.push("/dashboard");
    } catch (error) {
      setProjectLoginError(error instanceof ApiError || error instanceof Error ? error.message : "Не удалось открыть проект");
      setOpeningProject(false);
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

            <div className={styles.field}>
              <span className={styles.fieldLabel}>Регион</span>
              <button
                type="button"
                className={styles.regionTrigger}
                disabled={regionsLoading || !regions.length}
                onClick={() => {
                  setRegionDraft(regionIds);
                  setRegionSearch("");
                  setRegionPickerOpen(true);
                }}
              >
                <span>{regionsLoading ? "Загружаем регионы…" : region || "Выберите регионы"}</span>
                <span className={styles.regionTriggerIcon} aria-hidden="true">⌄</span>
              </button>
              {!regionsLoading && regions.length > 0 && (
                <button
                  type="button"
                  className={`${styles.allRussiaBtn} ${allRussiaSelected ? styles.allRussiaBtnActive : ""}`}
                  onClick={() => { resetFailedAttempt(); setRegionIds(regions.map((item) => item.id)); }}
                >
                  Вся Россия
                </button>
              )}
              {regionsError && <span className={styles.fieldError} role="alert">{regionsError}</span>}
            </div>

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
            {regionPickerOpen && (
              <div className={styles.regionOverlay} role="presentation" onMouseDown={() => setRegionPickerOpen(false)}>
                <section
                  className={styles.regionDialog}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="region-picker-title"
                  onMouseDown={(event) => event.stopPropagation()}
                >
                  <div className={styles.regionDialogHeader}>
                    <div>
                      <h3 id="region-picker-title">Выберите регионы</h3>
                      <p>Можно выбрать один, несколько или всю Россию.</p>
                    </div>
                    <button type="button" className={styles.closeBtn} aria-label="Закрыть" onClick={() => setRegionPickerOpen(false)}>×</button>
                  </div>
                  <input
                    autoFocus
                    type="search"
                    className={styles.regionSearch}
                    placeholder="Начните вводить название региона"
                    value={regionSearch}
                    onChange={(event) => setRegionSearch(event.target.value)}
                  />
                  <button
                    type="button"
                    className={`${styles.allRussiaOption} ${regionDraft.length === regions.length ? styles.regionOptionSelected : ""}`}
                    onClick={() => setRegionDraft(regions.map((item) => item.id))}
                  >
                    <span className={styles.checkMark}>{regionDraft.length === regions.length ? "✓" : ""}</span>
                    <span><strong>Вся Россия</strong><small>{regions.length} регионов</small></span>
                  </button>
                  <div className={styles.regionList}>
                    {regions
                      .filter((item) => item.name.toLocaleLowerCase("ru").includes(regionSearch.trim().toLocaleLowerCase("ru")))
                      .map((item) => {
                        const checked = regionDraft.includes(item.id);
                        return (
                          <label key={item.id} className={`${styles.regionOption} ${checked ? styles.regionOptionSelected : ""}`}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => setRegionDraft((current) => checked
                                ? current.filter((id) => id !== item.id)
                                : [...current, item.id])}
                            />
                            <span className={styles.checkMark}>{checked ? "✓" : ""}</span>
                            <span>{item.name}</span>
                          </label>
                        );
                      })}
                    {regions.every((item) => !item.name.toLocaleLowerCase("ru").includes(regionSearch.trim().toLocaleLowerCase("ru"))) && (
                      <p className={styles.regionEmpty}>Регион не найден</p>
                    )}
                  </div>
                  <div className={styles.regionActions}>
                    <span>Выбрано: {regionDraft.length}</span>
                    <button type="button" className={styles.cancelBtn} onClick={() => setRegionPickerOpen(false)}>Отмена</button>
                    <button
                      type="button"
                      className={styles.submitBtn}
                      disabled={!regionDraft.length}
                      onClick={() => {
                        resetFailedAttempt();
                        setRegionIds(regionDraft);
                        setRegionPickerOpen(false);
                      }}
                    >
                      Применить
                    </button>
                  </div>
                </section>
              </div>
            )}
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
              <button type="button" className={styles.submitBtn} disabled={openingProject} onClick={() => void openCreatedProject()}>
                {openingProject ? "Открываем…" : "Перейти в проект"}
              </button>
            </div>
            {projectLoginError && <p role="alert" className={styles.error}>{projectLoginError}</p>}
          </>
        )}
      </div>
    </div>
  );
}
