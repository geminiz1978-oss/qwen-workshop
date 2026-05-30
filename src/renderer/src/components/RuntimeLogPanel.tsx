import { Copy, ExternalLink, FileWarning, RefreshCw, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { RuntimeLogInfo } from '@shared/types';

interface RuntimeLogPanelProps {
  onLoad: () => Promise<RuntimeLogInfo>;
  onClear: () => Promise<RuntimeLogInfo>;
  onOpenExternal: () => Promise<void>;
}

export function RuntimeLogPanel({
  onLoad,
  onClear,
  onOpenExternal
}: RuntimeLogPanelProps): JSX.Element {
  const [logInfo, setLogInfo] = useState<RuntimeLogInfo | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh(): Promise<void> {
    setIsLoading(true);
    setError('');

    try {
      setLogInfo(await onLoad());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setIsLoading(false);
    }
  }

  async function clear(): Promise<void> {
    setIsLoading(true);
    setError('');

    try {
      setLogInfo(await onClear());
    } catch (clearError) {
      setError(clearError instanceof Error ? clearError.message : String(clearError));
    } finally {
      setIsLoading(false);
    }
  }

  async function openExternal(): Promise<void> {
    setError('');

    try {
      await onOpenExternal();
    } catch (openError) {
      setError(openError instanceof Error ? openError.message : String(openError));
    }
  }

  async function copyLog(): Promise<void> {
    if (!logInfo?.content) {
      return;
    }

    await copyText(logInfo.content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <section className="panel runtime-log-panel">
      <div className="runtime-log-header">
        <div>
          <span className="eyebrow">Runtime</span>
          <h2>Crash log</h2>
        </div>
        <div className="runtime-log-actions">
          <button className="icon-button" title="Refresh runtime log" disabled={isLoading} onClick={() => void refresh()}>
            <RefreshCw size={14} />
          </button>
          <button className="icon-button" title="Copy runtime log" disabled={!logInfo?.content} onClick={() => void copyLog()}>
            <Copy size={14} />
          </button>
          <button className="icon-button" title="Open runtime log externally" onClick={() => void openExternal()}>
            <ExternalLink size={14} />
          </button>
          <button className="icon-button danger" title="Clear runtime log" disabled={isLoading} onClick={() => void clear()}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="runtime-log-meta">
        <FileWarning size={14} />
        <span>{logInfo?.path || 'Runtime log path unavailable'}</span>
      </div>

      <div className="runtime-log-body">
        {error ? (
          <p className="empty-copy error-copy">{error}</p>
        ) : logInfo?.content ? (
          <pre>{logInfo.content}</pre>
        ) : (
          <p className="empty-copy">{isLoading ? 'Loading runtime log...' : 'No runtime issues logged yet.'}</p>
        )}
      </div>

      {copied ? <div className="runtime-log-notice">Copied log text</div> : null}
    </section>
  );
}

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}
