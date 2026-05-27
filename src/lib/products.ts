import type { Product, Room } from '~/types/shared';
import productsData from '~/data/products.json';

export function getAllProducts(): Product[] {
  return (productsData as Product[]).filter((p) => p.active).sort((a, b) => a.order - b.order);
}

export function getProductById(id: string): Product | undefined {
  return (productsData as Product[]).find((p) => p.id === id);
}

export function getProductsByRoom(room: Room): Product[] {
  return getAllProducts().filter((p) => p.room === room);
}

export function getProductsByOverlay(overlay_id: string): Product[] {
  return getAllProducts().filter((p) => p.overlay_id === overlay_id);
}

export function getAllOverlayIds(): string[] {
  const ids = new Set<string>();
  for (const p of getAllProducts()) {
    if (p.overlay_id) ids.add(p.overlay_id);
  }
  return [...ids];
}
