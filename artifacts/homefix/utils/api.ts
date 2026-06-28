import { BASE_URL } from '../constants';

export async function apiGet(params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE_URL}?${qs}`);
  return res.json();
}

export async function apiPost(body: Record<string, unknown>) {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

export function formatRupiah(value: string | number): string {
  const num = typeof value === 'string' ? parseInt(value.replace(/\D/g, ''), 10) : value;
  if (isNaN(num)) return 'Rp 0';
  return 'Rp ' + num.toLocaleString('id-ID');
}

export function parseRupiah(value: string): number {
  return parseInt(value.replace(/\D/g, ''), 10) || 0;
}
