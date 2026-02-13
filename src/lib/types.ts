export type BiomeType =
  | "grassland"
  | "plains"
  | "tundra"
  | "desert"
  | "tropical"
  | "marine";
export type FeatureType = "mountain" | "resource" | "naturalWonder" | "river";
export type BuildingType =
  | "culture"
  | "food"
  | "gold"
  | "happiness"
  | "production"
  | "science"
  | "wonder"
  | "warehouse"
  | "palace";

export interface Building {
  type: BuildingType;
}
