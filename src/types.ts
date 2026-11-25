
export type Look = {
  id: string; name: string; season: string; category: string; model: string;
  description?: string; animation?: string; order: number; published: boolean;
  demo?: boolean; scale?: number; rotationY?: number; thumbnail?: string;
  sourceType?: 'archive' | 'original'; sourceNote?: string;
  color?: string; material?: string; silhouette?: string; origin?: string;
  credit?: { author: string; url: string; license: string; licenseUrl: string; changes?: string };
};
export const asset = (path: string) => new URL(path.replace(/^\//, ''), new URL(import.meta.env.BASE_URL, document.baseURI)).href;
export async function fetchLooks(): Promise<Look[]> {
  const response = await fetch(asset('data/looks.json'));
  if (!response.ok) throw new Error('작품 목록을 불러오지 못했습니다.');
  const data = await response.json();
  if (!data) throw new Error('작품 목록이 없습니다.');
  if (!Array.isArray(data.looks)) throw new Error('looks.json의 looks 배열을 확인해 주세요.');
  const seen = new Set<string>();
  for (const item of data.looks) {
    const look = item as Look;
    if (!look || typeof look.id !== 'string' || seen.has(look.id) || typeof look.name !== 'string' ||
      typeof look.model !== 'string' || !look.model.endsWith('.glb') || look.model.includes('..') ||
      /^([a-z]+:|\/)/i.test(look.model) || !Number.isFinite(look.order) ||
      (look.scale !== undefined && (!Number.isFinite(look.scale) || look.scale <= 0))) {
      throw new Error('작품 ID, GLB 경로, 순서 또는 크기 설정을 확인해 주세요.');
    }
    seen.add(look.id);
  }
  const looks = (data.looks as Look[]).filter(look => look.published).sort((a, b) => a.order - b.order);
  if (!looks.length) throw new Error('현재 공개된 작품이 없습니다.');
  return looks;
}
