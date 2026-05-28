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
