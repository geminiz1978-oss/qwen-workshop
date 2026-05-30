import { FileText, FolderOpen, GitBranch, History, RefreshCw, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { FileTreeNode, GitFileStatus, WorkspaceInfo, WorkspaceSearchResult } from '@shared/types';

interface WorkspaceExplorerProps {
  workspace: WorkspaceInfo | null;
  recentWorkspaces: WorkspaceInfo[];
  fileTree: FileTreeNode[];
  gitStatus: GitFileStatus[];
  selectedFilePath?: string;
  searchResults: WorkspaceSearchResult[];
  isSearching: boolean;
  onOpenWorkspace: () => void;
  onOpenRecentWorkspace: (workspace: WorkspaceInfo) => void;
  onOpenFile: (filePath: string) => void;
  onSearch: (query: string) => void;
  onReviewChanges: () => void;
  onRefresh: () => void;
}

export function WorkspaceExplorer({
  workspace,
  recentWorkspaces,
  fileTree,
  gitStatus,
  selectedFilePath,
  searchResults,
  isSearching,
  onOpenWorkspace,
  onOpenRecentWorkspace,
  onOpenFile,
  onSearch,
  onReviewChanges,
  onRefresh
}: WorkspaceExplorerProps): JSX.Element {
  const [searchQuery, setSearchQuery] = useState('');
  const visibleTree = useMemo(() => filterTree(fileTree, searchQuery), [fileTree, searchQuery]);
  const fileCount = useMemo(() => countFiles(fileTree), [fileTree]);
  const trimmedQuery = searchQuery.trim();

  useEffect(() => {
    const timer = window.setTimeout(() => onSearch(trimmedQuery), 180);
    return () => window.clearTimeout(timer);
  }, [trimmedQuery]);

  return (
    <aside className="panel workspace-panel">
      <div className="panel-header">
        <div>
          <span className="eyebrow">Workspace</span>
          <h2>{workspace?.name ?? 'No folder open'}</h2>
        </div>
        <button className="icon-button" title="Refresh workspace" onClick={onRefresh} disabled={!workspace}>
          <RefreshCw size={16} />
        </button>
      </div>

      <button className="primary-action" onClick={onOpenWorkspace}>
        <FolderOpen size={17} />
        Open folder
      </button>

      {recentWorkspaces.length ? (
        <section className="recent-workspaces">
          <div className="subsection-title compact">
            <span>
              <History size={14} />
              Recent
            </span>
            <span>{recentWorkspaces.length}</span>
          </div>
          <div className="recent-workspace-list">
            {recentWorkspaces.slice(0, 5).map((item) => (
              <button
                className={`recent-workspace-row ${workspace?.path === item.path ? 'active' : ''}`}
                key={item.path}
                onClick={() => onOpenRecentWorkspace(item)}
                title={item.path}
              >
                <span>{item.name}</span>
                <small>{item.path}</small>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <div className="search-box">
        <Search size={15} />
        <input
          placeholder="Search files and content"
          disabled={!workspace}
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
        />
      </div>

      {trimmedQuery ? (
        <section className="search-results">
          <div className="subsection-title compact">
            <span>Search</span>
            <span>{isSearching ? '...' : searchResults.length}</span>
          </div>
          <div className="search-result-list">
            {searchResults.length ? (
              searchResults.map((result) => (
                <button className="search-result-row" key={`${result.path}-${result.lineNumber ?? 0}`} onClick={() => onOpenFile(result.path)}>
                  <FileText size={13} />
                  <span>{result.relativePath}</span>
                  <small>
                    {result.matchKind === 'content' && result.lineNumber ? `Line ${result.lineNumber}: ${result.preview}` : 'Filename match'}
                  </small>
                </button>
              ))
            ) : (
              <p className="empty-copy">{isSearching ? 'Searching workspace...' : 'No matching files found.'}</p>
            )}
          </div>
        </section>
      ) : null}

      <section className="subsection">
        <div className="subsection-title">
          <span>Files</span>
          <span>{fileCount}</span>
        </div>
        <div className="file-tree">
          {visibleTree.length ? (
            visibleTree.map((node) => (
              <TreeNode
                node={node}
                key={node.path}
                selectedFilePath={selectedFilePath}
                onOpenFile={onOpenFile}
              />
            ))
          ) : (
            <p className="empty-copy">{workspace ? 'No files match the current search.' : 'Open a project folder to give Qwen a place to work.'}</p>
          )}
        </div>
      </section>

      <section className="subsection changed-files">
        <div className="subsection-title">
          <span>
            <GitBranch size={14} />
            Changes
          </span>
          <span>{gitStatus.length}</span>
        </div>
        {gitStatus.length ? (
          <button className="secondary-action review-changes-action" onClick={onReviewChanges}>
            Review changes
          </button>
        ) : null}
        {gitStatus.length ? (
          <div className="change-list">
            {gitStatus.map((item) => (
              <div className="change-row" key={`${item.code}-${item.path}`}>
                <span>{item.code}</span>
                <p>{item.path}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-copy">No git changes detected.</p>
        )}
      </section>
    </aside>
  );
}

function TreeNode({
  node,
  selectedFilePath,
  onOpenFile
}: {
  node: FileTreeNode;
  selectedFilePath?: string;
  onOpenFile: (filePath: string) => void;
}): JSX.Element {
  const isSelected = selectedFilePath === node.path;

  return (
    <div className="tree-node">
      <button
        className={`tree-node-label ${node.kind} ${isSelected ? 'selected' : ''}`}
        onClick={() => node.kind === 'file' && onOpenFile(node.path)}
        title={node.path}
        type="button"
      >
        <span>{node.kind === 'directory' ? '>' : '-'}</span>
        <p>{node.name}</p>
      </button>
      {node.children?.length ? (
        <div className="tree-children">
          {node.children.map((child) => (
            <TreeNode node={child} key={child.path} selectedFilePath={selectedFilePath} onOpenFile={onOpenFile} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function filterTree(nodes: FileTreeNode[], query: string): FileTreeNode[] {
  const trimmed = query.trim().toLowerCase();

  if (!trimmed) {
    return nodes;
  }

  return nodes
    .map((node) => {
      const children = node.children ? filterTree(node.children, trimmed) : [];
      const matches = node.name.toLowerCase().includes(trimmed);

      if (!matches && !children.length) {
        return undefined;
      }

      return {
        ...node,
        ...(children.length ? { children } : {})
      };
    })
    .filter((node): node is FileTreeNode => Boolean(node));
}

function countFiles(nodes: FileTreeNode[]): number {
  return nodes.reduce((total, node) => total + (node.kind === 'file' ? 1 : countFiles(node.children ?? [])), 0);
}
