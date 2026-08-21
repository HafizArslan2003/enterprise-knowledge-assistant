with open('src/services/api.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()
clean_lines = lines[:268]

append_str = '''
export async function getUsageStats(token?: string) {
  return request<UsageSummary>('/api/v1/analytics/usage', { method: 'GET' }, token);
}

export async function viewDocument(documentId: number, token?: string) {
  const response = await fetch(`${API_BASE_URL}/api/v1/documents/${documentId}/view`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined
  });
  if (!response.ok) throw new Error("Failed to view document");
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  window.open(url, "_blank");
}
'''

with open('src/services/api.ts', 'w', encoding='utf-8') as f:
    f.writelines(clean_lines)
    f.write(append_str)
