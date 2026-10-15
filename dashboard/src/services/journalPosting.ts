import type { DashboardData } from "../data/mockData";
import { validateJournalEntry, type JournalEntry } from "./accounting";

export type PostingLineDraft = { account: string; debit: number; credit: number };
export type JournalDraft = { dateKey: string; memo: string; reference?: string; sourceType: string; sourceId?: string; lines: PostingLineDraft[] };

export function prepareJournal(data: DashboardData, draft: JournalDraft): { entry?: JournalEntry; error?: string } {
  const accounts = data.accounts ?? [];
  const lines = draft.lines.map((line) => {
    const account = accounts.find(({ name, code }) => name === line.account || code === line.account);
    return account ? { accountId: account.id, debit: line.debit, credit: line.credit } : null;
  });
  if (lines.some((line) => line === null)) return { error: "Choose an account from the chart of accounts for every journal line." };
  const existingEntries = data.journalEntries ?? [];
  const legacyReferences = data.ledgerAccounts.map(({ reference }) => reference).filter((reference): reference is string => Boolean(reference));
  const nextNumber = Math.max(0, ...[...existingEntries.map(({ reference }) => reference), ...legacyReferences]
    .map((reference) => Number(reference.match(/^JE-\d{4}-(\d+)$/)?.[1] ?? 0))) + 1;
  const reference = draft.reference?.trim() || `JE-${draft.dateKey.slice(0, 4)}-${String(nextNumber).padStart(4, "0")}`;
  const entry: JournalEntry = {
    id: globalThis.crypto?.randomUUID?.() ?? `journal-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    reference,
    dateKey: draft.dateKey,
    memo: draft.memo.trim(),
    sourceType: draft.sourceType,
    sourceId: draft.sourceId,
    lines: lines.filter((line): line is NonNullable<typeof line> => line !== null),
  };
  const error = validateJournalEntry(entry, accounts, existingEntries);
  return error ? { error } : { entry };
}

export function appendJournal(data: DashboardData, entry: JournalEntry): { data?: DashboardData; error?: string } {
  const error = validateJournalEntry(entry, data.accounts ?? [], data.journalEntries ?? []);
  if (error) return { error };
  const accounts = data.accounts ?? [];
  const rows = entry.lines.map((line, index) => {
    const account = accounts.find(({ id }) => id === line.accountId)!;
    return {
      account: account.name,
      code: account.code,
      type: account.type,
      debit: line.debit,
      credit: line.credit,
      dateKey: entry.dateKey,
      id: `${entry.id}-${index + 1}`,
      memo: entry.memo,
      reference: entry.reference,
    };
  });
  return { data: { ...data, journalEntries: [entry, ...(data.journalEntries ?? [])], ledgerAccounts: [...rows, ...data.ledgerAccounts] } };
}