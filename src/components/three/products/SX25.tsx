/*
  GENERATED — do not edit.
  Source: public/models/sx25.glb
  Regenerate: node scripts/gen-product-components.mjs

  Origin is base centre, +Y up, metres. No scale correction belongs in JSX.
*/

import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'
import type { ThreeElements } from '@react-three/fiber'
import { GLTF } from 'three-stdlib'

import { ProductDecals } from '../ProductDecals'

type GLTFResult = GLTF & {
  nodes: {
    sx25_body_0: THREE.Mesh
    sx25_body_1: THREE.Mesh
  }
  materials: {
    GF_RedAnodized: THREE.MeshStandardMaterial
    GF_BlackPolymer: THREE.MeshStandardMaterial
  }
}

export function SX25(props: ThreeElements['group']) {
  const { nodes, materials } = useGLTF('/models/sx25.glb') as unknown as GLTFResult
  return (
    <group {...props} dispose={null}>
      <mesh geometry={nodes.sx25_body_0.geometry} material={materials.GF_RedAnodized} />
      <mesh geometry={nodes.sx25_body_1.geometry} material={materials.GF_BlackPolymer} />
      <ProductDecals id="sx25" />
    </group>
  )
}

useGLTF.preload('/models/sx25.glb')

