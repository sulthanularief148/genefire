/*
  GENERATED — do not edit.
  Source: public/models/px5.glb
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
    px5_body_0: THREE.Mesh
    px5_body_3: THREE.Mesh
    px5_body_4: THREE.Mesh
  }
  materials: {
    GF_RedPolymer: THREE.MeshStandardMaterial
    GF_BlackPolymer: THREE.MeshStandardMaterial
    GF_Chrome: THREE.MeshStandardMaterial
  }
}

export function PX5(props: ThreeElements['group']) {
  const { nodes, materials } = useGLTF('/models/px5.glb') as unknown as GLTFResult
  return (
    <group {...props} dispose={null}>
      <mesh geometry={nodes.px5_body_0.geometry} material={materials.GF_RedPolymer} />
      <mesh geometry={nodes.px5_body_3.geometry} material={materials.GF_BlackPolymer} />
      <mesh geometry={nodes.px5_body_4.geometry} material={materials.GF_Chrome} />
      <ProductDecals id="px5" />
    </group>
  )
}

useGLTF.preload('/models/px5.glb')

