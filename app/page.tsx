"use client";
import { loadMixamoAnimation } from "@/lib/fbx/loadMixamoAnimation";
import { VRMLoader } from "@/lib/vrm/VRMLoader";
import { VRM } from "@pixiv/three-vrm";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { XR, createXRStore } from "@react-three/xr";
import { useState, useRef } from "react";
import { AnimationMixer, Clock, LoopRepeat } from "three";
import { GLTF } from "three/examples/jsm/Addons.js";

const store = createXRStore();

export const firehoseUrl = "ws://192.168.1.16:8080";

function Scene() {
  const [gltf, setGltf] = useState<GLTF | null>(null);
  const { gl } = useThree();

  const vrmRef = useRef<VRM>(null);
  const mixerRef = useRef<AnimationMixer>(null);
  const clockRef = useRef(new Clock());

  const audioRef = useRef<HTMLAudioElement>(null);
  const audioCtxRef = useRef<AudioContext>(null);
  const analyserRef = useRef<AnalyserNode>(null);
  const timeDomainData = useRef(new Float32Array(2048));

  const playIdle = async () => {
    if (!vrmRef.current || !mixerRef.current) return;
    const idleAnim = await loadMixamoAnimation(
      "/models/Idle.fbx",
      vrmRef.current
    );
    if (!idleAnim) return;
    const idle = mixerRef.current.clipAction(idleAnim);
    idle.setLoop(LoopRepeat, Infinity);
    idle.play();
  };

  const playMotion = async (path: string) => {
    if (!vrmRef.current || !mixerRef.current) return;
    const anim = await loadMixamoAnimation(path, vrmRef.current);
    if (!anim) return;
    mixerRef.current.stopAllAction();
    const action = mixerRef.current.clipAction(anim);
    action.play();
    action.setLoop(LoopRepeat, 1);
    mixerRef.current.addEventListener("finished", (e) => {
      if (e.action === action) playIdle();
    });
  };

  gl.xr.addEventListener("sessionstart", async () => {
    const loader = new VRMLoader();
    const result = await loader.load("/models/AliciaSolid-1.0.vrm");
    setGltf(result.gltf);
    vrmRef.current = result.vrm;
    mixerRef.current = new AnimationMixer(result.gltf.scene);
    playIdle();

    const ws = new WebSocket(firehoseUrl);
    ws.onmessage = async (evt) => {
      const json = JSON.parse(evt.data);
      if ("name" in json && json.name === "gesture") {
        playMotion(json.params.url);
      }
      if ("message" in json) {
        ["happy", "sad", "angry", "neutral"].map((value) => {
          value === json.metadata.emotion
            ? vrmRef.current?.expressionManager?.setValue(value, 1)
            : vrmRef.current?.expressionManager?.setValue(value, 0);
        });

        const response = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: json.message }),
        });

        if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
        if (!analyserRef.current)
          analyserRef.current = audioCtxRef.current.createAnalyser();

        const mediaSource = new MediaSource();
        if (audioRef.current) {
          audioRef.current.pause();
        }
        audioRef.current = new Audio();
        audioRef.current.src = URL.createObjectURL(mediaSource);
        audioRef.current.play();

        mediaSource.addEventListener("sourceopen", async () => {
          const sourceBuffer = mediaSource.addSourceBuffer("audio/mpeg");
          if (!response.body) return null;
          const reader = response.body.getReader();

          const pump = async () => {
            const { done, value } = await reader.read();
            if (done) {
              mediaSource.endOfStream();
              return;
            }
            sourceBuffer.appendBuffer(value);
            await new Promise((resolve) => {
              sourceBuffer.addEventListener("updateend", resolve, {
                once: true,
              });
            });
            pump();
          };
          pump();
        });

        const sourceNode = audioCtxRef.current.createMediaElementSource(
          audioRef.current
        );
        sourceNode.connect(audioCtxRef.current.destination);
        sourceNode.connect(analyserRef.current);
      }
    };
  });

  useFrame(() => {
    const deltaTime = clockRef.current.getDelta();
    if (mixerRef.current) mixerRef.current.update(deltaTime);
    if (vrmRef.current) vrmRef.current.update(deltaTime);
    if (analyserRef.current && vrmRef.current?.expressionManager) {
      analyserRef.current.getFloatTimeDomainData(timeDomainData.current);
      let volume = 0;
      for (let i = 0; i < timeDomainData.current.length; i++) {
        volume = Math.max(volume, Math.abs(timeDomainData.current[i]));
      }
      volume = 1 / (1 + Math.exp(-45 * volume + 5));
      if (volume < 0.1) volume = 0;
      vrmRef.current.expressionManager.setValue("aa", volume);
    }
  });

  return (
    <>
      {gltf ? (
        <group>
          <primitive object={gltf.scene} scale={0.85} />
          <ambientLight intensity={2}></ambientLight>
        </group>
      ) : null}
    </>
  );
}

export default function App() {
  return (
    <>
      <button
        onClick={() => store.enterAR()}
        style={{
          position: "absolute",
          top: "20px",
          left: "20px",
          zIndex: 10,
          padding: "10px 20px",
          fontSize: "16px",
          borderRadius: "8px",
          backgroundColor: "#ff69b4",
          color: "#fff",
          border: "none",
          cursor: "pointer",
        }}
      >
        Enter XR
      </button>

      <Canvas>
        <XR store={store}>
          <Scene />
        </XR>
      </Canvas>
    </>
  );
}
