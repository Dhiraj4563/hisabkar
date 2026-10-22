import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import {
  createFullBackup,
  exportEncryptedBackup,
  restoreFromBackup,
  restoreFromEncryptedBackup,
  parseCSVTransactions,
  exportTransactionsToCSV,
  FullBackupPayload,
} from '../services/backupService';
import { db } from '../db/database';
import { postTransaction } from '../features/accounting/ledgerEngine';
import { Transaction } from '../types';
import {
  Download,
  Upload,
  Lock,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  FileJson,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface ImportExportPageProps {
  transactions: Transaction[];
  onDataRestored?: () => void;
}

export const ImportExportPage: React.FC<ImportExportPageProps> = ({
  transactions,
  onDataRestored,
}) => {
  const [encryptPassword, setEncryptPassword] = useState('');
  const [decryptPassword, setDecryptPassword] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Restore Modal State
  const [restorePayload, setRestorePayload] = useState<FullBackupPayload | null>(null);
  const [isEncryptedFile, setIsEncryptedFile] = useState(false);
  const [encryptedFileContent, setEncryptedFileContent] = useState('');
  const [isConfirmRestoreOpen, setIsConfirmRestoreOpen] = useState(false);

  // CSV Import State
  const [csvPreviewRows, setCsvPreviewRows] = useState<Partial<Transaction>[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isImportingCsv, setIsImportingCsv] = useState(false);

  // 1. Export Clean JSON Backup
  const handleExportJSON = async () => {
    try {
      setIsExporting(true);
      const backup = await createFullBackup();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      downloadBlob(blob, `HisabMate_Backup_${new Date().toISOString().substring(0, 10)}.json`);
      setStatusMessage({ type: 'success', text: 'Clean JSON backup exported successfully.' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Export failed.' });
    } finally {
      setIsExporting(false);
    }
  };

  // 2. Export Encrypted AES-GCM Backup
  const handleExportEncrypted = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!encryptPassword || encryptPassword.length < 6) {
      alert('Password must be at least 6 characters long.');
      return;
    }

    try {
      setIsExporting(true);
      const blob = await exportEncryptedBackup(encryptPassword);
      downloadBlob(blob, `HisabMate_Encrypted_${new Date().toISOString().substring(0, 10)}.hisabmate`);
      setStatusMessage({ type: 'success', text: 'Encrypted backup generated and downloaded!' });
      setEncryptPassword('');
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Encryption failed.' });
    } finally {
      setIsExporting(false);
    }
  };

  // Helper download trigger
  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 3. Handle File Selection for Restore
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      try {
        const parsed = JSON.parse(content);
        if (parsed.format === 'hisabmate-encrypted-backup-v1') {
          setIsEncryptedFile(true);
          setEncryptedFileContent(content);
          setIsConfirmRestoreOpen(true);
        } else if (parsed.appName === 'HisabMate') {
          setIsEncryptedFile(false);
          setRestorePayload(parsed);
          setIsConfirmRestoreOpen(true);
        } else {
          alert('Unrecognized backup format. Please select a valid HisabMate backup file.');
        }
      } catch {
        alert('Failed to parse backup file. Invalid JSON structure.');
      }
    };
    reader.readAsText(file);
  };

  // Confirm Restore
  const handleConfirmRestore = async () => {
    try {
      setIsRestoring(true);
      if (isEncryptedFile) {
        if (!decryptPassword) {
          alert('Please enter your decryption password.');
          setIsRestoring(false);
          return;
        }
        await restoreFromEncryptedBackup(encryptedFileContent, decryptPassword);
      } else if (restorePayload) {
        await restoreFromBackup(restorePayload);
      }

      setIsConfirmRestoreOpen(false);
      setStatusMessage({ type: 'success', text: 'Database restored successfully! All ledgers reloaded.' });
      try {
        confetti({ particleCount: 50, spread: 80, origin: { y: 0.6 } });
      } catch {}
      onDataRestored?.();
    } catch (err: any) {
      alert(err.message || 'Restore failed');
    } finally {
      setIsRestoring(false);
    }
  };

  // 4. Handle CSV Import
  const handleCSVSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const { success, rows, errors } = parseCSVTransactions(text);
      if (success && rows.length > 0) {
        setCsvPreviewRows(rows);
        setCsvErrors(errors);
        setIsCsvModalOpen(true);
      } else {
        alert(errors.join('\n') || 'Could not parse CSV transactions.');
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmCSVImport = async () => {
    try {
      setIsImportingCsv(true);
      const accounts = await db.accounts.toArray();
      const defaultAccount = accounts[0];
      if (!defaultAccount) throw new Error('No default account found.');

      let importedCount = 0;
      for (const row of csvPreviewRows) {
        if (!row.amount || row.amount <= 0) continue;

        await postTransaction({
          type: row.type || 'personal_expense',
          amount: row.amount,
          currency: row.currency || defaultAccount.currency,
          accountId: defaultAccount.id,
          description: row.description || 'Imported Transaction',
          date: row.date || new Date().toISOString(),
          notes: 'Imported via CSV',
        });
        importedCount++;
      }

      setIsCsvModalOpen(false);
      setStatusMessage({
        type: 'success',
        text: `Successfully imported ${importedCount} transactions into the double-entry ledger!`,
      });
      onDataRestored?.();
    } catch (err: any) {
      alert(err.message || 'Import failed.');
    } finally {
      setIsImportingCsv(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-12">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-zinc-100">Backup, Restore & Data Migration</h2>
        <p className="text-xs text-zinc-400">
          Device-local data management with authenticated Web Crypto AES-GCM encryption
        </p>
      </div>

      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Storage Privacy Note */}
      <Card className="p-4 bg-zinc-950 border-zinc-800 space-y-2">
        <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
          <ShieldCheck className="w-4 h-4" />
          <span>Device-Local Offline Security Guarantee</span>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed">
          HisabMate operates completely offline using browser IndexedDB. No financial records, balances, or contacts are ever transmitted to any external server.
          Because browser storage can be cleared if you clear website cache or uninstall the PWA, please make regular encrypted backups.
        </p>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. Encrypted AES-GCM Backup */}
        <Card className="p-5 space-y-4 border-indigo-500/20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">Encrypted Backup (AES-GCM)</h3>
              <p className="text-xs text-zinc-400">Protected by 100,000 PBKDF2 iterations</p>
            </div>
          </div>

          <form onSubmit={handleExportEncrypted} className="space-y-3">
            <Input
              type="password"
              label="Backup Password *"
              placeholder="Enter strong password (min 6 chars)"
              value={encryptPassword}
              onChange={e => setEncryptPassword(e.target.value)}
              helperText="You will need this exact password to restore your records."
              required
            />
            <Button
              type="submit"
              variant="primary"
              className="w-full"
              isLoading={isExporting}
              icon={<Download className="w-4 h-4" />}
            >
              Export Encrypted Backup
            </Button>
          </form>
        </Card>

        {/* 2. Restore Backup */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">Restore from File</h3>
              <p className="text-xs text-zinc-400">Restore JSON or Encrypted (.hisabmate) backup</p>
            </div>
          </div>

          <p className="text-xs text-zinc-400">
            Select a backup file to restore your transactions, accounts, people, and groups.
          </p>

          <label className="flex items-center justify-center gap-2 p-4 border border-dashed border-zinc-700 rounded-xl bg-zinc-950/60 hover:bg-zinc-800/40 cursor-pointer text-xs text-zinc-300 font-medium transition-colors">
            <Upload className="w-4 h-4 text-emerald-400" />
            <span>Select Backup File (.json / .hisabmate)</span>
            <input type="file" accept=".json,.hisabmate" onChange={handleFileSelect} className="hidden" />
          </label>
        </Card>

        {/* 3. CSV Import & Export */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">CSV Spreadsheet Migration</h3>
              <p className="text-xs text-zinc-400">Import bank CSV statements or export transaction logs</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <label className="flex items-center justify-center gap-2 p-3 border border-zinc-800 rounded-xl bg-zinc-950 hover:bg-zinc-800/60 cursor-pointer text-xs text-zinc-300 font-medium transition-colors">
              <Upload className="w-3.5 h-3.5" />
              <span>Import CSV</span>
              <input type="file" accept=".csv" onChange={handleCSVSelect} className="hidden" />
            </label>

            <Button
              variant="outline"
              size="md"
              onClick={() => {
                const csv = exportTransactionsToCSV(transactions);
                downloadBlob(new Blob([csv], { type: 'text/csv' }), 'HisabMate_Transactions.csv');
              }}
              icon={<Download className="w-3.5 h-3.5" />}
            >
              Export CSV
            </Button>
          </div>
        </Card>

        {/* 4. Plain JSON Export */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <FileJson className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">Plain JSON Full Backup</h3>
              <p className="text-xs text-zinc-400">Unencrypted export for developer inspection</p>
            </div>
          </div>

          <p className="text-xs text-zinc-400">
            Downloads your full raw SQLite/IndexedDB tables in human-readable JSON format.
          </p>

          <Button
            variant="outline"
            className="w-full"
            isLoading={isExporting}
            onClick={handleExportJSON}
            icon={<Download className="w-4 h-4" />}
          >
            Download Plain JSON Backup
          </Button>
        </Card>
      </div>

      {/* Confirm Restore Modal */}
      <Modal
        isOpen={isConfirmRestoreOpen}
        onClose={() => setIsConfirmRestoreOpen(false)}
        title="Confirm Database Restore"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs text-zinc-300">
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-amber-300">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              Restoring will replace current local database records with the contents of the backup file. This cannot be undone.
            </p>
          </div>

          {isEncryptedFile && (
            <Input
              type="password"
              label="Enter Decryption Password *"
              placeholder="Password used during export"
              value={decryptPassword}
              onChange={e => setDecryptPassword(e.target.value)}
              required
            />
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
            <Button variant="ghost" onClick={() => setIsConfirmRestoreOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" isLoading={isRestoring} onClick={handleConfirmRestore}>
              Confirm & Restore Data
            </Button>
          </div>
        </div>
      </Modal>

      {/* CSV Preview Modal */}
      <Modal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        title="Preview CSV Transactions to Import"
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs text-zinc-300">
          <p className="text-zinc-400">
            Detected {csvPreviewRows.length} valid rows from CSV file.
          </p>

          <div className="max-h-60 overflow-y-auto border border-zinc-800 rounded-xl divide-y divide-zinc-800">
            {csvPreviewRows.slice(0, 10).map((r, idx) => (
              <div key={idx} className="p-2.5 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-zinc-200">{r.description}</p>
                  <p className="text-[10px] text-zinc-500">{r.date?.substring(0, 10)} · {r.type}</p>
                </div>
                <span className="font-mono text-zinc-200">
                  {((r.amount || 0) / 100).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          {csvPreviewRows.length > 10 && (
            <p className="text-zinc-500 text-[11px] text-center">
              + {csvPreviewRows.length - 10} more transactions
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
            <Button variant="ghost" onClick={() => setIsCsvModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" isLoading={isImportingCsv} onClick={handleConfirmCSVImport}>
              Import {csvPreviewRows.length} Transactions
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
