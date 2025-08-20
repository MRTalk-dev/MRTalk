import { GLTF } from "three/examples/jsm/Addons.js";
import { loadVRM } from "./loadVRM";
import { VRM } from "@pixiv/three-vrm";
import { Group, Object3DEventMap } from "three";

interface IVRMLoader {
  load: (path: string) => Promise<{
    gltf: GLTF;
    vrm: VRM;
    helperRoot: Group<Object3DEventMap>;
  }>;
}

export class VRMLoader implements IVRMLoader {
  async load(path: string) {
    const data = await loadVRM(path);

    return {
      gltf: data.gltf,
      vrm: data.gltf.userData.vrm,
      helperRoot: data.helperRoot,
    };
  }
}
