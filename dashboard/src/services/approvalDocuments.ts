import type { ApprovalDocument } from "../data/mockData";

const databaseName = "intentrun-approval-documents";
const databaseVersion = 1;
const objectStoreName = "documents";
export const maximumApprovalDocumentSize = 2 * 1024 * 1024;

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("Document storage is unavailable in this browser."));
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, databaseVersion);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(objectStoreName)) request.result.createObjectStore(objectStoreName, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open document storage."));
  });
}

export function getApprovalDocumentType(file: File): ApprovalDocument["type"] | null {
  const extension = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
  if (file.type === "application/pdf" && extension === ".pdf") return "application/pdf";
  if (file.type === "image/jpeg" && (extension === ".jpg" || extension === ".jpeg")) return "image/jpeg";
  if (!file.type && extension === ".pdf") return "application/pdf";
  if (!file.type && (extension === ".jpg" || extension === ".jpeg")) return "image/jpeg";
  return null;
}

export async function storeApprovalDocument(file: File): Promise<ApprovalDocument> {
  const type = getApprovalDocumentType(file);
  if (!type) throw new Error("Choose a JPEG or PDF document.");
  if (file.size === 0) throw new Error("The selected document is empty.");
  if (file.size > maximumApprovalDocumentSize) throw new Error("The document must be 2 MB or smaller.");
  const document: ApprovalDocument = {
    id: globalThis.crypto?.randomUUID?.() ?? `approval-document-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: file.name,
    type,
    size: file.size,
  };
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(objectStoreName, "readwrite");
    transaction.objectStore(objectStoreName).put({ id: document.id, blob: file.slice(0, file.size, type) });
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not save the selected document."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Could not save the selected document."));
  }).finally(() => database.close());
  return document;
}

export async function loadApprovalDocument(id: string): Promise<Blob | undefined> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(objectStoreName, "readonly");
    const request = transaction.objectStore(objectStoreName).get(id);
    request.onsuccess = () => resolve(request.result?.blob as Blob | undefined);
    request.onerror = () => reject(request.error ?? new Error("Could not load the requested document."));
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => {
      database.close();
      reject(transaction.error ?? new Error("Could not load the requested document."));
    };
  });
}

export async function removeApprovalDocument(id: string): Promise<void> {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(objectStoreName, "readwrite");
    transaction.objectStore(objectStoreName).delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not remove the unused document."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Could not remove the unused document."));
  }).finally(() => database.close());
}