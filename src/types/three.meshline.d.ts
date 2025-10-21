declare module 'three.meshline' {
  import * as THREE from 'three';
  export class MeshLine {
    geometry: THREE.BufferGeometry;
    setPoints(points: number[] | number[][]): void;
  }
  export class MeshLineMaterial extends THREE.Material {
    constructor(parameters?: Partial<THREE.MaterialParameters>);
  }
}
