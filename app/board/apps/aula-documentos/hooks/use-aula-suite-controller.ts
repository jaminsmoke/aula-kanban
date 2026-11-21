import type { useAulaDocumentSuite } from "./use-aula-document-suite";

type Suite = ReturnType<typeof useAulaDocumentSuite>;

type SuiteControllerDeps = {
  suite: Suite;
  dirty: boolean;
  saveCurrent: (automatic: boolean) => Promise<boolean>;
  setTitle: (title: string) => void;
  storeRecoveryCopy: (reason: "replace") => boolean;
};

/**
 * Envuelve las acciones de la suite con el guardado previo y el estado del editor.
 * @param deps - Suite, estado sucio y acciones de persistencia.
 * @returns Acciones listas para la vista.
 */
export function useAulaSuiteController({
  suite,
  dirty,
  saveCurrent,
  setTitle,
  storeRecoveryCopy,
}: SuiteControllerDeps) {
  async function saveBeforeSwitch(): Promise<boolean> {
    return !dirty || saveCurrent(false);
  }

  async function openSuiteDocument(id: string) {
    if (id === suite.documentId) return;
    if (!(await saveBeforeSwitch())) return;
    suite.selectDocument(id);
  }

  async function createSuiteDocument() {
    if (!(await saveBeforeSwitch())) return;
    await suite.createDocument();
  }

  async function duplicateSuiteDocument(id: string) {
    if (id === suite.documentId && !(await saveBeforeSwitch())) return;
    await suite.duplicateDocument(id);
  }

  async function renameSuiteDocument(id: string, title: string) {
    const renamed = await suite.renameDocument(id, title);
    if (renamed && id === suite.documentId) setTitle(renamed.title);
  }

  async function archiveSuiteDocument(id: string) {
    if (id === suite.documentId && !(await saveBeforeSwitch())) return;
    await suite.archiveDocument(id);
  }

  async function deleteSuiteDocument(id: string) {
    if (id === suite.documentId) {
      if (!(await saveBeforeSwitch())) return;
      if (!storeRecoveryCopy("replace")) return;
    }
    await suite.deleteDocument(id);
  }

  async function restoreSuiteDocument(id: string) {
    await suite.restoreDocument(id);
  }

  return {
    openSuiteDocument,
    createSuiteDocument,
    duplicateSuiteDocument,
    renameSuiteDocument,
    archiveSuiteDocument,
    deleteSuiteDocument,
    restoreSuiteDocument,
  };
}
